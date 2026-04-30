import { NextResponse } from 'next/server';
import type { CmsBooking } from '@/lib/cmsSiteTypes';
import {
  isS3CmsConfigured,
  readCmsSiteFromS3,
  writeCmsSiteToS3,
} from '@/lib/s3CmsSite';
import type { CmsSmsJob } from '@/lib/cmsSiteTypes';
import { normalizePhoneE164 } from '@/lib/phone';
// Phone confirmation SMS temporarily disabled:
// import { bookingConfirmationSms } from '@/lib/smsTemplates';
// import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export async function POST(req: Request) {
  const data = await req.formData();
  const name = data.get("name") as string;
  const phone = data.get("phone") as string;
  const service = data.get("service") as string;
  const employee = data.get("employee") as string;
  const date = data.get("date") as string;
  const timeSlot = data.get("timeSlot") as string;
  const duration = data.get("duration") as string;

  // Combine date and time slot into a single datetime (parse date in local timezone)
  const [hours, minutes] = timeSlot.split(':');
  const [year, month, day] = date.split('-').map(Number);
  const bookingDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);

  // In a real app, you'd save to a database
  // For now, we'll return the booking data and the client will save it
  const booking: CmsBooking = {
    id: Date.now().toString(),
    name,
    phone,
    service,
    employee: employee || undefined,
    date: bookingDate.toISOString(),
    timeSlot,
    duration: parseInt(duration, 10) || 45,
  };

  const now = new Date();
  const phoneE164 = normalizePhoneE164(phone);
  // Confirm (SMS) temporarily disabled because phone verification isn't ready.
  // const twilioReady = isTwilioConfigured();
  // const confirmationBody = bookingConfirmationSms({ name, isoDate: booking.date });
  const twilioReady = false;

  // Reminder (SMS) temporarily disabled because phone verification isn't ready.
  // const reminderAt = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000);
  // const shouldScheduleReminder = reminderAt.getTime() > now.getTime();
  // const reminderJob: CmsSmsJob | null =
  //   phoneE164 && shouldScheduleReminder
  //     ? {
  //         id: `${booking.id}:reminder`,
  //         kind: 'booking_reminder',
  //         status: 'pending',
  //         to: phoneE164,
  //         bookingId: booking.id,
  //         sendAt: reminderAt.toISOString(),
  //         createdAt: now.toISOString(),
  //         updatedAt: now.toISOString(),
  //       }
  //     : null;
  const reminderJob: CmsSmsJob | null = null;

  if (isS3CmsConfigured()) {
    try {
      const site = await readCmsSiteFromS3();
      if (site) {
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
      // const out = await sendSms({ to: phoneE164, body: confirmationBody });
      // confirmation.sent = true;
      // confirmation.messageSid = out.sid;
      confirmation.sent = false;
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
