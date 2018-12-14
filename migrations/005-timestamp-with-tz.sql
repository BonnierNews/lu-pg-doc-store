ALTER TABLE entity ALTER entity_created TYPE timestamptz USING entity_created AT TIME ZONE 'UTC', ALTER entity_removed TYPE timestamptz USING entity_removed AT TIME ZONE 'UTC', ALTER COLUMN entity_created SET DEFAULT now() at time zone 'utc';
ALTER TABLE entity_version ALTER created TYPE timestamptz USING created AT TIME ZONE 'UTC', ALTER COLUMN created SET DEFAULT now() at time zone 'utc';
