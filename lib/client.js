"use strict";

const config = require("exp-config");
const pg = require("pg");

const poolConfig = {
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  host: config.postgres.host,
  port: config.postgres.port
};

let pool;

function query(sql, args, callback) {

  if (!pool) pool = new pg.Pool(poolConfig);

  pool.connect((err, client, done) => {
    if (err) return callback(err);
    client.query(sql, args, (queryErr, res) => {
      done();
      callback(queryErr, res);
    });
  });
}

function close(callback) {
  if (pool) {
    pool.end(callback);
    pool = null;
  }
}

module.exports = {
  query,
  close
};
