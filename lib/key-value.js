import pgClient from "./client.js";

const get = (key, callback) => {
  const q = "SELECT doc FROM key_value WHERE key_id = $1";

  pgClient.query(q, [ key ], (err, res) => {
    if (err) return callback(err);
    const val = res.rows && res.rows.length > 0 ? res.rows[0] : null;
    const doc = val !== null ? val.doc : null;
    return callback(null, doc);
  });
};

const set = (key, value, done) => {
  pgClient.query(
    [
      "INSERT into key_value",
      "(key_id, doc)",
      "VALUES ($1::text, $2::jsonb)",
      "ON CONFLICT(key_id) DO UPDATE",
      "SET doc=$2, updated=now()",
      "WHERE key_value.key_id=$1",
    ].join(" "),
    [ key, value ],
    done
  );
};

export default { get, set };
