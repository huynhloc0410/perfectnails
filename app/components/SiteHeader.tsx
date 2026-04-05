'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navLinks: { href: string; label: string; admin?: boolean }[] = [
  { href: '/', label: 'Home' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/booking', label: 'Booking' },
  { href: '/contact', label: 'Contact' },
  { href: '/admin', label: 'Admin', admin: true },
];

function navItemActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname.startsWith('/admin');
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="font-nav sticky top-0 z-50 w-full border-b border-champagne-400/45 bg-white/90 shadow-[0_1px_0_rgba(118,93,34,0.2)] backdrop-blur-md">
      <div className="relative">
        <nav
          className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-800 transition hover:bg-champagne-50 hover:text-champagne-800 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <Link
            href="/"
            className="font-display min-w-0 flex-1 text-center text-[1.35rem] font-semibold leading-tight tracking-tight text-neutral-900 md:flex-none md:text-left md:text-[1.5rem]"
          >
            <span className="site-brand-gradient">Perfect Nails</span>
          </Link>

          <ul className="hidden flex-1 items-center justify-center gap-0.5 lg:gap-1 md:flex">
            {navLinks.map(({ href, label, admin }) => {
              const active = navItemActive(href, pathname);
              if (admin) {
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`ml-2 rounded-lg px-2.5 py-1.5 text-sm transition lg:ml-3 ${
                        active
                          ? 'font-medium text-gray-800'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={href}>
                  <Link
                    href={href}
                    data-active={active ? 'true' : 'false'}
                    className="nav-link-pill text-[15px] font-semibold text-gray-800 lg:text-[0.97rem]"
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="w-11 shrink-0 md:hidden" aria-hidden />
        </nav>

        <div
          id="mobile-nav-panel"
          className={`absolute left-0 right-0 top-full z-50 max-h-[min(75vh,calc(100dvh-3.5rem))] overflow-y-auto border-t border-champagne-400/40 bg-white/98 shadow-lg backdrop-blur-md md:hidden ${
            open ? 'block' : 'hidden'
          }`}
          aria-hidden={!open}
        >
          <ul className="container mx-auto flex flex-col gap-0.5 px-4 py-3 sm:px-6">
            {navLinks.map(({ href, label, admin }) => {
              const active = navItemActive(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded-xl px-3 py-3.5 text-[17px] font-semibold transition ${
                      admin
                        ? active
                          ? 'bg-gray-100 text-gray-800'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        : active
                          ? 'bg-champagne-100/90 text-neutral-900'
                          : 'text-gray-800 hover:bg-champagne-50 hover:text-champagne-800'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </header>
  );
}
