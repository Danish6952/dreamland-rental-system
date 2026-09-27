# 07 — Development Plan

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

Estimates assume one developer working with the owner for decisions. Each milestone ends with something the owner can try on a phone.

---

## Phase 0 — Setup (before coding)

| # | Task | Owner / Dev |
|---|------|-------------|
| 0.1 | ✅ Documentation 00–09 reviewed; decisions recorded in [05 §9](05_Business_Rules.md) | Owner |
| 0.2 | Create a **Supabase** account → new project (region: closest to Pakistan, e.g. Mumbai `ap-south-1`) | Owner (Dev guides) |
| 0.3 | Create a **Netlify** account | Owner |
| 0.4 | Create a **GitHub** repository (private) for the project. Netlify deploys from it | Owner / Dev |
| 0.5 | Supabase Auth settings: disable sign-ups, set Site URL, email templates | Dev |
| 0.6 | Create the 3 user accounts. Set the Owner's role | Dev + Owner |

## Phase 1 — Core system (MVP)

Target: **about 4–5 weeks**, delivered in milestones.

### M1 — Foundation (week 1)
- Database migrations: types, tables, indexes, constraints, triggers, RLS, seed (branch, payment methods)
- Vite + React + TypeScript + Tailwind project in `app/`, with design tokens, fonts, i18n setup, Supabase client
- Auth: login, logout, password reset, ProtectedRoute, OwnerRoute, profile loading, disabled-user handling
- App shell: bottom nav (mobile), sidebar (desktop), top bar, UI component basics
- Netlify deploy pipeline (a preview deploy on every push)
- **Demo:** log in on your phone and see an empty dashboard

### M2 — Cars and customers (week 2)
- Cars list, filters, search, add/edit, detail with tabs
- Maintenance on/off, status history
- Customers list/detail, search
- Insurance alerts
- **Demo:** enter the real fleet

### M3 — Car Out and Car Return (weeks 2–3)
- `car_out`, `car_return` database functions, with tests
- Car Out wizard, Rental detail, Car Return screen, live money summary
- Yearly rentals and the "next payment due" prompt
- **Demo:** send a car out and bring it back

### M4 — Payments (week 3)
- `record_payment`, `update_payment`, `void_payment`, auto-close trigger
- Payment form (all types), payment history, edit with reason, void (Owner), audit log screen
- **Demo:** run the full worked example from 05 §5 and watch the rental close

### M5 — Dashboard, alerts, reports (week 4)
- `rental_balances`, `dashboard_summary`, alert and report views
- Dashboard tiles, money card, alerts, cars-out list
- Reports REP-01 … REP-09, CSV export
- Sold vehicle process (Owner)
- **Demo:** the dashboard reflects the real business

### M6 — Hardening and launch (week 5)
- Full run of [08_Testing_Checklist.md](08_Testing_Checklist.md) on Android, iPhone and PC
- Security checks (RLS, anon access, staff restrictions)
- Web app manifest ("Add to Home Screen"), icons, final polish
- Production deploy, handover guide for the 3 users
- **Launch:** start recording real rentals

### Phase 1 deliverables (code generation order, as requested)
1. Database SQL (migrations)
2. Supabase configuration (auth settings, env, RLS)
3. React project structure
4. Components
5. Pages
6. Hooks
7. Services
8. Validation (Zod schemas)
9. Deployment instructions (Supabase + Netlify, step by step)
10. Testing instructions

**Status (2026-09-27): Phase 1 code complete and tested locally. Next: Phase 0 accounts (0.2–0.6), deploy, M6 device testing.**

## Phase 2 — Documents, Urdu, operations (about 3–4 weeks, after 1–2 months of real use)

- **Payment receipt** and **Rental agreement** PDF (share via WhatsApp)
- **Invoice** generation
- **Urdu translation**: full `ur.json`, RTL layout, language switch
- **CNIC details** and **document images** (driver CNIC/license, guarantor CNIC) in Supabase Storage (private bucket, signed URLs)
- **Car condition photos** at out/return
- **Maintenance records**: cost, workshop, parts. Maintenance cost included in per-car profit
- **Instalment schedules** for monthly/yearly rentals (full schedule with a due date per instalment; Phase 1 uses a single "next payment due")
- **Advance bookings** (reserve a car for a future date)
- In-app user invite (Owner)
- WhatsApp click-to-send reminders (pre-filled message, no API cost)
- Real logo and company details

## Phase 3 — Growth (when the business needs it)

- **Multiple branches**: branch switcher, branch-scoped users and reports
- **WhatsApp Business API** automatic reminders
- **Customer portal** (view own rental, balance, receipts)
- Advanced analytics: utilization %, profit per car after maintenance and purchase cost, customer reliability score
- Mileage-based fuel calculation
- See [09_Future_Features.md](09_Future_Features.md)

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Requirements change after build starts | Decisions are logged in 05 §9. Changes go through the docs first |
| Supabase free project pauses after 7 days of no activity | Daily use prevents it. Upgrade to Pro (~$25/month) once data is valuable, which also gives longer backups |
| Losing data | No hard deletes, audit log, daily backups, monthly CSV export habit |
| Staff enter data inconsistently | Required fields only where needed, clear defaults, a short training session |
| Phone number or car number format mismatches | Normalization rules (V-1, V-5) |

## Definition of done (per feature)

- Matches the requirement IDs in 01 and the rules in 05
- Works at 360 px and 1280 px widths
- Loading, empty and error states handled
- Business rules enforced in the database, not only in the UI
- Relevant items in 08 tested and passed
