'use client';

type WeeklyHeaderProps = {
  weekRangeLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

export function WeeklyHeader({ weekRangeLabel, onPrevWeek, onNextWeek, onToday }: WeeklyHeaderProps) {
  const btn =
    'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-champagne-300 hover:bg-champagne-50 hover:text-champagne-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-500 active:scale-[0.98]';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Week of</p>
        <p className="truncate text-lg font-semibold text-neutral-900 sm:text-xl">{weekRangeLabel}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button type="button" onClick={onPrevWeek} className={btn}>
          ← Previous week
        </button>
        <button type="button" onClick={onToday} className={btn}>
          Today
        </button>
        <button type="button" onClick={onNextWeek} className={btn}>
          Next week →
        </button>
      </div>
    </div>
  );
}
