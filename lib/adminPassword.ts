import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string compare for passwords.
 */
export function timingSafePasswordEqual(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
