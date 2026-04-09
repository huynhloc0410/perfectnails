'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminDashboardBaseFromPathname } from '../../lib/adminPublicPath';
import { SITE_BRAND_NAME } from '../../lib/siteBranding';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Login failed');
        return;
      }

      router.push(adminDashboardBaseFromPathname(pathname));
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-champagne-50 via-lux-cream/70 to-champagne-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-champagne-300/35 bg-white p-8 shadow-xl ring-1 ring-champagne-100/60">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-semibold text-lux-espresso">Admin Login</h1>
          <p className="text-lux-espressoLight/90">{SITE_BRAND_NAME} · Admin Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-lux-espresso">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-champagne-300/70 px-4 py-2 focus:border-champagne-500 focus:ring-champagne-500"
              placeholder="Admin password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-champagne-600 py-2.5 px-4 font-semibold text-white transition hover:bg-champagne-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-lux-espressoLight/80">
          Password is the <code className="rounded bg-lux-mist/80 px-1.5 py-0.5 text-xs text-lux-espresso">ADMIN_PASSWORD</code> variable on your host
          (e.g. Render → your service → <strong className="text-lux-espresso">Environment</strong>).
        </p>
      </div>
    </div>
  );
}
