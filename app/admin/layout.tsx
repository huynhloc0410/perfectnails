'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check auth on login page
    if (pathname?.includes('/login')) return;

    const isAuthenticated = localStorage.getItem('admin-authenticated');
    if (!isAuthenticated && pathname === '/admin') {
      router.push('/admin/login');
    }
  }, [pathname, router]);

  // Don't render children if not authenticated (except on login page)
  if (pathname && !pathname.includes('/login') && pathname.startsWith('/admin')) {
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('admin-authenticated');
      if (!isAuthenticated) {
        return null;
      }
    }
  }

  return <>{children}</>;
}

