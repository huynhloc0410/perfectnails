-- Change customers: first_name + last_name → single name (matches cmsSite bookings.name)
-- Run once on existing DB: npm run db:patch-customers

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(200);

UPDATE customers
SET name = TRIM(
  COALESCE(first_name, '') ||
  CASE WHEN COALESCE(last_name, '') <> '' THEN ' ' || last_name ELSE '' END
)
WHERE name IS NULL OR TRIM(name) = '';

UPDATE customers SET name = 'Guest' WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE customers ALTER COLUMN name SET NOT NULL;

ALTER TABLE customers DROP COLUMN IF EXISTS first_name;
ALTER TABLE customers DROP COLUMN IF EXISTS last_name;

COMMIT;
