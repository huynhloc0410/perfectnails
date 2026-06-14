-- Snapshot guest name on each booking (admin cards show name as entered at booking time).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(200);

UPDATE bookings b
SET guest_name = NULLIF(TRIM(c.name), '')
FROM customers c
WHERE b.customer_id = c.id
  AND (b.guest_name IS NULL OR TRIM(b.guest_name) = '');

UPDATE bookings SET guest_name = 'Guest' WHERE guest_name IS NULL OR TRIM(guest_name) = '';
