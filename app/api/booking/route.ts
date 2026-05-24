import { NextResponse } from 'next/server';
import type { CmsBooking } from '@/lib/cmsSiteTypes';
import { isBookingWindowBlocked } from '@/lib/bookingBlocks';
import {
  isS3CmsConfigured,
  readCmsSiteFromS3,
  writeCmsSiteToS3,
} from '@/lib/s3CmsSite';
import type { CmsSmsJob } from '@/lib/cmsSiteTypes';
import { normalizePhoneE164 } from '@/lib/phone';
import { isSlotStartAllowedForBooking } from '@/lib/bookingLeadTime';
import { isNonBookableAddonService } from '@/lib/booking/serviceEmployeeMatch';
import { hasBookingCapacity } from '@/lib/booking/slotAvailability';
import { buildBookingReminderJobs, parseReminderHoursBefore } from '@/lib/bookingReminderJobs';
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
  /** Client-built instant (browser local wall clock → ISO). Required on UTC servers: `new Date(y,m,d,h,m)` here uses *server* local, not the guest’s. */
  const slotStartIso = (data.get('slotStartIso') as string | null)?.trim() ?? '';
  const smsConsent = data.get('smsConsent') === 'true';

  if (!smsConsent) {
    return NextResponse.json({ success: false, error: 'sms_consent_required' }, { status: 400 });
  }

  let bookingDate: Date;
  const parsedFromIso = slotStartIso ? new Date(slotStartIso) : null;
  if (parsedFromIso && Number.isFinite(parsedFromIso.getTime())) {
    bookingDate = parsedFromIso;
  } else {
    const [hours, minutes] = timeSlot.split(':');
    const [year, month, day] = date.split('-').map(Number);
    bookingDate = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }

  const [year, month, day] = date.split('-').map(Number);

  const nowForLead = new Date();
  if (!isSlotStartAllowedForBooking(bookingDate, nowForLead)) {
    return NextResponse.json({ success: false, error: 'min_notice' }, { status: 400 });
  }

  // In a real app, you'd save to a database
  // For now, we'll return the booking data and the client will save it
  const bookingDuration = parseInt(duration, 10) || 45;
  const booking: CmsBooking = {
    id: Date.now().toString(),
    name,
    phone,
    service,
    employee: employee || undefined,
    date: bookingDate.toISOString(),
    timeSlot,
    duration: bookingDuration,
  };

  const now = nowForLead;
  const phoneE164 = normalizePhoneE164(phone);
  const twilioReady = isTwilioConfigured();
  const confirmationBody = bookingConfirmationSms({
    name,
    isoDate: booking.date,
    service: booking.service,
  });

  const reminderJobs: CmsSmsJob[] = phoneE164
    ? buildBookingReminderJobs({
        bookingId: booking.id,
        phoneE164,
        appointmentAt: bookingDate,
        now,
      })
    : [];

  if (isS3CmsConfigured()) {
    try {
      const site = await readCmsSiteFromS3();
      if (site) {
        const svcRow = Array.isArray(site.services)
          ? site.services.find((s) => String((s as { name?: string }).name ?? '').trim() === String(service ?? '').trim())
          : undefined;
        if (!svcRow || isNonBookableAddonService(svcRow as { name: string; category?: string | null })) {
          return NextResponse.json({ success: false, error: 'invalid_service' }, { status: 400 });
        }

        const dateYmd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const empId = (employee || '').trim();
        const slotEndExclusive = new Date(bookingDate.getTime());
        slotEndExclusive.setMinutes(slotEndExclusive.getMinutes() + bookingDuration);
        const blocked = isBookingWindowBlocked({
          dateYmd,
          employeeId: empId,
          slotStartLocal: bookingDate,
          slotEndExclusiveLocal: slotEndExclusive,
          blocks: site.bookingBlocks,
        });
        if (blocked) {
          return NextResponse.json({ success: false, error: 'time_blocked' }, { status: 409 });
        }

        const siteEmployees = Array.isArray(site.employees)
          ? (site.employees as { id: string; role: string }[])
          : [];
        const siteServices = Array.isArray(site.services)
          ? (site.services as { name: string; category?: string | null; duration?: number }[])
          : [];

        if (
          !hasBookingCapacity({
            dateYmd,
            slotStartLocal: bookingDate,
            slotEndExclusiveLocal: slotEndExclusive,
            service: svcRow as { name: string; category?: string | null; duration?: number },
            employees: siteEmployees,
            bookings: site.bookings,
            services: siteServices,
            blocks: site.bookingBlocks ?? [],
            stylistId: empId || undefined,
          })
        ) {
          return NextResponse.json({ success: false, error: 'no_capacity' }, { status: 409 });
        }

        site.bookings = [...site.bookings, booking];
        if (reminderJobs.length > 0) {
          const existingIds = new Set((site.smsJobs ?? []).map((j) => j.id));
          const toAdd = reminderJobs.filter((j) => !existingIds.has(j.id));
          if (toAdd.length > 0) site.smsJobs = [...(site.smsJobs || []), ...toAdd];
        }
        await writeCmsSiteToS3(site);
      }
    } catch (e) {
      console.error('Append booking to S3 failed:', e);
    }
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
    } catch (e) {
      confirmation.sent = false;
      confirmation.error = e instanceof Error ? e.message : 'Failed to send confirmation SMS';
      console.error('Confirmation SMS failed:', e);
    }
  }

  return NextResponse.json({
    success: true,
    booking,
    sms: {
      confirmation,
      reminders: {
        scheduledCount: reminderJobs.length,
        jobs: reminderJobs.map((j) => ({
          id: j.id,
          sendAt: j.sendAt,
          hoursBefore: parseReminderHoursBefore(j.id) ?? undefined,
        })),
        persisted: Boolean(reminderJobs.length > 0 && isS3CmsConfigured()),
        reason:
          reminderJobs.length === 0
            ? !phoneE164
              ? 'invalid_phone'
              : 'all_reminder_times_in_past'
            : !isS3CmsConfigured()
              ? 'no_persistent_storage'
              : undefined,
      },
    },
  });
}
