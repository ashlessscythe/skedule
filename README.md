# Skedule

Multi-tenant appointment scheduling for clinics and similar organizations. Staff manage clients and appointments; clients use token links for intake and QR check-in. Built with Next.js (App Router), Prisma, and PostgreSQL.

**More detail:** [documentation.md](documentation.md) (setup, env, email) · [docs/phases.md](docs/phases.md) (historical rollout notes)

## Features

### Staff

- **Clients** — list, create, update; generate **intake links** (absolute URLs via `NEXTAUTH_URL`).
- **Appointments** — create, reschedule, cancel; recurrence and conflict checks (`src/lib/scheduling/`).
- **Appointments list** — copy **check-in link** or **download appointment card (PDF)** for upcoming visits.
- **Calendar** — `/dashboard/calendar` backed by `/api/calendar/events`.

### Admin (role-gated)

- Locations (name, address, timezone), appointment types, availability, staff, branding, audit log.

### Client-facing (no login)

| Flow | URL | What clients get |
|------|-----|----------------|
| **Intake** | `/intake/[token]` | Confirm or update contact details (single-use token). |
| **Check-in** | `/checkin/[token]` | View appointment details, **add to calendar** (Google Calendar or `.ics`), **open in Google Maps** (when the location has an address), then check in online. |

**Check-in lifecycle**

- A QR token is created automatically when an appointment is booked (and rotated on reschedule); tokens expire at appointment end time.
- Confirmation, reminder, and update emails include a check-in button, QR image, and PDF card link (not cancellation emails).
- Successful check-in sets appointment status to **`CHECKED_IN`** (staff can mark **`COMPLETED`** later).

Staff can also mint or re-copy links via `POST /api/qr-tokens`. See `src/lib/checkin/`, `src/lib/qr/`, and `src/lib/pdf/`.

### Email and cron

- Resend for transactional mail (gated by `SEND_EMAIL`; see [documentation.md](documentation.md)).
- Optional reminders: `GET` or `POST /api/cron/appointment-reminders` with `CRON_SECRET`.

### Platform

- NextAuth credentials; tenant scoping via `getTenantContext()`; **ADMIN** vs **STAFF** RBAC (`src/lib/security/rbac-mw.ts`).
- Multi-tenant switcher for users in multiple organizations.

## Getting started

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (required for public intake/check-in links)
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | App |
| `/auth/login` | Sign in |
| `/dashboard` | Staff dashboard |

**Seed:** tenant *Acme Health Clinic* — `admin@acmehealth.test` / `staff@acmehealth.test` (password `Admin123!`).

## Scripts

```bash
npm test              # unit tests
npm run test:coverage
npm run lint
npm run build && npm start   # migrate deploy, then Next.js (production)
```

## Environment

Set **`NEXTAUTH_URL`** to your public origin (e.g. `https://app.example.com`) so intake links, check-in links, email QR images, and PDF cards use correct absolute URLs.

Full variable list: [.env.example](.env.example) and [documentation.md](documentation.md).
