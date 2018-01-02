CREATE TABLE IF NOT EXISTS relation (
  relation_id CHAR(36) PRIMARY KEY,
  entity_id VARCHAR(100) NOT NULL,
  external_system VARCHAR(200),
  external_id VARCHAR(200),
  external_type VARCHAR(200),
  created TIMESTAMP NOT NULL DEFAULT NOW()
);
