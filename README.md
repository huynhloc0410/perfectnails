# Perfect Nails

Next.js site for **Perfect Nails** — Phoenix, AZ: booking, services, gallery, contact, and admin tools (localStorage-backed).

## Scripts

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm start
```

## Stack

- Next.js 14 (App Router)
- React 18, Tailwind CSS, TypeScript

## Environment

Copy secrets as needed; default setup runs without a `.env` for local demo.

## SMS confirmations + reminders (Twilio)

This project supports:

- **Confirmation SMS**: sent immediately when a booking is created (`POST /api/booking`)
- **Reminder SMS**: queued for **2 hours before** the appointment, then delivered by a cron call (`POST /api/cron/sms-reminders`)

### Required environment variables

Set these in your hosting provider (or `.env.local` for local dev):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (E.164, e.g. `+16233022156`)

For production, also set:

- `CRON_SECRET` (any long random string)

### Running reminders (cron)

Reminders are stored in the S3 CMS payload (`site.json`) as `smsJobs`. To deliver them, call:

- `POST /api/cron/sms-reminders`
- Include header `x-cron-secret: <CRON_SECRET>` (recommended)

You can trigger this endpoint every 1–5 minutes using your hosting platform’s cron feature (or an external cron monitor).

---

© Perfect Nails
