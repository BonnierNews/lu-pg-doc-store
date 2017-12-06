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
    "SELECT e.entity_id as id, entity_type as type, version_id, created as version_created, entity_created as created, attributes",
    "FROM entity e, entity_version ev",
    "WHERE e.latest_version_id = ev.version_id AND e.entity_id = $1"
  ].join(" "), [id], (err, res) => {
    if (err) return cb(err);
    const v = res.rows[0];
    return cb(null, v ? Object.assign({
      id
    }, v) : null);
  });
}

function loadVersion(versionId, cb) {
  pgClient.query([
    "SELECT created, attributes, version_id",
    "FROM entity_version",
    "WHERE version_id = $1"
  ].join(" "), [versionId], (err, res) => {
    if (err) return cb(err);
    const v = res.rows[0];
    return cb(null, v ? Object.assign({
      versionId
    }, v) : null);
  });
}

function upsert(id, typeId, json, givenVersionId, done) {
  if (typeof givenVersionId === "function") {
    done = givenVersionId;
    givenVersionId = null;
  }
  const entityId = id || uuid.v4();
  let newVersionId;
  async.waterfall([
    (cb) => insertVersion(entityId, json, givenVersionId, cb),
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
  pgClient.query(
    [
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

function insertVersion(id, json, givenVersion, done) {
  const versionId = uuid.v4();

  const insertStatement = [
    "INSERT into entity_version",
    "(version_id, entity_id, attributes)",
    "SELECT $1::text, $2::text, $3::jsonb"
  ];
  const params = [versionId, id, json];
  if (givenVersion) {
    insertStatement.push(...[
      "WHERE NOT EXISTS (",
      "SELECT entity_id FROM entity WHERE entity_id = $2::text AND latest_version_id != $6::text",
      ")"
    ]);
    params.push(givenVersion);
  }
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
  upsert,
  tables
};
