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
  pgClient.query(
    Object.values(tables)
      .map((resource) => `DROP TABLE IF EXISTS ${resource}`)
      .join(";"), [], (err) => {
        if (err) {
          /* eslint no-console: 0 */
          console.error("Failed to initialize postgres:", err, ". Retry in 1 sec");
          return setTimeout(() => drop(callback), 1000);
        }
        callback();
      });
}

module.exports = {
  clearAndInit
};
