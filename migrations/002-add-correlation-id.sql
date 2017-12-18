ALTER TABLE entity_version
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100);

