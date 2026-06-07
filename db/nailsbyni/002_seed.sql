-- Optional demo seed (separate from S3 migration). Idempotent via fixed UUIDs.
-- Run: npm run db:seed

BEGIN;

INSERT INTO salons (id, name, phone, email, address, timezone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Perfect Nails & Spa',
  '(480) 555-1234',
  'info@perfectnails.com',
  'Phoenix, AZ',
  'America/Phoenix'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  updated_at = NOW();

INSERT INTO business_settings (salon_id, cancellation_policy_text, booking_lead_time_minutes)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Please cancel at least 24 hours before your appointment.',
  60
)
ON CONFLICT (salon_id) DO NOTHING;

INSERT INTO categories (id, salon_id, name, display_order) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Pedicure', 1),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Manicure', 2),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Nail Enhancements', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, salon_id, category_id, name, duration_minutes, price, display_order) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'Basic Pedicure', 45, 35.00, 1),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'Deluxe Pedicure', 60, 50.00, 2),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'Gel X', 120, 75.00, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, salon_id, first_name, nickname, phone, display_order) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Jenny', 'Jenny', '4805550001', 1),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Ni', 'Ni', '4805550002', 2),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Anna', 'Anna', '4805550003', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employee_services (employee_id, service_id) VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333303'),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301')
ON CONFLICT DO NOTHING;

COMMIT;
