"use strict";

const uuid = require("uuid");
const pgClient = require("./client");
const async = require("async");

const tables = {
  entity: "entity",
  entityVersion: "entity_version",
  relation: "relation"
};

function load(id, cb) {
  pgClient.query([
    "SELECT e.entity_id as id, entity_type as type, version_id, ev.created as version_created, entity_created as created, correlation_id, attributes, external_id, external_type, external_system",
    "FROM entity e JOIN entity_version ev on e.latest_version_id = ev.version_id LEFT OUTER JOIN relation r ON (e.entity_id = r.entity_id)",
    "WHERE e.entity_id = $1"
  ].join(" "), [id], (err, res) => {
    if (err) return cb(err);

    if (!res.rows || res.rows.length <= 0) return cb(null, null);

    const v = res.rows[0];

    const output = {
      id: v.id,
      type: v.type,
      versionId: v.version_id,
      versionCreated: v.version_created,
      entityCreated: v.created,
      attributes: v.attributes,
      relationships: res.rows
        .filter((relation) => !!relation.external_id)
        .map((relation) => {
          return {
            id: relation.external_id,
            type: relation.external_type,
            system: relation.external_system
          };
        }),
      meta: {
        correlationId: v.correlation_id
      }
    };

    return cb(null, output);
  });
}

function loadVersion(versionId, cb) {
  pgClient.query([
    "SELECT created, attributes, version_id, correlation_id",
    "FROM entity_version",
    "WHERE version_id = $1"
  ].join(" "), [versionId], (err, res) => {
    if (err) return cb(err);

    const v = (res.rows && res.rows.length > 0) ? res.rows[0] : null;
    if (!v) return cb(null, null);

    const output = {
      created: v.created,
      versionId: v.version_id,
      correlationId: v.correlation_id,
      attributes: v.attributes
    };

    return cb(null, output);
  });
}

function listVersions(entityId, cb) {
  pgClient.query([
    "SELECT ev.version_id, ev.created, ev.correlation_id,",
    "e.latest_version_id",
    "FROM entity_version as ev",
    "LEFT OUTER JOIN entity as e ON ev.version_id = e.latest_version_id",
    "WHERE ev.entity_id = $1",
    "ORDER BY ev.created ASC"
  ].join(" "), [entityId], (err, result) => {

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
  const entityId = entity.id || uuid.v4();
  const typeId = entity.type || null;
  const json = entity.attributes || null;
  const correlationId = entity.meta.correlationId || null;
  const relationships = entity.relationships || null;

  let newVersionId;
  async.waterfall([
    (cb) => insertRelations(entityId, relationships, cb),
    (cb) => insertVersion(entityId, json, correlationId, cb),
    (versionId, created, cb) => {
      if (versionId) {
        newVersionId = versionId;
        return doUpsert(entityId, typeId, versionId, created, cb);
      }
      return cb(null, {
        wasConflict: true,
        oid: 0
      });
    }
  ], (err, upsertRes) => {
    if (err) return done(err);
    return done(null, {
      entityId: entityId,
      wasInsert: upsertRes.oid > 0,
      wasConflict: upsertRes.wasConflict,
      versionId: newVersionId
    });
  });
}

function doUpsert(id, type, versionId, created, done) {
  pgClient.query([
    "INSERT into entity as e",
    "(entity_type, entity_id, entity_created, latest_version_id)",
    "VALUES ($1::text, $2::text, $3::timestamp, $4::text)",
    "ON CONFLICT(entity_id) DO UPDATE",
    "SET latest_version_id=$4",
    "WHERE e.entity_id=$2"
  ].join(" "), [type, id, created, versionId],
    done
  );
}

function insertVersion(entityId, json, correlationId, done) {
  const versionId = uuid.v4();

  pgClient.query([
    "INSERT into entity_version",
    "(version_id, entity_id, correlation_id, attributes)",
    "SELECT $1::text, $2::text, $3::text, $4::jsonb",
    "RETURNING created"
  ].join(" "),
    [versionId, entityId, correlationId, json],
    (err, res) => {
      const responseHasTimestamp = (!err && res && res.rows && res.rows.length === 1);
      const timestamp = responseHasTimestamp ? res.rows[0].created : undefined;

      done(err, (res && res.rowCount > 0) ? versionId : null, timestamp);
    }
  );
}

function insertRelations(entityId, relationships, done) {
  if (!relationships) return done(null);

  const errors = relationships.map((relation) => {
    pgClient.query([
      "INSERT into relation",
      "(relation_id, entity_id, external_system, external_id, external_type)",
      "SELECT $1::text, $2::text, $3::text, $4::text, $5::text",
      "RETURNING created"
    ].join(" "),
      [uuid.v4(), entityId, relation.system, relation.id, relation.type],
      (err) => {
        if (err) return err;
        return;
      }
    );
  })
  .filter((result) => result !== undefined);

  if (errors.length === 0) {
    return done();
  }
  return done(errors);
}

module.exports = {
  load,
  loadVersion,
  listVersions,
  upsert,
  tables
};
