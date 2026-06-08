-- Merge customers with the same phone (last 10 digits) within each salon.
-- Run once: npm run db:merge-customers
-- Keeps the oldest customer row; reassigns bookings; soft-deletes duplicates.

BEGIN;

WITH phone_groups AS (
  SELECT
    id,
    salon_id,
    RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) AS digits10,
    ROW_NUMBER() OVER (
      PARTITION BY salon_id, RIGHT(regexp_replace(phone, '\D', '', 'g'), 10)
      ORDER BY created_at ASC
    ) AS rn
  FROM customers
  WHERE deleted_at IS NULL
    AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
),
dupes AS (
  SELECT g.id AS dupe_id, k.id AS keep_id
  FROM phone_groups g
  JOIN phone_groups k
    ON k.salon_id = g.salon_id
   AND k.digits10 = g.digits10
   AND k.rn = 1
  WHERE g.rn > 1
)
UPDATE bookings b
SET customer_id = d.keep_id,
    updated_at = NOW()
FROM dupes d
WHERE b.customer_id = d.dupe_id;

WITH phone_groups AS (
  SELECT
    id,
    salon_id,
    RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) AS digits10,
    ROW_NUMBER() OVER (
      PARTITION BY salon_id, RIGHT(regexp_replace(phone, '\D', '', 'g'), 10)
      ORDER BY created_at ASC
    ) AS rn
  FROM customers
  WHERE deleted_at IS NULL
    AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
),
dupes AS (
  SELECT g.id AS dupe_id, k.id AS keep_id
  FROM phone_groups g
  JOIN phone_groups k
    ON k.salon_id = g.salon_id
   AND k.digits10 = g.digits10
   AND k.rn = 1
  WHERE g.rn > 1
)
UPDATE sms_logs s
SET customer_id = d.keep_id
FROM dupes d
WHERE s.customer_id = d.dupe_id;

WITH phone_groups AS (
  SELECT
    id,
    salon_id,
    RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) AS digits10,
    ROW_NUMBER() OVER (
      PARTITION BY salon_id, RIGHT(regexp_replace(phone, '\D', '', 'g'), 10)
      ORDER BY created_at ASC
    ) AS rn
  FROM customers
  WHERE deleted_at IS NULL
    AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
)
UPDATE customers c
SET deleted_at = NOW(),
    updated_at = NOW()
FROM phone_groups g
WHERE c.id = g.id
  AND g.rn > 1;

COMMIT;

-- Check duplicates remaining (should return 0 rows):
-- SELECT salon_id, RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) AS digits10, COUNT(*)
-- FROM customers WHERE deleted_at IS NULL
-- GROUP BY salon_id, digits10 HAVING COUNT(*) > 1;
