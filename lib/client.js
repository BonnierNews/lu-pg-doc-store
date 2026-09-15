import config from "exp-config";
import pg from "pg";

const { user, password, database, host, port, statementTimeout, ssl, max = 10 } = config.postgres;

// The metadata server is HTTP-only and link-local; traffic never leaves the host
const tokenUrl =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/sqlservice.login";

async function fetchIamToken() {
  const response = await fetch(tokenUrl, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`Failed to fetch IAM auth token from metadata server: ${response.status}`);
  return (await response.json()).access_token;
}

const poolConfig = {
  user,
  password: password === "IAM_AUTH" ? fetchIamToken : password,
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
