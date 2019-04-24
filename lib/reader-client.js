"use strict";

const config = require("exp-config");
const pg = require("pg");

let query;
let close;

const poolConfig = config.postgresReader ? {
  user: config.postgresReader.user,
  password: config.postgresReader.password,
  database: config.postgresReader.database,
  host: config.postgresReader.host,
  port: config.postgresReader.port
} : null;


if (poolConfig) {
  let pool;

  query = (sql, args, callback) => {

    if (!pool) pool = new pg.Pool(poolConfig);

    pool.connect((err, client, done) => {
      if (err) return callback(err);
      client.query(sql, args, (queryErr, res) => {
        done();
        callback(queryErr, res);
      });
    });
  };

  close = (callback) => {
    if (pool) {
      pool.end(callback);
      pool = null;
    }
  };
} else {
  const client = require("./client");
  query = client.query;
  close = client.close;
}

module.exports = {
  query,
  close
};
