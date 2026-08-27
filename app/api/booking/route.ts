import { NextResponse } from 'next/server';
import type { CmsBooking } from '@/lib/cmsSiteTypes';
import { loadBookingSiteSnapshot } from '@/lib/booking/bookingSiteLoader';
import { isBookingWindowBlocked } from '@/lib/bookingBlocks';
import {
  createOnlineBookingInPostgres,
  recordBookingConfirmationSms,
} from '@/lib/db/createOnlineBooking';
import { isDatabaseConfigured, isPublicBookingWriteToPostgres } from '@/lib/db/config';
import { normalizePhoneE164 } from '@/lib/phone';
import { isSlotStartAllowedForBooking } from '@/lib/bookingLeadTime';
import { isNonBookableAddonService } from '@/lib/booking/serviceEmployeeMatch';
import { hasBookingCapacity } from '@/lib/booking/slotAvailability';
import { isWithinBusinessHours } from '@/lib/booking/businessHours';
import { salonDateTimeToUtc } from '@/lib/db/timezone';
import { bookingConfirmationSms } from '@/lib/smsTemplates';
import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export async function POST(req: Request) {
  const data = await req.formData();
  const name = data.get("name") as string;
  const phone = data.get("phone") as string;
  const service = data.get("service") as string;
  const employee = data.get("employee") as string;
  const date = data.get("date") as string;
  const timeSlot = data.get("timeSlot") as string;
  const duration = data.get("duration") as string;
  const notesRaw = (data.get('notes') as string | null)?.trim() ?? '';
  const notes = notesRaw.length > 500 ? notesRaw.slice(0, 500) : notesRaw;
  const slotStartIso = (data.get('slotStartIso') as string | null)?.trim() ?? '';
  const smsConsent = data.get('smsConsent') === 'true';

  if (!smsConsent) {
    return NextResponse.json({ success: false, error: 'sms_consent_required' }, { status: 400 });
  }

  const [year, month, day] = date.split('-').map(Number);
  const dateYmd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  /**
   * Appointment wall clock is always America/Phoenix (salon), never the booker's browser TZ.
   * slotStartIso is only a legacy client hint for lead-time fallback if date/timeSlot are malformed.
   */
  const slotStartSalon =
    salonDateTimeToUtc(dateYmd, timeSlot) ??
    (() => {
      const parsedFromIso = slotStartIso ? new Date(slotStartIso) : null;
      return parsedFromIso && Number.isFinite(parsedFromIso.getTime()) ? parsedFromIso : null;
    })();

  if (!slotStartSalon) {
    return NextResponse.json({ success: false, error: 'invalid_datetime' }, { status: 400 });
  }

  const nowForLead = new Date();
  if (!isSlotStartAllowedForBooking(slotStartSalon, nowForLead)) {
    return NextResponse.json({ success: false, error: 'min_notice' }, { status: 400 });
  }

  const bookingDuration = parseInt(duration, 10) || 45;
  if (!isWithinBusinessHours(dateYmd, slotStartSalon, bookingDuration)) {
    return NextResponse.json({ success: false, error: 'outside_hours' }, { status: 400 });
  }

  const booking: CmsBooking = {
    id: Date.now().toString(),
    name,
    phone,
    service,
    employee: employee || undefined,
    date: slotStartSalon.toISOString(),
    timeSlot,
    duration: bookingDuration,
    ...(notes ? { notes } : {}),
  };

  const phoneE164 = normalizePhoneE164(phone);
  const twilioReady = isTwilioConfigured();
  const confirmationBody = bookingConfirmationSms({
    name,
    isoDate: booking.date,
    service: booking.service,
  });

  const snapshot = await loadBookingSiteSnapshot();

  if (!snapshot) {
    return NextResponse.json({ success: false, error: 'booking_unavailable' }, { status: 503 });
  }

  const svcRow = snapshot.services.find(
    (s) => String(s.name ?? '').trim() === String(service ?? '').trim()
  );
  if (!svcRow || isNonBookableAddonService(svcRow)) {
    return NextResponse.json({ success: false, error: 'invalid_service' }, { status: 400 });
  }

  const empId = (employee || '').trim();
  const slotEndExclusive = new Date(slotStartSalon.getTime());
  slotEndExclusive.setMinutes(slotEndExclusive.getMinutes() + bookingDuration);

  const blocked = isBookingWindowBlocked({
    dateYmd,
    employeeId: empId,
    slotStartLocal: slotStartSalon,
    slotEndExclusiveLocal: slotEndExclusive,
    blocks: snapshot.bookingBlocks,
  });
  if (blocked) {
    return NextResponse.json({ success: false, error: 'time_blocked' }, { status: 409 });
  }

  if (
    !hasBookingCapacity({
      dateYmd,
      slotStartLocal: slotStartSalon,
      slotEndExclusiveLocal: slotEndExclusive,
      service: svcRow,
      employees: snapshot.employees,
      bookings: snapshot.bookings,
      services: snapshot.services,
      blocks: snapshot.bookingBlocks,
      stylistId: empId || undefined,
    })
  ) {
    return NextResponse.json({ success: false, error: 'no_capacity' }, { status: 409 });
  }

  const writeToPostgres = isPublicBookingWriteToPostgres();
  if (!writeToPostgres || !isDatabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'booking_unavailable' }, { status: 503 });
  }

  try {
    await createOnlineBookingInPostgres({
      booking,
      phoneE164,
      serviceLegacyId: svcRow.id,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('createOnlineBookingInPostgres failed:', detail, e);
    return NextResponse.json({ success: false, error: 'save_failed' }, { status: 502 });
  }

  let confirmation: { attempted: boolean; sent: boolean; messageSid?: string; error?: string } = {
    attempted: false,
    sent: false,
  };

  if (twilioReady && phoneE164) {
    confirmation.attempted = true;
    try {
      const out = await sendSms({ to: phoneE164, body: confirmationBody });
      confirmation.sent = true;
      confirmation.messageSid = out.sid;
      try {
        await recordBookingConfirmationSms({
          bookingLegacyId: booking.id,
          phoneE164,
          confirmationBody,
          confirmationSid: out.sid,
        });
      } catch (e) {
        console.error('recordBookingConfirmationSms failed:', e);
      }
    } catch (e) {
      confirmation.sent = false;
      confirmation.error = e instanceof Error ? e.message : 'Failed to send confirmation SMS';
      console.error('Confirmation SMS failed:', e);
    }
  }

  return NextResponse.json({
    success: true,
    booking,
    validationSource: snapshot.source,
    writeSource: 'postgres' as const,
    sms: {
      confirmation,
      reminders: {
        scheduledCount: 0,
        jobs: [],
        persisted: false,
        reason: 'manual_reminders',
      },
    },
  });
}
