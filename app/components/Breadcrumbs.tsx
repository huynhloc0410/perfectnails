'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="container mx-auto max-w-full px-4 py-3 sm:px-6 sm:py-4" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
        <li>
          <Link href="/" className="hover:text-champagne-700 transition">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 items-center">
            <span className="mx-1 text-gray-400 sm:mx-2" aria-hidden>/</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-champagne-700 transition">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

