# Delivery phases (feature roadmap)

Historical breakdown of how features were rolled out. For current behavior and setup, see the root [README](../README.md) and [documentation.md](../documentation.md).

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
