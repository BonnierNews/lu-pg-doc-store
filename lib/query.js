"use strict";

const uuid = require("uuid");
const pgClient = require("./client");
const pgReaderClient = require("./reader-client");

const tables = {
  entity: "entity",
  entityVersion: "entity_version",
  keyValue: "key_value"
};

function load(id, force, cb) {
  if (typeof force === "function") {
    cb = force;
    force = false;
  }

  const q = [
    "SELECT doc, created, entity_created, correlation_id",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id AND e.entity_id = $1"
  ];

  if (!force) {
    q.push("AND e.entity_removed IS NULL");
  }

  pgReaderClient.query(q.join(" "), [id], (err, res) => {
    if (err) return cb(err);
    const entity = (res.rows && res.rows.length > 0) ? res.rows[0] : null;
    const doc = getDocWithMeta(entity);
    return cb(null, doc);
  });
}

function queryByRelationship(options, cb) {
  const {
    id,
    system,
    relationType,
    entityType,
    errorOnNotFound
  } = options;
  const relationships = {
    id,
    type: relationType
  };

  if (system) relationships.system = system;

  return queryByRelationships({
    relationships,
    entityType,
    errorOnNotFound
  }, cb);
}

function queryByRelationships(options, cb) {
  const q = [
    "SELECT doc, entity_created, created, correlation_id",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id",
    "AND e.entity_id = ev.entity_id",
    "AND e.entity_type = $1",
    "AND ev.doc -> 'relationships' @> $2",
    "AND e.entity_removed IS NULL"
  ].join(" ");

  let relationships;
  if (!Array.isArray(options.relationships)) {
    relationships = [options.relationships];
  } else {
    relationships = options.relationships;
  }

  pgReaderClient.query(q, [options.entityType, JSON.stringify(relationships)], (err, res) => {
    if (err) return cb(err);
    let docs = [];
    if (res.rows && res.rows.length > 0) {
      docs = res.rows.map(getDocWithMeta);
    } else if (options.errorOnNotFound === true) {
      return cb(new Error(`DOC_NOT_FOUND: No document found using options: ${JSON.stringify(options)}`));
    }
    return cb(null, docs);
  });
}

function findOneByRelationships(options, cb) {
  queryByRelationships(options, (err, docs) => {
    if (err) return cb(err);
    if (docs && docs.length > 1) {
      return cb(new Error(`Found more than one document using options: ${JSON.stringify(options)}`));
    }
    return cb(null, docs[0] || null);
  });
}

function getDocWithMeta(entity) {
  const doc = (entity !== null) ? entity.doc : null;
  if (doc) {
    if (!doc.meta) doc.meta = {};
    if (entity.correlation_id && !doc.meta.correlationId) doc.meta.correlationId = entity.correlation_id;
    // override persisted value since previous versions used the faulty user supplied date
    if (entity.entity_created) doc.meta.createdAt = entity.entity_created.toISOString();
    // override persisted value since previous versions used the faulty user supplied date
    if (entity.created) doc.meta.updatedAt = entity.created.toISOString();
  }
  return doc;
}

function queryBySingleRelationship(options, cb) {
  queryByRelationship(options, (err, docs) => {
    if (err) return cb(err);
    if (docs && docs.length > 1) {
      return cb(new Error(`Found more than one document using options: ${JSON.stringify(options)}`));
    }
    return cb(null, docs[0] || null);
  });
}

function loadByExternalId(options, cb) {
  const q = [
    "SELECT doc, created, entity_created, correlation_id",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id",
    "AND e.entity_id = ev.entity_id",
    "AND e.entity_type = $1",
    "AND ev.doc -> 'externalIds' @> $2",
    "AND e.entity_removed IS NULL"
  ];

  if (!options.entityType || !options.systemName || !options.externalIdType || !options.id) {
    return cb(new Error(`Missing parameters in loadByExternalId: ${JSON.stringify(options)}`));
  }

  if (typeof options.id === "string") {
    options.id = `"${options.id}"`;
  }

  pgReaderClient.query(q.join(" "), [options.entityType, `{"${options.systemName}": {"${options.externalIdType}": ${options.id}}}`], (err, res) => {
    if (err) return cb(err);
    let doc = null;
    if (res.rows && res.rows.length === 1) {
      doc = getDocWithMeta(res.rows[0]);
    } else if (res.rows && res.rows.length > 1) {
      return cb(new Error(`Found more than one document using options: ${JSON.stringify(options)}`));
    } else if (options.errorOnNotFound === true) {
      return cb(new Error(`DOC_NOT_FOUND: No document found using options: ${JSON.stringify(options)}`));
    }
    return cb(null, doc);
  });
}

function remove(id, correlationId, cb) {
  if (typeof correlationId === "function") {
    cb = correlationId;
    correlationId = null;
  }

  load(id, (err, doc) => {
    if (err) return cb(err);
    if (!doc) return cb(new Error("No such entity"));

    const emptyDoc = {
      id: id,
      type: doc.type,
      meta: {correlationId: correlationId}
    };

    return upsert(emptyDoc, (upsertErr) => {
      if (upsertErr) return cb(upsertErr);
      const q = [
        "UPDATE entity",
        "SET entity_removed = now() at time zone 'utc'",
        "WHERE entity_id = $1"];
      return pgClient.query(q.join(" "), [id], (rmErr, res) => {
        if (rmErr) return cb(rmErr);
        if (res.rowCount === 0) return cb(new Error("Could not remove"));
        return cb(null);
      });
    });
  });
}

function restoreVersion(versionId, correlationId, cb) {
  if (typeof correlationId === "function") {
    cb = correlationId;
    correlationId = null;
  }

  loadVersion(versionId, true, (err, res) => {
    if (err) return cb(err);

    const entity = res.entity;
    entity.meta.correlationId = correlationId;

    return maybeUnRemove(entity.id, (unremoveErr) => {
      if (unremoveErr) return cb(unremoveErr);
      return upsert(entity, cb);
    });
  });
}

function maybeUnRemove(id, cb) {
  const q = [
    "UPDATE entity",
    "SET entity_removed = null",
    "WHERE entity_id = $1"];
  pgClient.query(q.join(" "), [id], (err) => {
    if (err) return cb(err);
    return cb(null);
  });
}

function loadVersion(versionId, force, cb) {

  if (typeof force === "function") {
    cb = force;
    force = false;
  }

  const q = [
    "SELECT ev.entity_id, created, entity_created, doc, version_id, correlation_id",
    "FROM entity e, entity_version ev",
    "WHERE version_id = $1"
  ];

  if (!force) {
    q.push("AND e.entity_id = ev.entity_id AND e.entity_removed IS NULL");
  }

  pgReaderClient.query(q.join(" "), [versionId], (err, res) => {
    if (err) return cb(err);

    const v = (res.rows && res.rows.length > 0) ? res.rows[0] : null;
    if (!v) return cb(null, null);

    const output = {
      created: v.created,
      versionId: v.version_id,
      correlationId: v.correlation_id,
      entity: getDocWithMeta(v)
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

  pgReaderClient.query(q.join(" "), [entityId], (err, result) => {

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

function upsertWithForce(entity, force, done) {
  entity.id = entity.id || uuid.v4();
  if (!entity.meta) entity.meta = {};
  delete entity.meta.createdAt;
  delete entity.meta.updatedAt;

  const queryStr = [
    "WITH ev AS (",
    "INSERT INTO entity_version (version_id, entity_id, doc, correlation_id, created)",
    (force ? "VALUES(uuid_generate_v4(), $1::varchar(36), $3::jsonb, $4, $5::timestamptz)" : "SELECT uuid_generate_v4(), $1::varchar(36), $3::jsonb, $4, $5::timestamptz"),
    (force ? "" : "WHERE NOT EXISTS (SELECT FROM entity WHERE entity_id = $1 AND entity_removed IS NOT NULL)"),
    "RETURNING version_id, created",
    ") INSERT INTO entity (entity_id, entity_type, entity_created, latest_version_id)",
    "SELECT $1::varchar(36), $2, created::timestamptz, version_id FROM ev",
    "ON CONFLICT ON CONSTRAINT entity_pkey",
    "DO UPDATE SET latest_version_id = (SELECT version_id FROM ev)",
    "RETURNING latest_version_id as version_id, (SELECT created from ev), entity_created"
  ].join(" ");

  pgClient.query(queryStr, [entity.id, entity.type, entity, entity.meta.correlationId, new Date().toISOString()], (err, res) => {
    if (err) return done(err);
    if (res.rowCount) {
      const {created: updatedAt, entity_created: createdAt} = res.rows && res.rows[0];
      entity.meta.createdAt = createdAt.toISOString();
      entity.meta.updatedAt = updatedAt.toISOString();
    }
    return done(null, {
      entityId: entity.id,
      wasInsert: res.oid > 0,
      wasConflict: res.rowCount === 0,
      versionId: res.rowCount && res.rows[0].version_id
    });
  });
}

function upsert(entity, done) {
  const force = false;
  return upsertWithForce(entity, force, done);
}

function cleanEntityHistory(entity, cb) {
  if (!entity || !entity.id || !entity.type) {
    return cb(new Error(`Missing required fields in entity: ${JSON.stringify(entity)}`));
  }

  load(entity.id, true, (err, doc) => {
    if (err) return cb(err);
    if (!doc) return cb(new Error("No such entity"));

    return upsertWithForce(entity, true, (upsertErr, updatedEntity) => {
      if (upsertErr) return cb(upsertErr);
      removeEntityVersions(entity.id, updatedEntity.versionId, cb);
    });
  });
}

function removeEntityVersions(id, lastVersionId, cb) {
  pgClient.query([
    "DELETE FROM entity_version",
    "WHERE entity_id = $1",
    "AND version_id != $2"].join(" "), [id, lastVersionId], (err) => {
    if (err) return cb(err);
    return cb(null);
  });
}

function getStatus(cb) {
  pgClient.query("select 1", [], (err) => {
    if (err) return cb(err);
    if (pgClient !== pgReaderClient) {
      pgReaderClient.query("select 1", [], (readerErr) => {
        return cb(readerErr);
      });
    } else {
      return cb();
    }
  });
}

module.exports = {
  load,
  queryByRelationship,
  queryBySingleRelationship,
  queryByRelationships,
  findOneByRelationships,
  findOneBySingleRelationship: queryBySingleRelationship,
  loadByExternalId,
  loadVersion,
  listVersions,
  remove,
  restoreVersion,
  upsert,
  tables,
  cleanEntityHistory,
  getStatus
};
