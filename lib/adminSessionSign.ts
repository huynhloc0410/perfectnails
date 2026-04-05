/** Node-only: sign admin session JWT (login route only). */

import { createHmac } from 'crypto';
import { ADMIN_SESSION_COOKIE } from './adminSessionVerify';

export { ADMIN_SESSION_COOKIE };

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function signAdminToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin',
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
    })
  ).toString('base64url');

  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
