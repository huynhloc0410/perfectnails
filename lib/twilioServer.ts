import twilio from 'twilio';

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  );
}

function client() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) throw new Error('Twilio is not configured');
  return twilio(sid, token);
}

export async function sendSms(params: { to: string; body: string }): Promise<{ sid: string }> {
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!from) throw new Error('TWILIO_FROM_NUMBER is missing');
  const c = client();
  const msg = await c.messages.create({
    to: params.to,
    from,
    body: params.body,
  });
  return { sid: msg.sid };
}

