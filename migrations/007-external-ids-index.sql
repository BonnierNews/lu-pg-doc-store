CREATE INDEX IF NOT EXISTS entity_version_external_ids_gin_idx ON entity_version USING gin ((doc -> 'externalIds'));
