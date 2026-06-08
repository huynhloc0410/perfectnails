import type { PoolClient } from 'pg';
import { withPgClient } from '@/lib/db/pool';
import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

type DueReminderRow = {
  id: string;
  phone_number: string;
  message_body: string;
};

export async function processPostgresDueReminders(limit = 25): Promise<{
  processed: number;
  sent: number;
  errored: number;
}> {
  if (!isTwilioConfigured()) {
    return { processed: 0, sent: 0, errored: 0 };
  }

  return withPgClient(async (client) => {
    const due = await client.query<DueReminderRow>(
      `SELECT id, phone_number, message_body
       FROM sms_logs
       WHERE status = 'queued'
         AND message_type = 'reminder'
         AND scheduled_send_at IS NOT NULL
         AND scheduled_send_at <= NOW()
       ORDER BY scheduled_send_at ASC
       LIMIT $1`,
      [limit]
    );

    let processed = 0;
    let sent = 0;
    let errored = 0;

    for (const row of due.rows) {
      processed += 1;
      try {
        const out = await sendSms({ to: row.phone_number, body: row.message_body });
        await client.query(
          `UPDATE sms_logs
           SET status = 'sent', twilio_sid = $2, sent_at = NOW(), error_message = NULL
           WHERE id = $1`,
          [row.id, out.sid]
        );
        sent += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to send reminder SMS';
        await client.query(
          `UPDATE sms_logs SET status = 'failed', error_message = $2 WHERE id = $1`,
          [row.id, msg]
        );
        errored += 1;
        console.error('PG reminder SMS failed:', { id: row.id, err: e });
      }
    }

    return { processed, sent, errored };
  });
}
