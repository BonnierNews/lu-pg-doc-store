"use strict";

const config = require("exp-config");
const pg = require("pg");

const poolConfig = {
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  host: config.postgres.host,
  port: config.postgres.port,
  max: config.postgres.max || 10,
  statement_timeout: config.postgres.statement_timeout || 10000 // eslint-disable-line
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

function getClient(cb) {
  if (!pool) pool = new pg.Pool(poolConfig);
  pool.connect((err, client, done) => {
    if (err) return cb(err);
    cb(client, done);
  });
}

module.exports = {
  query,
  close,
  getClient
};
