import twilio from 'twilio';
import { runtimeEnv } from '@/lib/runtimeEnv';

export function twilioWebhookPublicUrl(pathname: string, req: Request): string {
  const configured = runtimeEnv('TWILIO_WEBHOOK_URL')?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host')?.trim() ||
    '';
  return `${proto}://${host}${pathname}`;
}

export function validateTwilioWebhook(params: Record<string, string>, req: Request): boolean {
  const skip = runtimeEnv('TWILIO_VALIDATE_WEBHOOK')?.trim().toLowerCase();
  if (skip === 'false' || skip === '0' || skip === 'no') {
    return true;
  }

  const authToken = runtimeEnv('TWILIO_AUTH_TOKEN')?.trim();
  if (!authToken) return false;

  const signature = req.headers.get('x-twilio-signature') ?? '';
  const url = twilioWebhookPublicUrl(new URL(req.url).pathname, req);

  return twilio.validateRequest(authToken, signature, url, params);
}

export function twimlMessageResponse(body: string): Response {
  const resp = new twilio.twiml.MessagingResponse();
  resp.message(body);
  return new Response(resp.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}
