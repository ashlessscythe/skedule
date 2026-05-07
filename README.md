## Skedule

Multi-tenant appointment management platform (Next.js App Router + Prisma + Neon).

- **Docs**: see [`documentation.md`](documentation.md)

## Delivery Phases (feature roadmap)

- **Phase 0 (completed)**: Dashboard shell + navigation + admin section scaffold
  - Sidebar navigation in `/dashboard`
  - Role-gated admin area scaffold (`/dashboard/admin`)
- **Phase 1 (completed)**: Staff MVP scheduling primitives
  - Clients list + create (UI) and `GET/POST/PATCH /api/clients`
  - Intake link generation from clients UI (uses `POST /api/intake-tokens`)
  - Appointment create (UI) and `PATCH/DELETE /api/appointments/[id]`
- **Phase 2 (completed)**: Admin setup UI
  - Locations CRUD UI (`/api/locations`)
  - Appointment types CRUD UI (`/api/appointment-types`)
  - Availability CRUD UI (`/api/availability`)
- **Phase 3 (completed)**: Signup + pending approval workflow + Turnstile + emails
- **Phase 4 (completed)**: Appointment communication templates + triggers (Resend)
- **Phase 5 (completed)**: QR/PDF operational UI + audit/check-in enhancements
- **Phase 6 (completed)**: Reporting + audit log viewer + tenant switcher

## Getting Started

### 1) Install deps

```bash
npm install
```

### 2) Environment variables

Copy `.env.example` to `.env` and fill in real values.

```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DEFAULT_TENANT_SLUG` (tenant slug used for public registration)

Recommended (Prisma migrations in dev):
- `SHADOW_DATABASE_URL`

Email (Resend):
- `.env.example` ships with `SEND_EMAIL="false"`. Email sends are skipped unless you change it.
- If you enable sending, you must set `RESEND_API_KEY` and `EMAIL_FROM_DEFAULT`.
- Optional: `REGISTRATION_ADMIN_NOTIFY_EMAILS` (comma-separated fallback recipients for pending registration notifications)
- Optional (cron reminder emails): `CRON_SECRET`, `REMINDER_HOURS_BEFORE` (default `24`)

Turnstile (public auth forms):
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

### 3) Database

Run migrations and seed sample data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Seed creates:
- Tenant: `Acme Health Clinic`
- Users:
  - `admin@acmehealth.test` / `Admin123!` (ADMIN)
  - `staff@acmehealth.test` / `Admin123!` (STAFF)

### 4) Run locally

```bash
npm run dev
```

Open:
- `http://localhost:3000/auth/login`
- `http://localhost:3000/dashboard`

## Tests

```bash
npm test
npm run test:coverage
```

## Lint

```bash
npm run lint
```

## Reminder email cron (optional)

The app exposes `GET/POST /api/cron/appointment-reminders`.

- Set `CRON_SECRET`.
- Call the endpoint with either:
  - `Authorization: Bearer <CRON_SECRET>`, or
  - `x-cron-secret: <CRON_SECRET>`

## Deployment notes

This repo’s `start` script runs Prisma migrations before starting Next.js:

```bash
npm run build
npm start
```
