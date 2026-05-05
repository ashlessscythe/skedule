## Skedule

Multi-tenant appointment management platform (Next.js App Router + Prisma + Neon).

- **Docs**: see [`documentation.md`](documentation.md)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
- **Phase 3**: Signup + PENDING approval workflow + Turnstile + emails
- **Phase 4**: Appointment/intake communication templates + triggers (Resend)
- **Phase 5**: QR/PDF operational UI + audit/check-in enhancements
- **Phase 6**: Reporting filters/utilization + audit log viewer

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
