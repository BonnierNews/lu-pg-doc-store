import config from "exp-config";
import pg from "pg";

const { user, password, database, host, port, statementTimeout, ssl, max = 10 } = config.postgres;

const poolConfig = {
  user,
  password,
  database,
  host,
  port,
  ssl,
  max,

  statement_timeout: statementTimeout || 10000,
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
  pool.connect(cb);
}

export default { query, close, getClient };
