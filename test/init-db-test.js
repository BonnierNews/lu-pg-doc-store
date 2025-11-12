"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const path = require("path");

const initDb = require("../lib/init-db");
const client = require("../lib/client");

describe("init db", () => {
  after(client.close);

  it("should run migrations", (done) => {
    initDb.init(() => {
      client.query("select * from entity", [], (err) => {
        return done(err);
      });
    });
  });

  it("should run additional migrations", (done) => {
    const testMigrations = path.join(__dirname, "./test-migrations");

    initDb.init(testMigrations, () => {
      client.query("select * from test_table", [], (err) => {
        return done(err);
      });
    });
  });
});
