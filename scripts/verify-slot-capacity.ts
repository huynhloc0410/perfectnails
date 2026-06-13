/**
 * Quick sanity checks for unified slot capacity (run: npx tsx scripts/verify-slot-capacity.ts)
 */
import { hasBookingCapacity } from '../lib/booking/slotAvailability';
import type { SlotBooking, SlotEmployee, SlotService } from '../lib/booking/slotAvailability';

const dateYmd = '2026-06-05';
const slotStart = new Date(2026, 5, 5, 12, 0, 0, 0);
const slotEnd = new Date(2026, 5, 5, 13, 0, 0, 0);

const employees: SlotEmployee[] = [
  { id: 'w1', role: 'Water' },
  { id: 'w2', role: 'Water' },
  { id: 'e1', role: 'Everything' },
  { id: 'e2', role: 'Everything' },
];

const services: SlotService[] = [
  { name: 'Pedicure', category: 'Pedicure', duration: 45 },
  { name: 'Manicure', category: 'Manicure', duration: 45 },
  { name: 'Gel X', category: 'Gel X', duration: 60 },
  { name: 'Acrylic', category: 'Acrylic', duration: 60 },
];

function booking(id: string, service: string, employee?: string): SlotBooking {
  return {
    id,
    service,
    employee,
    date: dateYmd,
    timeSlot: '12:00',
    duration: services.find((s) => s.name === service)?.duration,
  };
}

function check(label: string, serviceName: string, existing: SlotBooking[], expectOpen: boolean) {
  const service = services.find((s) => s.name === serviceName)!;
  const open = hasBookingCapacity({
    dateYmd,
    slotStartLocal: slotStart,
    slotEndExclusiveLocal: slotEnd,
    service,
    employees,
    bookings: existing,
    services,
    blocks: [],
  });
  const ok = open === expectOpen;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label} → ${open} (expected ${expectOpen ? 'open' : 'closed'})`);
  if (!ok) process.exitCode = 1;
}

// Ex1: 3 pedi + 1 gel x → fully booked for both families
const ex1 = [
  booking('1', 'Pedicure'),
  booking('2', 'Pedicure'),
  booking('3', 'Pedicure'),
  booking('4', 'Gel X'),
];
check('Ex1 new Pedicure', 'Pedicure', ex1, false);
check('Ex1 new Gel X', 'Gel X', ex1, false);

// Ex2: 2 gel x + 1 pedi → water ok, powder blocked
const ex2 = [booking('1', 'Gel X'), booking('2', 'Gel X'), booking('3', 'Pedicure')];
check('Ex2 new Pedicure', 'Pedicure', ex2, true);
check('Ex2 new Gel X', 'Gel X', ex2, false);

// Ex3: acrylic on Leo + 2 mani → still room for pedi
const ex3 = [
  booking('1', 'Acrylic', 'e1'),
  booking('2', 'Manicure'),
  booking('3', 'Manicure'),
];
check('Ex3 new Pedicure', 'Pedicure', ex3, true);
check('Ex3 new Gel X', 'Gel X', ex3, true);

console.log(process.exitCode === 1 ? '\nSome checks failed.' : '\nAll checks passed.');
