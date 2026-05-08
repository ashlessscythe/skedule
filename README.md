## Skedule

Multi-tenant appointment management for clinics and similar organizations: staff schedule clients, admins configure the tenant, and clients can complete intake or check-in via token links. Built with Next.js App Router, Prisma, and Neon Postgres.

- **Setup, stack, and auth details**: [documentation.md](documentation.md)
- **Historical phased rollout**: [docs/phases.md](docs/phases.md)

## Functionality

### Staff and scheduling

- **Clients**: List, create, and update clients; generate per-client **intake links** (public form backed by intake tokens).
- **Appointments**: Create, edit, reschedule, and cancel; conflict awareness and recurrence-related behavior live in `src/lib/scheduling/`.
- **Calendar**: Calendar view backed by `/api/calendar/events`.

### Administration (role-gated)

- **Locations**, **appointment types**, and **availability** CRUD for the active tenant.
- **Staff** management for tenant users.
- **Branding** settings for the tenant.
- **Audit log** viewer for operational history.

### Public and client-facing flows

- **Registration** with admin approval (pending users are activated by an admin); optional Cloudflare Turnstile on public auth forms.
- **Password reset** (forgot password + reset).
- **Intake**: Public page at `/intake/[token]` submits to the intake API.
- **Check-in**: Token-based check-in flow at `/checkin/[token]`.
- **QR codes** and **appointment card PDF** generation via dedicated API routes (see `src/lib/qr/` and `src/lib/pdf/`).

### Email and reminders

- Transactional email via Resend (appointment confirmation, update, cancellation; registration pending and approved). Behavior is gated by env (see `documentation.md`).
- Optional **reminder** job: `GET/POST /api/cron/appointment-reminders` with a shared secret header.

### Reporting and multi-tenant use

- **Reporting** dashboard metrics (`src/lib/reporting-metrics.ts`).
- **Tenant switcher** for users in multiple tenants (active tenant cookie + API under `/api/tenant/`).

### Platform mechanics

- **NextAuth** credentials sessions; server routes resolve the active tenant with `getTenantContext()` in `src/lib/tenant-context.ts` and enforce **ADMIN** vs **STAFF** where needed (`src/lib/security/rbac-mw.ts`).

## Getting started

```bash
npm install
cp .env.example .env
```

Fill required variables (see `.env.example` and [documentation.md](documentation.md)).

```bash
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

- App: `http://localhost:3000`
- Login: `/auth/login`
- Dashboard: `/dashboard`

Seed creates tenant **Acme Health Clinic** and users `admin@acmehealth.test` / `staff@acmehealth.test` (password `Admin123!`).

## Tests and lint

```bash
npm test
npm run test:coverage
npm run lint
```

## Reminder cron (optional)

Configure `CRON_SECRET` (and optionally `REMINDER_HOURS_BEFORE`). Call `GET` or `POST /api/cron/appointment-reminders` with `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.

## Deployment

The `start` script runs Prisma migrations before Next.js:

```bash
npm run build
npm start
```
