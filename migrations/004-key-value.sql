CREATE TABLE IF NOT EXISTS key_value (
  key_id VARCHAR(100) NOT NULL,
  doc JSONB,
  updated TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key_id)
);