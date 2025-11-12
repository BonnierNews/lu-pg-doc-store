import { eachSeries } from "async";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import pgClient from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure that the db schema is in place

function init(folders, callback) {
  if (typeof folders === "function") {
    callback = folders;
    folders = [];
  }
  const MIGRATION_FOLDER = path.join(__dirname, "../migrations");
  eachSeries([].concat(MIGRATION_FOLDER, folders), migrateFolder, callback);
}

function migrateFolder(folder, callback) {
  const files = fs.readdirSync(folder);

  const migrations = files.filter((f) => f.endsWith("sql")).sort((a, b) => fileNr(a) - fileNr(b));
  eachSeries(migrations, runMigration.bind(null, folder), callback);
}

function runMigration(folder, filename, callback) {
  const filePath = path.join(folder, filename);
  const sql = fs.readFileSync(filePath, { encoding: "UTF-8" });
  pgClient.query(sql, [], callback);
}

function fileNr(filename) {
  return parseInt(filename.split("-")[0]);
}

export default { init };

if (import.meta.url.endsWith(process.argv[1])) {
  init((err) => {
    if (err) {
      throw {
        message: "ERROR initializing database:",
        error: err,
      };
    }
  });
}
