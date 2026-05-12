/**
 * Online booking: which staff roles can take which CMS services.
 *
 * Roles (stored on each employee):
 * - Water → manicure / pedicure (and natural-nail table work in that family).
 * - Powder → Gel X, builder gel, acrylic (hard-gel / acrylic sculpting line).
 * - Everything → all bookable services.
 *
 * "Power" in admin typos is treated as Powder. Roles are matched case-insensitively.
 *
 * Additional / add-on line items (sub-services) are not bookable online — see `isNonBookableAddonService`.
 */

type ServiceLike = { category?: string | null; name: string };
type EmployeeLike = { role: string };

/** Strip common accents so "Pédicure" still matches pedicure rules. */
export function accentFold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeRole(role: string): string {
  const r = String(role ?? '')
    .trim()
    .toLowerCase();
  if (r === 'power') return 'powder';
  return r;
}

/**
 * Sub-services / "Additional …" rows: sold with a main service, not booked alone online.
 */
export function isNonBookableAddonService(service: ServiceLike): boolean {
  const cat = accentFold(String(service.category ?? '').trim());
  const name = accentFold(String(service.name ?? '').trim());

  if (!name && !cat) return false;

  // Category bucket used only for add-ons / extras
  if (/^additional(\s+services?)?$/i.test(cat)) return true;
  if (/^add[-\s]?ons?$/i.test(cat) || /^extras?$/i.test(cat)) return true;
  if (cat.startsWith('additional') && !/\b(manicure|pedicure)\b/.test(cat)) return true;

  // Line items named like "Additional …" / "Additional service …"
  if (name.startsWith('additional ') || name.startsWith('additional service')) return true;

  return false;
}

/**
 * Whether this employee may be offered for the selected service (bookable services only).
 */
export function employeeCanPerformService(employee: EmployeeLike, service: ServiceLike): boolean {
  if (isNonBookableAddonService(service)) return false;

  const role = normalizeRole(employee.role);
  const cat = accentFold(String(service.category ?? '').trim());
  const name = accentFold(String(service.name ?? '').trim());
  const hay = `${cat} ${name}`;

  if (role === 'everything') return true;

  if (role === 'water') {
    if (hay.includes('manicure') || hay.includes('pedicure')) return true;
    if (/\bmani\b/.test(hay) || /\bpedi\b/.test(hay)) return true;
    if (cat.includes('manicure') || cat.includes('pedicure')) return true;
    return false;
  }

  if (role === 'powder') {
    if (hay.includes('acrylic')) return true;
    if (hay.includes('gel x') || hay.includes('gel-x')) return true;
    if (hay.includes('gel builder') || hay.includes('builder gel')) return true;
    if (/\bdip\b/.test(hay) && /\b(powder|nail)\b/.test(hay)) return true;
    if (/\bpolygel\b/.test(hay)) return true;
    return false;
  }

  return false;
}
