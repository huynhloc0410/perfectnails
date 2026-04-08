/**
 * Client-side helpers for admin URLs when using optional secret path
 * `/admin/<secret>` (see ADMIN_PATH_SECRET in middleware).
 */

export function adminDashboardBaseFromPathname(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  if (segs[0] !== 'admin') return '/admin';
  if (segs.length === 1) return '/admin';
  if (segs[1] === 'login') return '/admin';
  return `/admin/${segs[1]}`;
}

export function adminLoginPathFromPathname(pathname: string): string {
  const base = adminDashboardBaseFromPathname(pathname);
  return base === '/admin' ? '/admin/login' : `${base}/login`;
}
