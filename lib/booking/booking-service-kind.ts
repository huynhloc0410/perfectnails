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

export function adminBookingKindLabel(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'Pedicure';
    case 'manicure':
      return 'Manicure';
    default:
      return 'Other service';
  }
}

/** Full card surface — strong fill + thick left stripe for quick scanning. */
export function adminBookingCardClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'border border-sky-500/60 border-l-[8px] border-l-sky-700 bg-sky-300/75 shadow-md ring-1 ring-sky-600/15 hover:bg-sky-300 hover:shadow-lg';
    case 'manicure':
      return 'border border-amber-500/60 border-l-[8px] border-l-amber-600 bg-amber-300/80 shadow-md ring-1 ring-amber-600/15 hover:bg-amber-300 hover:shadow-lg';
    default:
      return 'border border-red-500/60 border-l-[8px] border-l-red-700 bg-red-300/75 shadow-md ring-1 ring-red-600/15 hover:bg-red-300 hover:shadow-lg';
  }
}

export function adminBookingKindBadgeClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'bg-sky-800 text-sky-50';
    case 'manicure':
      return 'bg-amber-800 text-amber-50';
    default:
      return 'bg-red-800 text-red-50';
  }
}

export function adminBookingLegendSwatchClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'border border-sky-600 bg-sky-300';
    case 'manicure':
      return 'border border-amber-600 bg-amber-300';
    default:
      return 'border border-red-600 bg-red-300';
  }
}

export function adminBookingServiceTextClasses(kind: BookingServiceKind): string {
  switch (kind) {
    case 'pedicure':
      return 'text-sm font-bold text-sky-950';
    case 'manicure':
      return 'text-sm font-bold text-amber-950';
    default:
      return 'text-sm font-bold text-red-950';
  }
}

export function adminBookingDetailTextClasses(): string {
  return 'text-sm text-neutral-800';
}
