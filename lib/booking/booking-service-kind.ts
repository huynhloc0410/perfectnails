import { accentFold } from '@/lib/booking/serviceEmployeeMatch';

export type BookingServiceKind = 'pedicure' | 'manicure' | 'other';

type ServiceCatalogRow = { name?: string | null; category?: string | null };

function haystack(name: string, category?: string | null): string {
  return accentFold(`${String(category ?? '').trim()} ${String(name ?? '').trim()}`);
}

function isPedicureHaystack(hay: string): boolean {
  return hay.includes('pedicure') || /\bpedi\b/.test(hay);
}

function isManicureHaystack(hay: string): boolean {
  return hay.includes('manicure') || /\bmani\b/.test(hay);
}

function classifyHaystack(hay: string): BookingServiceKind {
  if (isPedicureHaystack(hay)) return 'pedicure';
  if (isManicureHaystack(hay)) return 'manicure';
  return 'other';
}

/** Classify a booked service for admin calendar styling. */
export function getBookingServiceKind(
  serviceName: string,
  catalog?: ServiceCatalogRow[] | null,
): BookingServiceKind {
  const trimmed = String(serviceName ?? '').trim();
  if (!trimmed) return 'other';

  const foldedName = accentFold(trimmed);
  if (catalog?.length) {
    const match = catalog.find((row) => {
      const rowName = String(row.name ?? '').trim();
      if (!rowName) return false;
      return rowName === trimmed || accentFold(rowName) === foldedName;
    });
    if (match) {
      return classifyHaystack(haystack(match.name ?? '', match.category));
    }
  }

  return classifyHaystack(foldedName);
}

export function adminBookingCardClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'border-sky-300 bg-sky-50/90 hover:border-sky-400 hover:shadow-md';
    case 'manicure':
      return 'border-amber-300 bg-amber-50/90 hover:border-amber-400 hover:shadow-md';
    default:
      return 'border-red-300 bg-red-50/90 hover:border-red-400 hover:shadow-md';
  }
}

export function adminBookingServiceTextClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'text-sm font-semibold text-sky-900';
    case 'manicure':
      return 'text-sm font-semibold text-amber-900';
    default:
      return 'text-sm font-semibold text-red-800';
  }
}
