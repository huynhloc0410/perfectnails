'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SiteLogoLink from './SiteLogoLink';

const navLinks: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/booking', label: 'Booking' },
  { href: '/contact', label: 'Contact' },
];

function navItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fallback before nav is measured (px); keep ≥ row height with footer-sized logo */
const MENU_TOP_FALLBACK_PX = 92;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [menuTopPx, setMenuTopPx] = useState(MENU_TOP_FALLBACK_PX);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const updateMenuTop = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setMenuTopPx(Math.round(el.getBoundingClientRect().bottom));
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuTop();
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    vv?.addEventListener('resize', updateMenuTop);
    vv?.addEventListener('scroll', updateMenuTop);
    window.addEventListener('resize', updateMenuTop);
    window.addEventListener('scroll', updateMenuTop, true);
    const id = window.requestAnimationFrame(updateMenuTop);
    return () => {
      window.cancelAnimationFrame(id);
      vv?.removeEventListener('resize', updateMenuTop);
      vv?.removeEventListener('scroll', updateMenuTop);
      window.removeEventListener('resize', updateMenuTop);
      window.removeEventListener('scroll', updateMenuTop, true);
    };
  }, [open, updateMenuTop]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const mobileMenu =
    open && mounted
      ? createPortal(
      <>
        <button
          type="button"
          className="fixed left-0 right-0 bottom-0 z-[298] bg-neutral-950/50 md:hidden"
          style={{ top: menuTopPx }}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <div
          id="mobile-nav-panel"
          role="navigation"
          aria-label="Mobile menu"
          className="fixed left-0 right-0 bottom-0 z-[299] flex min-h-0 flex-col border-t border-lux-line/40 bg-lux-paper shadow-[0_-8px_32px_rgba(42,36,28,0.08)] md:hidden"
          style={{ top: menuTopPx }}
        >
          <p className="shrink-0 border-b border-champagne-200/80 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-champagne-800 sm:px-6">
            Menu
          </p>
          <ul className="container mx-auto flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-6 sm:py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
            {navLinks.map(({ href, label }) => {
              const active = navItemActive(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded-xl border border-transparent px-4 py-4 text-[17px] font-semibold text-gray-900 transition active:scale-[0.99] ${
                      active
                        ? 'border-champagne-400/70 bg-champagne-100 text-neutral-950'
                        : 'text-gray-900 hover:border-champagne-200 hover:bg-champagne-50 hover:text-champagne-950'
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
      </>,
      document.body
    )
      : null;

  return (
    <header className="font-nav sticky top-0 z-[300] w-full border-b border-lux-line/35 bg-lux-paper/92 shadow-[0_1px_0_rgba(42,36,28,0.06)] backdrop-blur-md">
      <div className="relative">
        <nav
          ref={navRef}
          className="relative z-[320] container mx-auto flex max-w-6xl items-center gap-3 bg-transparent px-4 py-3 sm:px-6 sm:py-3.5"
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

          <SiteLogoLink variant="header" />

          {/* Mobile: space between logo (after menu) and right balance column; desktop: unused */}
          <div className="min-h-0 flex-1 md:hidden" aria-hidden />

          <ul className="hidden flex-1 items-center justify-center gap-0.5 lg:gap-1 md:flex">
            {navLinks.map(({ href, label }) => {
              const active = navItemActive(href, pathname);
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

        {mobileMenu}
      </div>
    </header>
  );
}
