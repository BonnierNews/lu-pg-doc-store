"use strict";

// Ensure that the db schema is in place

const path = require("path");
const fs = require("fs");
const pgClient = require("./client.js");
const async = require("async");

function init(folders, callback) {
  if (typeof folders === "function") {
    callback = folders;
    folders = [];
  }
  const MIGRATION_FOLDER = path.join(__dirname, "../migrations");
  async.eachSeries([].concat(MIGRATION_FOLDER, folders), migrateFolder, callback);
}

function migrateFolder(folder, callback) {
  const files = fs.readdirSync(folder);

  const migrations = files
    .filter((f) => f.endsWith("sql"))
    .sort((a, b) => fileNr(a) - fileNr(b));
  async.eachSeries(migrations, runMigration.bind(null, folder), callback);

}

function runMigration(folder, filename, callback) {
  const filePath = path.join(folder, filename);
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
        message: "ERROR initializing database:",
        error: err
      });
    }
  });
}
