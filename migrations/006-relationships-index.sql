CREATE INDEX IF NOT EXISTS entity_version_relationships_gin_idx ON entity_version USING gin ((doc -> 'relationships'));
