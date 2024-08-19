-- Upsert venue data
INSERT INTO venues (id, name) VALUES 
  ('1', 'Brooklyn Mirage'),
  ('2', 'Silo'),
  ('3', 'Public Records'),
  ('4', 'Knockdown Center'),
  ('5', 'Basement'),
  ('6', 'Bossa Nova Civic Club'),
  ('7', 'Elsewhere'),
  ('8', 'Le Bain'),
  ('9', 'Nowadays')
ON CONFLICT(id) DO NOTHING;

-- Verify the upsert
SELECT * FROM venues;
