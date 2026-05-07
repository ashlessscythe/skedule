## Skedule (Multi-tenant Scheduling Platform)

Production-grade multi-tenant, multi-location appointment management platform built with Next.js (App Router), Prisma, and Neon Postgres.

### Stack

- **Next.js** (App Router)
- **UI**: shadcn/ui
- **DB**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: NextAuth (Credentials)
- **Email**: Resend (gated by `SEND_EMAIL=true`)

---

## Local setup

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
- `SHADOW_DATABASE_URL` (recommended: a separate Neon branch/db used only for Prisma migrations)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DEFAULT_TENANT_SLUG` (tenant slug used for public registration)

Email:
- `SEND_EMAIL` defaults to `"false"`; set to `"true"` only when you *intend* to send mail
- `RESEND_API_KEY` required only when `SEND_EMAIL="true"`
- `EMAIL_FROM_DEFAULT` required only when `SEND_EMAIL="true"`
- Optional: `REGISTRATION_ADMIN_NOTIFY_EMAILS` (comma-separated fallback recipients for pending registration notifications)

When `SEND_EMAIL=true` and the client has an email address, the app sends:
- **Confirmation** after creating an appointment (one email for the series; body notes extra occurrences when applicable)
- **Updated** when time or location changes (still `SCHEDULED`)
- **Cancelled** when status becomes `CANCELLED` or the appointment is deleted (soft cancel)
- **Registration received** on public signup (pending admin approval), and **approval** once activated

**Reminder emails** (optional):
- Set `CRON_SECRET` to a long random string.
- Optionally set `REMINDER_HOURS_BEFORE` (default `24`).
- Schedule HTTP `GET` or `POST` to `/api/cron/appointment-reminders` with header `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- The job selects `SCHEDULED` appointments whose start time is about `REMINDER_HOURS_BEFORE` hours away (±30 minutes), with `reminderSentAt` null and a client email; after a successful send it sets `reminderSentAt`. Run cron at least hourly so the window is hit.

---

## Tests & coverage

Run unit tests with `npm test`. To generate a coverage report (text + lcov, written to `./coverage/`), run `npm run test:coverage`.

---

## Database

### Migrate

```bash
npx prisma migrate dev
```

### Generate Prisma client

```bash
npx prisma generate
```

### Seed

```bash
npx prisma db seed
```

Seed creates:
- Tenant: `Acme Health Clinic`
- Users:
  - `admin@acmehealth.test` / `Admin123!` (ADMIN)
  - `staff@acmehealth.test` / `Admin123!` (STAFF)
- One location, appointment type, client, and a sample appointment

---

## Run locally

```bash
npm run dev
```

Open:
- `/auth/login`
- `/dashboard`
- `/dashboard/appointments`

---

## Auth & tenant isolation (current behavior)

- Credentials login via NextAuth.
- Session contains:
  - `userId`
  - `primaryTenantId` (currently the first tenant membership)
  - `roles[]` of `{ tenantId, role }`
- Server-side tenant scoping uses `getTenantContext()` (`src/lib/tenant-context.ts`).

---

## Deployment notes (Vercel-like)

- Configure env vars in the hosting provider.
- Run migrations using:

```bash
npx prisma migrate deploy
```

Avoid committing:
- `.env` (already ignored)
- any secrets or real credentials

