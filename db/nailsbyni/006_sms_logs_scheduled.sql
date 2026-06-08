-- Scheduled SMS reminders (replaces cmsSite smsJobs for new bookings).
BEGIN;

ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ;

ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS legacy_job_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_logs_legacy_job_id
  ON sms_logs (legacy_job_id)
  WHERE legacy_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_logs_scheduled_queued
  ON sms_logs (scheduled_send_at)
  WHERE status = 'queued' AND scheduled_send_at IS NOT NULL;

COMMIT;
