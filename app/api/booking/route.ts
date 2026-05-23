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
  const confirmationBody = bookingConfirmationSms({ name, isoDate: booking.date });

  const reminderAt = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000);
  const shouldScheduleReminder = reminderAt.getTime() > now.getTime();
  const reminderJob: CmsSmsJob | null =
    phoneE164 && shouldScheduleReminder
      ? {
          id: `${booking.id}:reminder`,
          kind: 'booking_reminder',
          status: 'pending',
          to: phoneE164,
          bookingId: booking.id,
          sendAt: reminderAt.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }
      : null;

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

        site.bookings = [...site.bookings, booking];
        if (reminderJob) {
          const existing = site.smsJobs?.some((j) => j.id === reminderJob.id);
          if (!existing) site.smsJobs = [...(site.smsJobs || []), reminderJob];
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
      reminder: {
        scheduled: Boolean(reminderJob && isS3CmsConfigured()),
        sendAt: reminderJob?.sendAt,
        reason:
          !reminderJob
            ? !phoneE164
              ? 'invalid_phone'
              : 'reminder_time_in_past'
            : !isS3CmsConfigured()
              ? 'no_persistent_storage'
              : undefined,
      },
    },
  });
}
