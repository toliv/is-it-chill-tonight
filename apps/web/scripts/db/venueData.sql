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
  ('9', 'Nowadays'),
  ('10', 'Under the K Bridge'),
  ('11', 'Circle Line Cruises'),
  ('12', 'TBA Brooklyn'),
  ('13', 'The Last Call'),
  ('14', 'Good Room'),
  ('15', 'Superior Ingredients'),
  ('16', 'House of Yes'),
  ('17', 'H0L0'),
  ('18', 'The Dean NYC')
ON CONFLICT(id) DO NOTHING;

-- Verify the upsert
SELECT * FROM venues;
