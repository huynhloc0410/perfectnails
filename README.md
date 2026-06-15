# Perfect Nails

Next.js site for **Perfect Nails** — Phoenix, AZ: online booking, services, gallery, contact, and admin tools.

## Stack

- Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript
- **PostgreSQL** (Render) — bookings, services, staff, site copy
- **Amazon S3** — gallery images + minimal `cms/site.json` (`version` + `gallery`)

## Scripts

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm start
```

## Database

```bash
export DATABASE_URL='postgresql://...'
npm run db:schema    # create tables
npm run db:verify    # row counts
```

Import bookings from JSON (no SMS): `npm run db:import-bookings -- ./file.json`

## Environment

Copy `.env.example` for Render variables: `DATABASE_URL`, S3 gallery keys, Twilio, `ADMIN_PASSWORD`.

## SMS

- **Confirmation SMS** — sent when a customer books online (`POST /api/booking`)
- **Reminder SMS** — manual from admin booking cards (`/api/admin/booking-sms`)
- Automated reminder cron is **disabled**

### Twilio variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (E.164)

---

© Perfect Nails
