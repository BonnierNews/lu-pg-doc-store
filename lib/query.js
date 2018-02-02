"use strict";

const uuid = require("uuid");
const pgClient = require("./client");
const async = require("async");

const tables = {
  entity: "entity",
  entityVersion: "entity_version"
};

function load(id, force, cb) {
  if (typeof force === "function") {
    cb = force;
    force = false;
  }

  const q = [
    "SELECT doc",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id AND e.entity_id = $1"
  ];

  if (!force) {
    q.push("AND e.entity_removed IS NULL");
  }

  pgClient.query(q.join(" "), [id], (err, res) => {
    if (err) return cb(err);
    const entity = (res.rows && res.rows.length > 0) ? res.rows[0] : null;
    const doc = (entity !== null) ? entity.doc : null;
    return cb(null, doc);
  });
}

function queryByRelationship(options, cb) {
  const q = [
    "SELECT doc",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id",
    "AND e.entity_type = $1",
    "AND ev.doc -> 'relationships' @> $2",
    "AND e.entity_removed IS NULL"
  ];

  if (!options.entityType || !options.relationType || !options.id) {
    return cb(new Error(`Missing parameters in queryByRelationship: ${JSON.stringify(options)}`));
  }

  pgClient.query(q.join(" "), [options.entityType, `[{"type": "${options.relationType}", "id": "${options.id}"}]`], (err, res) => {
    if (err) return cb(err);
    let docs = [];
    if (res.rows && res.rows.length > 0) {
      docs = res.rows.map((entity) => entity.doc);
    } else if (options.errorOnNotFound === true) {
      return cb(new Error(`DOC_NOT_FOUND: No document found using options: ${JSON.stringify(options)}`));
    }
    return cb(null, docs);
  });
}

function queryBySingleRelationship(options, cb) {
  const q = [
    "SELECT doc",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id",
    "AND e.entity_type = $1",
    "AND ev.doc -> 'relationships' @> $2",
    "AND e.entity_removed IS NULL"
  ];

  if (!options.entityType || !options.relationType || !options.id) {
    return cb(new Error(`Missing parameters in queryBySingleRelationship: ${JSON.stringify(options)}`));
  }

  pgClient.query(q.join(" "), [options.entityType, `[{"type": "${options.relationType}", "id": "${options.id}"}]`], (err, res) => {
    if (err) return cb(err);
    let doc = null;
    if (res.rows && res.rows.length === 1) {
      doc = res.rows[0].doc;
    } else if (res.rows && res.rows.length > 1) {
      return cb(new Error("Found more than one document"));
    } else if (options.errorOnNotFound === true) {
      return cb(new Error(`DOC_NOT_FOUND: No document found using options: ${JSON.stringify(options)}`));
    }
    return cb(null, doc);
  });
}

function loadByExternalId(options, cb) {
  const q = [
    "SELECT doc",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id",
    "AND e.entity_type = $1",
    "AND ev.doc -> 'externalIds' @> $2",
    "AND e.entity_removed IS NULL"
  ];

  if (!options.entityType || !options.systemName || !options.externalIdType || !options.id) {
    return cb(new Error(`Missing parameters in loadByExternalId: ${JSON.stringify(options)}`));
  }

  pgClient.query(q.join(" "), [options.entityType, `{"${options.systemName}": {"${options.externalIdType}": "${options.id}"}}`], (err, res) => {
    if (err) return cb(err);
    let doc = null;
    if (res.rows && res.rows.length === 1) {
      doc = res.rows[0].doc;
    } else if (res.rows && res.rows.length > 1) {
      return cb(new Error("Found more than one document"));
    } else if (options.errorOnNotFound === true) {
      return cb(new Error(`DOC_NOT_FOUND: No document found using options: ${JSON.stringify(options)}`));
    }
    return cb(null, doc);
  });
}

function remove(id, cb) {
  const q = ["UPDATE entity",
    "SET entity_removed = now()",
    "WHERE entity_id = $1 AND entity_removed IS NULL"];
  pgClient.query(q.join(" "), [id], (err, res) => {
    if (err) return cb(err);
    if (res.rowCount === 0) return cb(null, {removed: null});
    return cb(null, {removed: id});
  });
}

function loadVersion(versionId, force, cb) {

  if (typeof force === "function") {
    cb = force;
    force = false;
  }

  const q = [
    "SELECT ev.entity_id, created, doc, version_id, correlation_id",
    "FROM entity e, entity_version ev",
    "WHERE version_id = $1"
  ];

  if (!force) {
    q.push("AND e.entity_id = ev.entity_id AND e.entity_removed IS NULL");
  }

  pgClient.query(q.join(" "), [versionId], (err, res) => {
    if (err) return cb(err);

    const v = (res.rows && res.rows.length > 0) ? res.rows[0] : null;
    if (!v) return cb(null, null);

    const output = {
      created: v.created,
      versionId: v.version_id,
      correlationId: v.correlation_id,
      entity: v.doc
    };

    return cb(null, output);
  });
}

function listVersions(entityId, force, cb) {
  if (typeof force === "function") {
    cb = force;
    force = false;
  }

  const q = [
    "SELECT ev.version_id, ev.created, ev.correlation_id,",
    "e.latest_version_id",
    "FROM entity_version as ev",
    "LEFT OUTER JOIN entity as e ON ev.version_id = e.latest_version_id",
    "WHERE ev.entity_id = $1"
  ];

  if (!force) {
    q.push("AND NOT EXISTS (SELECT FROM entity WHERE entity_id = $1 AND entity_removed IS NOT NULL)");
  }
  q.push("ORDER BY ev.created ASC");

  pgClient.query(q.join(" "), [entityId], (err, result) => {

    if (err) return cb(err);

    const output = result.rows.map(
      (row) => ({
        versionId: row.version_id,
        created: row.created,
        correlationId: row.correlation_id,
        status: row.latest_version_id ? "current" : "previously_published"
      }));
    return cb(null, output);
  });
}

function upsert(entity, done) {
  entity.id = entity.id || uuid.v4();
  let newVersionId;
  async.waterfall([
    (cb) => insertVersion(entity, cb),
    (versionId, created, cb) => {
      if (versionId) {
        newVersionId = versionId;
        return doUpsert(entity, versionId, created, cb);
      }
      return cb(null, {
        wasConflict: true,
        oid: 0
      });
    }
  ], (err, upsertRes) => {
    if (err) return done(err);
    return done(null, {
      entityId: entity.id,
      wasInsert: upsertRes.oid > 0,
      wasConflict: upsertRes.wasConflict,
      versionId: newVersionId
    });
  });
}

function doUpsert(entity, versionId, created, done) {
  pgClient.query([
    "INSERT into entity as e",
    "(entity_type, entity_id, entity_created, latest_version_id)",
    "VALUES ($1::text, $2::text, $3::timestamp, $4::text)",
    "ON CONFLICT(entity_id) DO UPDATE",
    "SET latest_version_id=$4",
    "WHERE e.entity_id=$2"
  ].join(" "), [entity.type, entity.id, created, versionId],
    done
  );
}

function insertVersion(entity, done) {
  const versionId = uuid.v4();
  const correlationId = (entity.meta && entity.meta.correlationId) || null;

  pgClient.query([
    "INSERT into entity_version",
    "(version_id, entity_id, correlation_id, doc)",
    "SELECT $1::text, $2::text, $3::text, $4::jsonb",
    "WHERE NOT EXISTS (SELECT FROM entity WHERE entity_id = $2 AND entity_removed IS NOT NULL)",
    "RETURNING created"
  ].join(" "), [versionId, entity.id, correlationId, entity],
    (err, res) => {
      const responseHasTimestamp = (!err && res && res.rows && res.rows.length === 1);
      const timestamp = responseHasTimestamp ? res.rows[0].created : undefined;

      done(err, (res && res.rowCount > 0) ? versionId : null, timestamp);
    }
  );
}

module.exports = {
  load,
  queryByRelationship,
  queryBySingleRelationship,
  loadByExternalId,
  loadVersion,
  listVersions,
  remove,
  upsert,
  tables
};
