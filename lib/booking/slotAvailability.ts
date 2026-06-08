import {
  isBookingWindowBlocked,
  intervalsOverlapExclusiveEnd,
  overlapsSalonWideBookingWindow,
  overlapsStylistScopedBookingWindow,
} from '@/lib/bookingBlocks';
import type { CmsBookingBlock } from '@/lib/cmsSiteTypes';
import {
  bookingServiceStaffFamily,
  employeeCanPerformService,
} from '@/lib/booking/serviceEmployeeMatch';

export type SlotBooking = {
  id: string;
  service: string;
  employee?: string | null;
  date: string;
  timeSlot: string;
  duration?: number;
};

export type SlotEmployee = {
  id: string;
  role: string;
};

export type SlotService = {
  name: string;
  category?: string | null;
  duration?: number;
};

export type SlotState = 'open' | 'salon_blocked' | 'staff_blocked' | 'fully_booked';

type BookingInterval = { start: Date; end: Date };

function parseLocalDateYYYYMMDD(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bookingDurationMinutes(booking: SlotBooking): number {
  const raw = booking.duration;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

function calendarPartsForBooking(booking: SlotBooking): { year: number; month: number; day: number } | null {
  if (typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    const [year, month, day] = booking.date.split('-').map(Number);
    return { year, month, day };
  }
  const base = new Date(booking.date);
  if (!Number.isFinite(base.getTime())) return null;
  return { year: base.getFullYear(), month: base.getMonth() + 1, day: base.getDate() };
}

/** Local start/end for a booking row (half-open end). Uses the booking's real calendar day + timeSlot. */
export function parseBookingInterval(booking: SlotBooking, bufferMinutes = 0): BookingInterval | null {
  const parts = calendarPartsForBooking(booking);
  if (!parts) return null;

  const t = (booking.timeSlot || '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  let start: Date;
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    start = new Date(parts.year, parts.month - 1, parts.day, hh, mm, 0, 0);
  } else {
    const base = new Date(booking.date);
    if (!Number.isFinite(base.getTime())) return null;
    start = base;
  }

  const end = new Date(start.getTime());
  end.setMinutes(end.getMinutes() + bookingDurationMinutes(booking) + bufferMinutes);
  return { start, end };
}

/**
 * Unassigned bookings only compete when they share a staff family with the candidate
 * (Water vs Powder). Unassigned Pedicure does not reduce Acrylic capacity — Water staff
 * absorb those; Everything stays available for Acrylic unless already assigned/blocked.
 */
export function unassignedBookingCompetesForService(
  booking: SlotBooking,
  candidateService: SlotService,
  employees: SlotEmployee[],
  services: SlotService[],
): boolean {
  const bookingService = resolveService(booking.service, services);
  const bookingFamily = bookingServiceStaffFamily(bookingService);
  const candidateFamily = bookingServiceStaffFamily(candidateService);

  if (
    bookingFamily !== null &&
    candidateFamily !== null &&
    bookingFamily !== candidateFamily
  ) {
    return false;
  }

  const eligibleForCandidate = employees.filter((e) => employeeCanPerformService(e, candidateService));
  const eligibleForBooking = employees.filter((e) => employeeCanPerformService(e, bookingService));
  return eligibleForCandidate.some((c) => eligibleForBooking.some((b) => b.id === c.id));
}

/**
 * Overlapping bookings that reduce capacity for `candidateService`.
 * - Assigned: only if that stylist could perform the service being booked (Water pedicure
 *   does not block Acrylic on Powder staff).
 * - Unassigned: only if it competes for the same staff pool (e.g. another Acrylic on Powder).
 */
export function bookingsForServiceCapacity(
  overlapping: SlotBooking[],
  candidateService: SlotService,
  employees: SlotEmployee[],
  services: SlotService[],
): SlotBooking[] {
  return overlapping.filter((booking) => {
    const empId = String(booking.employee ?? '').trim();
    if (empId) {
      const employee = employees.find((e) => e.id === empId);
      if (!employee) return false;
      return employeeCanPerformService(employee, candidateService);
    }
    return unassignedBookingCompetesForService(booking, candidateService, employees, services);
  });
}

function intervalsOverlap(a: BookingInterval, b: BookingInterval): boolean {
  return intervalsOverlapExclusiveEnd(
    a.start.getTime(),
    a.end.getTime(),
    b.start.getTime(),
    b.end.getTime(),
  );
}

function resolveService(serviceName: string, catalog: SlotService[]): SlotService {
  const trimmed = String(serviceName ?? '').trim();
  const match = catalog.find((s) => String(s.name ?? '').trim() === trimmed);
  return match ?? { name: trimmed, category: '' };
}

function employeeBusyIntervals(
  employeeId: string,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): BookingInterval[] {
  return intervalsByEmployee.get(employeeId) ?? [];
}

function addBusyInterval(
  employeeId: string,
  interval: BookingInterval,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): void {
  const list = intervalsByEmployee.get(employeeId) ?? [];
  list.push(interval);
  intervalsByEmployee.set(employeeId, list);
}

function isEmployeeFreeForInterval(
  employeeId: string,
  interval: BookingInterval,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): boolean {
  return !employeeBusyIntervals(employeeId, intervalsByEmployee).some((busy) =>
    intervalsOverlap(busy, interval),
  );
}

/** Prefer Water/Powder specialists over Everything when simulating unassigned placement. */
function specialistFirstRank(employee: SlotEmployee, service: SlotService): number {
  const role = String(employee.role ?? '')
    .trim()
    .toLowerCase();
  const family = bookingServiceStaffFamily(service);
  if (family === 'water') {
    if (role === 'water') return 0;
    if (role === 'everything') return 1;
    return 2;
  }
  if (family === 'powder') {
    if (role === 'powder' || role === 'acrylic' || role === 'power') return 0;
    if (role === 'everything') return 1;
    return 2;
  }
  if (role === 'everything') return 1;
  return 0;
}

/**
 * Greedy assignment: assigned bookings lock their stylist; each unassigned booking
 * must map to a distinct qualified, unblocked employee for its window.
 */
export function canAssignOverlappingBookings(opts: {
  bookings: SlotBooking[];
  employees: SlotEmployee[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  dateYmd: string;
  bufferMinutes?: number;
}): boolean {
  const { bookings, employees, services, blocks, dateYmd, bufferMinutes = 0 } = opts;
  if (bookings.length === 0) return true;

  const intervalsByEmployee = new Map<string, BookingInterval[]>();
  const assigned: Array<{ booking: SlotBooking; interval: BookingInterval }> = [];
  const unassigned: Array<{ booking: SlotBooking; interval: BookingInterval }> = [];

  for (const booking of bookings) {
    const interval = parseBookingInterval(booking, bufferMinutes);
    if (!interval) continue;
    if (localDayKey(interval.start) !== dateYmd) continue;

    const empId = String(booking.employee ?? '').trim();
    if (empId) {
      assigned.push({ booking, interval });
    } else {
      unassigned.push({ booking, interval });
    }
  }

  for (const { booking, interval } of assigned) {
    const empId = String(booking.employee ?? '').trim();
    const svc = resolveService(booking.service, services);
    const employee = employees.find((e) => e.id === empId);
    // Orphan / legacy rows should not block the whole calendar.
    if (!employee || !employeeCanPerformService(employee, svc)) continue;
    if (
      isBookingWindowBlocked({
        dateYmd,
        employeeId: empId,
        slotStartLocal: interval.start,
        slotEndExclusiveLocal: interval.end,
        blocks,
      })
    ) {
      return false;
    }
    if (!isEmployeeFreeForInterval(empId, interval, intervalsByEmployee)) return false;
    addBusyInterval(empId, interval, intervalsByEmployee);
  }

  unassigned.sort((a, b) => a.interval.start.getTime() - b.interval.start.getTime());

  for (const { booking, interval } of unassigned) {
    const svc = resolveService(booking.service, services);
    const candidates = employees.filter((employee) => {
      if (!employeeCanPerformService(employee, svc)) return false;
      if (
        isBookingWindowBlocked({
          dateYmd,
          employeeId: employee.id,
          slotStartLocal: interval.start,
          slotEndExclusiveLocal: interval.end,
          blocks,
        })
      ) {
        return false;
      }
      return isEmployeeFreeForInterval(employee.id, interval, intervalsByEmployee);
    });

    if (candidates.length === 0) return false;
    candidates.sort(
      (a, b) => specialistFirstRank(a, svc) - specialistFirstRank(b, svc),
    );
    addBusyInterval(candidates[0].id, interval, intervalsByEmployee);
  }

  return true;
}

export function bookingsOverlappingWindow(
  bookings: SlotBooking[],
  slotStart: Date,
  slotEndExclusive: Date,
  dateYmd: string,
  bufferMinutes = 0,
): SlotBooking[] {
  const window: BookingInterval = { start: slotStart, end: slotEndExclusive };
  return bookings.filter((booking) => {
    const interval = parseBookingInterval(booking, bufferMinutes);
    if (!interval) return false;
    if (localDayKey(interval.start) !== dateYmd) return false;
    return intervalsOverlap(interval, window);
  });
}

export function evaluateSlotState(opts: {
  dateYmd: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  service: SlotService;
  employees: SlotEmployee[];
  bookings: SlotBooking[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  bufferMinutes?: number;
  /** When set, the guest chose a specific stylist (stored on the booking). */
  stylistId?: string;
  /** Exclude an existing booking id when re-validating (future edits). */
  excludeBookingId?: string;
}): SlotState {
  const {
    dateYmd,
    slotStartLocal,
    slotEndExclusiveLocal,
    service,
    employees,
    bookings,
    services,
    blocks,
    bufferMinutes = 0,
    stylistId,
    excludeBookingId,
  } = opts;

  if (
    overlapsSalonWideBookingWindow({
      dateYmd,
      slotStartLocal,
      slotEndExclusiveLocal,
      blocks,
    })
  ) {
    return 'salon_blocked';
  }

  const stylist = stylistId?.trim() ?? '';
  if (stylist) {
    const employee = employees.find((e) => e.id === stylist);
    if (!employee || !employeeCanPerformService(employee, service)) {
      return 'fully_booked';
    }
    if (
      overlapsStylistScopedBookingWindow({
        dateYmd,
        employeeId: stylist,
        slotStartLocal,
        slotEndExclusiveLocal,
        blocks,
      })
    ) {
      return 'staff_blocked';
    }
  }

  const overlapping = bookingsOverlappingWindow(
    bookings.filter((b) => b.id !== excludeBookingId),
    slotStartLocal,
    slotEndExclusiveLocal,
    dateYmd,
    bufferMinutes,
  );

  const capacityBookings = bookingsForServiceCapacity(
    overlapping,
    service,
    employees,
    services,
  );

  const candidate: SlotBooking = {
    id: '__candidate__',
    service: service.name,
    employee: stylist || undefined,
    date: dateYmd,
    timeSlot: `${String(slotStartLocal.getHours()).padStart(2, '0')}:${String(slotStartLocal.getMinutes()).padStart(2, '0')}`,
    duration: service.duration,
  };

  const ok = canAssignOverlappingBookings({
    bookings: [...capacityBookings, candidate],
    employees,
    services,
    blocks,
    dateYmd,
    bufferMinutes,
  });

  return ok ? 'open' : 'fully_booked';
}

/** True when a new booking may be saved (server + client submit). */
export function hasBookingCapacity(opts: {
  dateYmd: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  service: SlotService;
  employees: SlotEmployee[];
  bookings: SlotBooking[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  bufferMinutes?: number;
  stylistId?: string;
  excludeBookingId?: string;
}): boolean {
  return (
    evaluateSlotState(opts) === 'open'
  );
}
