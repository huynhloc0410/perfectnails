const SALON_TIMEZONE = 'America/Phoenix';

/** Wall-clock hour/minute in salon timezone (Arizona). */
export function salonWallClock(dt: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(dt);

  let hours = 0;
  let minutes = 0;
  for (const p of parts) {
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
  }
  return { hours, minutes };
}

/** HH:MM for admin booking rows (matches cmsSite timeSlot). */
export function salonTimeSlotLabel(dt: Date): string {
  const { hours, minutes } = salonWallClock(dt);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
