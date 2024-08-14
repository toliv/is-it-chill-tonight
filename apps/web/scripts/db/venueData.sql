-- Upsert venue data
INSERT OR REPLACE INTO venues (id, name) VALUES
  ('1', 'Brooklyn Mirage'),
  ('2', 'Silo'),
  ('3', 'Public Records'),
  ('4', 'Knockdown Center'),
  ('5', 'Basement');

-- Verify the upsert
SELECT * FROM venues;
