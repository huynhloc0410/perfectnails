'use client';

import Link from 'next/link';

type DayCardProps = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  href: string;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  disablePast: boolean;
};

export function DayCard({
  dayName,
  dateLabel,
  isoDate,
  href,
  isSelected,
  isToday,
  isPast,
  disablePast,
}: DayCardProps) {
  const blocked = disablePast && isPast;

  const base =
    'relative flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition duration-200 ease-out sm:min-h-[6.5rem]';
  const interactive =
    'hover:z-10 hover:scale-[1.02] hover:shadow-lg hover:border-champagne-400/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-500 active:scale-[0.99]';
  const selected = 'border-champagne-500 bg-champagne-50 shadow-md ring-1 ring-champagne-500/30';
  const todayStyle = 'border-champagne-400 bg-gradient-to-b from-champagne-100/90 to-champagne-50 ring-2 ring-champagne-400/50';
  const defaultStyle = 'border-gray-200 bg-white shadow-sm';
  const pastBlocked = 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-75';

  const className = [
    base,
    blocked ? pastBlocked : isSelected ? selected : isToday ? todayStyle : defaultStyle,
    !blocked ? interactive : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClass =
    isToday && !blocked
      ? 'rounded-full bg-champagne-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white'
      : 'text-[10px] font-medium uppercase tracking-wide text-champagne-700';

  if (blocked) {
    return (
      <div
        role="group"
        aria-label={`${dayName} ${dateLabel}`}
        aria-disabled
        className={className}
      >
        {isToday && (
          <span className={`absolute right-2 top-2 ${labelClass}`}>Today</span>
        )}
        <span className="text-sm font-semibold text-gray-500">{dayName}</span>
        <span className="mt-1 text-xs text-gray-400">{dateLabel}</span>
        <span className="sr-only">Past date — not selectable</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      aria-current={isSelected ? 'date' : undefined}
      aria-label={`${dayName}, ${dateLabel}. ${isToday ? 'Today. ' : ''}View bookings`}
    >
      {isToday && (
        <span className={`absolute right-2 top-2 ${labelClass}`}>Today</span>
      )}
      <span
        className={`text-sm font-semibold ${
          isSelected || isToday ? 'text-neutral-900' : 'text-neutral-800'
        }`}
      >
        {dayName}
      </span>
      <time className="mt-1 block text-xs text-neutral-600" dateTime={isoDate}>
        {dateLabel}
      </time>
    </Link>
  );
}
