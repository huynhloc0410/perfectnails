import { NextRequest } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db/config';
import { handleInboundSmsCancel, isSmsCancelCommand } from '@/lib/db/cancelBookingBySms';
import { isTwilioConfigured } from '@/lib/twilioServer';
import { twimlMessageResponse, validateTwilioWebhook } from '@/lib/twilioWebhook';

export const dynamic = 'force-dynamic';

async function readTwilioForm(req: NextRequest): Promise<Record<string, string>> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}

export async function POST(req: NextRequest) {
  if (!isTwilioConfigured()) {
    return new Response('Twilio not configured', { status: 503 });
  }

  const params = await readTwilioForm(req);

  if (!validateTwilioWebhook(params, req)) {
    console.error('Twilio inbound SMS: invalid signature');
    return new Response('Forbidden', { status: 403 });
  }

  const from = params.From?.trim() ?? '';
  const body = params.Body?.trim() ?? '';
  const messageSid = params.MessageSid?.trim() ?? null;

  if (!from) {
    return twimlMessageResponse('Message received.');
  }

  if (!isDatabaseConfigured()) {
    return twimlMessageResponse('Online cancellation is unavailable. Please call the salon.');
  }

  if (!isSmsCancelCommand(body)) {
    return twimlMessageResponse('Reply CANCEL to cancel your next upcoming appointment.');
  }

  try {
    const result = await handleInboundSmsCancel({ fromPhone: from, body, messageSid });
    console.info('Twilio inbound cancel:', {
      from,
      ok: result.ok,
      legacyId: result.ok ? result.legacyId : undefined,
    });
    return twimlMessageResponse(result.replyBody);
  } catch (e) {
    console.error('Twilio inbound cancel failed:', e);
    return twimlMessageResponse(
      'Sorry, we could not cancel your appointment by text. Please call the salon.'
    );
  }
}
