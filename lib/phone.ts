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

