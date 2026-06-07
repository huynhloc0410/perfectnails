-- =============================================================================
-- NailsByNi — production PostgreSQL schema (multi-salon ready)
-- Apply: npm run db:schema
-- Live site continues using S3 cmsSite until app code is switched over.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE employment_status AS ENUM ('active', 'inactive', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'card', 'zelle', 'venmo', 'gift_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE sms_message_type AS ENUM ('confirmation', 'reminder', 'follow_up', 'marketing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE sms_delivery_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'undelivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE email_delivery_status AS ENUM ('queued', 'sent', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE loyalty_tx_type AS ENUM ('earn', 'redeem', 'adjust', 'expire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE file_storage_provider AS ENUM ('r2', 's3', 'local');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Legacy ID map (S3 cmsSite string ids → UUID; safe re-runs of migration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS legacy_id_mappings (
  entity_type  VARCHAR(32) NOT NULL,
  legacy_id    VARCHAR(128) NOT NULL,
  uuid         UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_legacy_id_mappings_uuid ON legacy_id_mappings (uuid);

-- ---------------------------------------------------------------------------
-- SALONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(255),
  address     TEXT,
  timezone    VARCHAR(64) NOT NULL DEFAULT 'America/Phoenix',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salons_email_format_chk
    CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$')
);

DROP TRIGGER IF EXISTS salons_updated_at ON salons;
CREATE TRIGGER salons_updated_at
  BEFORE UPDATE ON salons FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- BUSINESS SETTINGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS business_settings (
  salon_id                   UUID PRIMARY KEY REFERENCES salons(id) ON DELETE CASCADE,
  cancellation_policy_text   TEXT,
  cancellation_hours_before  INTEGER NOT NULL DEFAULT 24
    CHECK (cancellation_hours_before >= 0),
  booking_lead_time_minutes  INTEGER NOT NULL DEFAULT 60
    CHECK (booking_lead_time_minutes >= 0),
  reminder_hours_before      INTEGER[] NOT NULL DEFAULT ARRAY[24, 2],
  max_advance_booking_days   INTEGER NOT NULL DEFAULT 90
    CHECK (max_advance_booking_days >= 1),
  default_tax_rate           NUMERIC(6, 4) NOT NULL DEFAULT 0
    CHECK (default_tax_rate >= 0 AND default_tax_rate <= 1),
  online_booking_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_sms_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  settings_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS business_settings_updated_at ON business_settings;
CREATE TRIGGER business_settings_updated_at
  BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_salon_id ON categories (salon_id);
CREATE INDEX IF NOT EXISTS idx_categories_salon_active_order
  ON categories (salon_id, display_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_salon_name_active
  ON categories (salon_id, lower(name)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS services (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id               UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  category_id            UUID NOT NULL REFERENCES categories(id),
  name                   VARCHAR(150) NOT NULL,
  description            TEXT,
  duration_minutes       INTEGER NOT NULL DEFAULT 45
    CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  price                  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  display_order          INTEGER NOT NULL DEFAULT 0,
  online_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services (salon_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services (category_id);
CREATE INDEX IF NOT EXISTS idx_services_salon_bookable
  ON services (salon_id, display_order)
  WHERE deleted_at IS NULL AND is_active = TRUE AND online_booking_enabled = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_services_salon_name_active
  ON services (salon_id, lower(name)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id          UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL DEFAULT '',
  nickname          VARCHAR(100),
  phone             VARCHAR(30),
  email             VARCHAR(255),
  avatar_url        TEXT,
  bio               TEXT,
  hire_date         DATE,
  employment_status employment_status NOT NULL DEFAULT 'active',
  display_order     INTEGER NOT NULL DEFAULT 0,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employees_email_format_chk
    CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_employees_salon_id ON employees (salon_id);
CREATE INDEX IF NOT EXISTS idx_employees_salon_active
  ON employees (salon_id, display_order)
  WHERE deleted_at IS NULL AND employment_status = 'active';

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- EMPLOYEE SKILLS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_services (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_services_service_id ON employee_services (service_id);

-- ---------------------------------------------------------------------------
-- WORK SCHEDULES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_availability_time_order_chk CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_employee_availability_employee_dow
  ON employee_availability (employee_id, day_of_week) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS employee_availability_updated_at ON employee_availability;
CREATE TRIGGER employee_availability_updated_at
  BEFORE UPDATE ON employee_availability FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TIME OFF
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_time_off (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime   TIMESTAMPTZ NOT NULL,
  reason         VARCHAR(100),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_time_off_range_chk CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_employee_time_off_employee_range
  ON employee_time_off (employee_id, start_datetime, end_datetime);

DROP TRIGGER IF EXISTS employee_time_off_updated_at ON employee_time_off;
CREATE TRIGGER employee_time_off_updated_at
  BEFORE UPDATE ON employee_time_off FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  email            VARCHAR(255),
  birthday         DATE,
  notes            TEXT,
  sms_opt_in       BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_email_format_chk
    CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_salon_phone ON customers (salon_id, phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_salon_phone_active
  ON customers (salon_id, phone) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- CUSTOMER ADDRESSES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       VARCHAR(50),
  line1       VARCHAR(255) NOT NULL,
  line2       VARCHAR(255),
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country     CHAR(2) NOT NULL DEFAULT 'US',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses (customer_id);

DROP TRIGGER IF EXISTS customer_addresses_updated_at ON customer_addresses;
CREATE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  booking_number   VARCHAR(32) NOT NULL,
  status           booking_status NOT NULL DEFAULT 'pending',
  appointment_date DATE NOT NULL,
  start_datetime   TIMESTAMPTZ NOT NULL,
  end_datetime     TIMESTAMPTZ NOT NULL,
  notes            TEXT,
  internal_notes   TEXT,
  subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax              NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total            NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  deposit_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  cancelled_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_time_range_chk CHECK (end_datetime > start_datetime)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_salon_booking_number ON bookings (salon_id, booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings (appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_start ON bookings (salon_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_status_date ON bookings (salon_id, status, appointment_date);

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- BOOKING SERVICES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id          UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name        VARCHAR(150) NOT NULL,
  price_at_booking    NUMERIC(10, 2) NOT NULL CHECK (price_at_booking >= 0),
  duration_at_booking INTEGER NOT NULL CHECK (duration_at_booking > 0),
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services (service_id);

-- ---------------------------------------------------------------------------
-- BOOKING ASSIGNMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  employee_id        UUID NOT NULL REFERENCES employees(id),
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_booking_assignments_service_employee UNIQUE (booking_service_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_assignments_employee_id ON booking_assignments (employee_id);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount                NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method        payment_method NOT NULL,
  status                payment_status NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(255),
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- DEPOSITS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS deposits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  paid_at     TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_booking_id ON deposits (booking_id);

DROP TRIGGER IF EXISTS deposits_updated_at ON deposits;
CREATE TRIGGER deposits_updated_at
  BEFORE UPDATE ON deposits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- GIFT CARDS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gift_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  code            VARCHAR(32) NOT NULL,
  balance         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  original_amount NUMERIC(10, 2) NOT NULL CHECK (original_amount >= 0),
  expiration_date DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_cards_salon_code
  ON gift_cards (salon_id, upper(code)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS gift_cards_updated_at ON gift_cards;
CREATE TRIGGER gift_cards_updated_at
  BEFORE UPDATE ON gift_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- LOYALTY
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id       UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_loyalty_accounts_salon_customer UNIQUE (salon_id, customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  booking_id         UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tx_type            loyalty_tx_type NOT NULL,
  points             INTEGER NOT NULL,
  description        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id
  ON loyalty_transactions (loyalty_account_id, created_at DESC);

DROP TRIGGER IF EXISTS loyalty_accounts_updated_at ON loyalty_accounts;
CREATE TRIGGER loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- GALLERY
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gallery_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  title         VARCHAR(200),
  description   TEXT,
  service_id    UUID REFERENCES services(id) ON DELETE SET NULL,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_salon_featured
  ON gallery_photos (salon_id, featured, display_order) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS gallery_photos_updated_at ON gallery_photos;
CREATE TRIGGER gallery_photos_updated_at
  BEFORE UPDATE ON gallery_photos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- SMS LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sms_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone_number  VARCHAR(30) NOT NULL,
  message_type  sms_message_type NOT NULL,
  message_body  TEXT NOT NULL DEFAULT '',
  twilio_sid    VARCHAR(64),
  status        sms_delivery_status NOT NULL DEFAULT 'queued',
  sent_at       TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_booking_id ON sms_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id ON sms_logs (customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs (phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_salon_sent_at ON sms_logs (salon_id, sent_at DESC);

-- ---------------------------------------------------------------------------
-- EMAIL LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  recipient  VARCHAR(255) NOT NULL,
  subject    VARCHAR(500) NOT NULL,
  body       TEXT NOT NULL,
  status     email_delivery_status NOT NULL DEFAULT 'queued',
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_salon_sent_at ON email_logs (salon_id, sent_at DESC);

-- ---------------------------------------------------------------------------
-- ADMIN USERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      UUID REFERENCES salons(id) ON DELETE SET NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(200),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    UUID REFERENCES salons(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id   UUID NOT NULL,
  action      VARCHAR(64) NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_salon_created ON audit_logs (salon_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- FILES (R2 / S3 metadata)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    UUID REFERENCES salons(id) ON DELETE SET NULL,
  provider    file_storage_provider NOT NULL DEFAULT 's3',
  bucket      VARCHAR(255) NOT NULL,
  object_key  TEXT NOT NULL,
  public_url  TEXT,
  mime_type   VARCHAR(127),
  byte_size   BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_files_provider_bucket_key UNIQUE (provider, bucket, object_key)
);

CREATE INDEX IF NOT EXISTS idx_files_salon_id ON files (salon_id);

-- ---------------------------------------------------------------------------
-- BOOKING BLOCKS (maps cmsSite bookingBlocks)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salon_booking_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  block_date  DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  salon_wide  BOOLEAN NOT NULL DEFAULT FALSE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salon_booking_blocks_time_order_chk CHECK (end_time > start_time),
  CONSTRAINT salon_booking_blocks_scope_chk
    CHECK (salon_wide = TRUE OR employee_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_salon_booking_blocks_date ON salon_booking_blocks (salon_id, block_date);

COMMIT;
