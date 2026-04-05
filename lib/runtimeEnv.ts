/**
 * Read env at runtime using dynamic keys. Avoids Next/Webpack inlining
 * `process.env.ADMIN_PASSWORD` as undefined when it was missing during `next build`
 * (common when secrets exist only at runtime on Render).
 */
export function runtimeEnv(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === '') return undefined;
  return v;
}

export function adminPasswordFromEnv(): string | undefined {
  const v = runtimeEnv('ADMIN_PASSWORD');
  const t = v?.trim();
  return t || undefined;
}

/** JWT signing secret: ADMIN_SESSION_SECRET, or else ADMIN_PASSWORD */
export function adminSigningSecretFromEnv(): string | undefined {
  const s = runtimeEnv('ADMIN_SESSION_SECRET')?.trim();
  if (s) return s;
  return adminPasswordFromEnv();
}
