import {
  isBookingWindowBlocked,
  intervalsOverlapExclusiveEnd,
  overlapsSalonWideBookingWindow,
  overlapsStylistScopedBookingWindow,
} from '@/lib/bookingBlocks';
import type { CmsBookingBlock } from '@/lib/cmsSiteTypes';
import { employeeCanPerformService } from '@/lib/booking/serviceEmployeeMatch';

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

/** Local start/end for a booking row (half-open end). */
export function parseBookingInterval(
  booking: SlotBooking,
  bufferMinutes = 0,
): BookingInterval | null {
  let base: Date;
  if (typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    const parsed = parseLocalDateYYYYMMDD(booking.date);
    if (!parsed) return null;
    base = parsed;
  } else {
    base = new Date(booking.date);
  }
  if (!Number.isFinite(base.getTime())) return null;

  const t = (booking.timeSlot || '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  let start: Date;
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0);
  } else {
    start = base;
  }

  const end = new Date(start.getTime());
  end.setMinutes(end.getMinutes() + bookingDurationMinutes(booking) + bufferMinutes);
  return { start, end };
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
    if (!interval) return false;
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
    if (!employee || !employeeCanPerformService(employee, svc)) return false;
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

  const candidate: SlotBooking = {
    id: '__candidate__',
    service: service.name,
    employee: stylist || undefined,
    date: dateYmd,
    timeSlot: `${String(slotStartLocal.getHours()).padStart(2, '0')}:${String(slotStartLocal.getMinutes()).padStart(2, '0')}`,
    duration: service.duration,
  };

  const ok = canAssignOverlappingBookings({
    bookings: [...overlapping, candidate],
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
