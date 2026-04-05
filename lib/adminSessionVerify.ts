/** Edge-safe session verification (middleware + API routes). */

export const ADMIN_SESSION_COOKIE = 'admin_session';

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

function b64urlToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [h, p, s] = parts;

  const data = new TextEncoder().encode(`${h}.${p}`);
  let sig: Uint8Array;
  try {
    sig = b64urlToBytes(s);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const ok = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!ok) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (payload.sub !== 'admin') return false;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
