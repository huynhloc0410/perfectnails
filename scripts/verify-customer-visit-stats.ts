/**
 * Sanity checks for per-appointment New/Old labels (run: npx tsx scripts/verify-customer-visit-stats.ts)
 */
import { attachCustomerVisitStats } from '../lib/booking/customerVisitStats';

const phone = '6025551234';

const bookings = attachCustomerVisitStats([
  {
    id: 'a',
    name: 'Maria',
    phone,
    service: 'Pedicure',
    date: '2026-01-10T19:00:00.000Z',
    timeSlot: '12:00',
    duration: 45,
  },
  {
    id: 'b',
    name: 'Maria G',
    phone,
    service: 'Manicure',
    date: '2026-02-15T19:00:00.000Z',
    timeSlot: '12:00',
    duration: 45,
  },
]);

function assert(label: string, ok: boolean) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) process.exitCode = 1;
}

const first = bookings[0].customerVisit;
const second = bookings[1].customerVisit;

assert('first visit is New', first?.isReturning === false);
assert('second visit is Old', second?.isReturning === true);
assert('names unchanged', bookings[0].name === 'Maria' && bookings[1].name === 'Maria G');
assert('visit count is 2', second?.visitCount === 2);

console.log(process.exitCode === 1 ? '\nSome checks failed.' : '\nAll checks passed.');
