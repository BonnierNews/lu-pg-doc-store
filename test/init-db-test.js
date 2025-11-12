import path, { dirname } from "path";
import { fileURLToPath } from "url";

import client from "../lib/client.js";
import initDb from "../lib/init-db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
