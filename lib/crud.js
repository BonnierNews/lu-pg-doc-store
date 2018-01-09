"use strict";

const uuid = require("uuid");
const pgClient = require("./client");
const async = require("async");

const tables = {
  entity: "entity",
  entityVersion: "entity_version"
};

function load(id, cb) {
  pgClient.query([
    "SELECT doc",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id AND e.entity_id = $1"
  ].join(" "), [id], (err, res) => {
    if (err) return cb(err);

    const entity = (res.rows && res.rows.length > 0) ? res.rows[0] : null;

    return cb(null, entity.doc);
  });
}

function loadVersion(versionId, cb) {
  pgClient.query([
    "SELECT created, doc, version_id, correlation_id",
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
      entity: v.doc
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
  pgClient.query(
    [
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
  const correlationId = entity.meta ? entity.meta.correlationId : null;

  const insertStatement = [
    "INSERT into entity_version",
    "(version_id, entity_id, correlation_id, doc)",
    "SELECT $1::text, $2::text, $3::text, $4::jsonb"
  ];

  const params = [versionId, entity.id, correlationId, entity];
  insertStatement.push("RETURNING created");

  pgClient.query(
    insertStatement.join(" "),
    params,
    (err, res) => {
      const responseHasTimestamp = (!err && res && res.rows && res.rows.length === 1);
      const timestamp = responseHasTimestamp ? res.rows[0].created : undefined;

      done(err, (res && res.rowCount > 0) ? versionId : null, timestamp);
    }
  );
}

module.exports = {
  load,
  loadVersion,
  listVersions,
  upsert,
  tables
};
