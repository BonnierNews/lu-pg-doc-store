CREATE TABLE IF NOT EXISTS entity_version (
  version_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  correlation_id VARCHAR(100),
  doc JSONB,
  created TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (version_id)
);

CREATE TABLE IF NOT EXISTS entity (
  entity_id CHAR(36) PRIMARY KEY,
  entity_type VARCHAR(200),
  entity_created timestamp DEFAULT now(),
  latest_version_id VARCHAR(100) NOT NULL,
  CONSTRAINT fk_orders_latest_version
    FOREIGN KEY (latest_version_id)
    REFERENCES entity_version (version_id)
);
