"use strict";

const pgClient = require("./client");
const assert = require("assert");
const async = require("async");
const initDb = require("./init-db");
const {
  tables
} = require("./query");

// NOTE: database will be dropped and recreated in each test case.
// If this becomes a performance problem, use some sort of global
// hook that drops the tables once and only use a delete query to
// clean the database before each test here.
function clearAndInit(callback) {
  async.series([drop, initDb.init], callback);
}

function drop(callback) {
  assert.equal(process.env.NODE_ENV, "test", `Wont purge db in env "${process.env.NODE_ENV}"`);
  async.retry({times: 6, interval: 500}, (retryCb) => {
    pgClient.query(
      Object.values(tables)
        .map((resource) => `DROP TABLE IF EXISTS ${resource}`)
        .join(";"), [], retryCb);
  }, callback);
}

module.exports = {
  clearAndInit
};
