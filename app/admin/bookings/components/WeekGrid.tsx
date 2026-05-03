'use client';

import {
  WEEKDAY_SHORT_MON_SAT,
  formatCardDate,
  getOpenWeekDayDatesMonSat,
  mondayOfWeek,
  startOfLocalDay,
  toISODateString,
} from '@/app/lib/adminWeekNav';
import { DayCard } from './DayCard';

type WeekGridProps = {
  /** Any date in the week to display (typically the selected day). */
  anchorDate: Date;
  selectedIso: string;
  bookingsBasePath: string;
  disablePastDates: boolean;
};

export function WeekGrid({
  anchorDate,
  selectedIso,
  bookingsBasePath,
  disablePastDates,
}: WeekGridProps) {
  const monday = mondayOfWeek(anchorDate);
  const days = getOpenWeekDayDatesMonSat(monday);
  const today = new Date();
  const todayIso = toISODateString(startOfLocalDay(today));

  return (
    <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
      <div className="flex min-w-[560px] gap-2 px-1 sm:grid sm:min-w-0 sm:grid-cols-6 sm:gap-3 sm:px-0">
        {days.map((d, i) => {
          const iso = toISODateString(d);
          const href = `${bookingsBasePath}?date=${encodeURIComponent(iso)}`;
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;
          const isPast = startOfLocalDay(d).getTime() < startOfLocalDay(today).getTime();

          return (
            <DayCard
              key={iso}
              dayName={WEEKDAY_SHORT_MON_SAT[i]}
              dateLabel={formatCardDate(d)}
              isoDate={iso}
              href={href}
              isSelected={isSelected}
              isToday={isToday}
              isPast={isPast}
              disablePast={disablePastDates}
            />
          );
        })}
      </div>
    </div>
  );
}
