"use strict";

// Ensure that the db schema is in plac

const path = require("path");
const fs = require("fs");
const pgClient = require("./client.js");
const async = require("async");

const MIGRATION_FOLDER = path.join(__dirname, "../migrations");

function init(callback) {

  const files = fs.readdirSync(MIGRATION_FOLDER);

  const migrations = files
    .filter((f) => f.endsWith("sql"))
    .sort((a, b) => fileNr(a) - fileNr(b));
  async.eachSeries(migrations, runMigration, callback);
}

function runMigration(filename, callback) {
  const filePath = path.join(MIGRATION_FOLDER, filename);
  const sql = fs.readFileSync(filePath, {
    encoding: "UTF-8"
  });
  pgClient.query(sql, [], callback);
}

function fileNr(filename) {
  return parseInt(filename.split("-")[0]);
}

module.exports = {
  init
};

if (require.main === module) {
  init((err) => {
    if (err) {
      throw ({
        message: "ERROR initializing databse:",
        error: err
      });
    }
  });
}
