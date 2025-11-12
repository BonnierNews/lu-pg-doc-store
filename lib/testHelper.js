import assert from "assert";
import { retry, series } from "async";

import pgClient from "./client.js";
import initDb from "./init-db.js";
import { tables } from "./query.js";

// NOTE: database will be dropped and recreated in each test case.
// If this becomes a performance problem, use some sort of global
// hook that drops the tables once and only use a delete query to
// clean the database before each test here.
function clearAndInit(callback) {
  series([ drop, initDb.init ], callback);
}

function drop(callback) {
  assert(process.env.NODE_ENV === "test", `Wont purge db in env "${process.env.NODE_ENV}"`);
  retry(
    { times: 6, interval: 500 },
    (retryCb) => {
      pgClient.query(
        Object.values(tables)
          .map((resource) => `DROP TABLE IF EXISTS ${resource}`)
          .join(";"),
        [],
        retryCb
      );
    },
    callback
  );
}

function tearDown(callback) {
  pgClient.close(callback);
}

export default { tearDown, drop, clearAndInit };
