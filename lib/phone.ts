/**
 * US customer booking: accepts 10-digit NANP or 11 digits starting with 1.
 * Handles formatted input like (602) 123-4567 — strips non-digits before checks.
 */
export function isValidUsCustomerPhone(raw: string): boolean {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 0) return false;
  let n: string;
  if (d.length === 10) n = d;
  else if (d.length === 11 && d.startsWith('1')) n = d.slice(1);
  else return false;
  // NANP: area code first digit 2–9; exchange first digit 2–9
  const first = n[0];
  const exStart = n[3];
  if (first < '2' || first > '9') return false;
  if (exStart < '2' || exStart > '9') return false;
  return true;
}

export function normalizePhoneE164(raw: string): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // Already E.164-ish
  if (s.startsWith('+')) {
    const digits = `+${s.slice(1).replace(/\D/g, '')}`;
    if (/^\+\d{10,15}$/.test(digits)) return digits;
    return null;
  }

  // Strip all non-digits.
  const digitsOnly = s.replace(/\D/g, '');

  // Common US format: 10 digits → +1XXXXXXXXXX
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;

  // US with leading country code (11 digits starting with 1)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`;

  // Generic fallback: accept 10-15 digits without plus.
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return `+${digitsOnly}`;

  return null;
}

