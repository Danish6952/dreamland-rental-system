# 02 — System Architecture

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

---

## 1. High-level overview

```
┌──────────────────────────────┐        HTTPS         ┌──────────────────────────────────────┐
│  Browser (phone / PC)        │ ───────────────────▶ │  Netlify (static hosting, CDN)       │
│  React SPA                   │ ◀─────────────────── │  serves app/dist (HTML/JS/CSS)       │
└──────────────┬───────────────┘                      └──────────────────────────────────────┘
               │ supabase-js (HTTPS, JWT)
               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Supabase                                                                                   │
│  ┌─────────────┐   ┌───────────────────────┐   ┌──────────────────────────────────────────┐ │
│  │ Auth        │   │ PostgREST API         │   │ PostgreSQL                               │ │
│  │ email/pass  │──▶│ tables + views + RPC  │──▶│ tables, views, RPC functions, triggers,  │ │
│  │ issues JWT  │   │ (enforces RLS)        │   │ Row Level Security, audit log            │ │
│  └─────────────┘   └───────────────────────┘   └──────────────────────────────────────────┘ │
│  ┌─────────────┐                                                                           │
│  │ Storage     │  (Phase 2: logo, CNIC/document images, PDFs)                              │
│  └─────────────┘                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Main design decision:** the **database enforces the business rules**, and the React app handles presentation.

- Car status changes, rental lifecycle, bill/paid/pending calculations and permission checks live in PostgreSQL (RPC functions, triggers, constraints, RLS).
- The frontend validates too, for fast feedback, but the database has the final say.
- **Why:** three people use the app from different phones at the same time. If the rules lived only in the browser, two people could send the same car out at once, or a buggy screen could corrupt totals. The database is the one place every change passes through.

There is **no custom backend server**. Supabase provides the API, auth and storage, which keeps hosting free and maintenance low.

## 2. Frontend architecture

### 2.1 Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | **React 18 + Vite** | Fast dev/build, standard ecosystem |
| Styling | **Tailwind CSS** | Mobile-first utilities, consistent design tokens |
| Routing | **React Router** | Standard SPA routing |
| Server state | **TanStack Query** | Caching, refetch on focus, loading/error states, invalidation after changes |
| Forms | **React Hook Form** | Performant forms on mobile |
| Validation | **Zod** | One schema per form, shared by all forms |
| Backend client | **@supabase/supabase-js** | Auth, queries, RPC |
| i18n | **react-i18next** | English now, Urdu later, RTL support |
| Dates | **date-fns** (+ `date-fns-tz` for Asia/Karachi) | Lightweight |
| Icons | **lucide-react** | Clean, consistent |
| Language | **TypeScript** (strict) | Catches mistakes in money and status logic before they reach users. Database types are generated from Supabase (`supabase gen types`) |

### 2.2 Folder structure (`app/`)

```
app/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── netlify.toml                 # build config + SPA redirect
├── .env.example                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── public/
│   ├── logo-placeholder.svg
│   └── manifest.webmanifest
├── supabase/
│   ├── migrations/              # numbered SQL files (schema, RLS, functions, seed)
│   └── seed.sql
└── src/
    ├── main.tsx
    ├── App.tsx                  # providers + router
    ├── lib/
    │   ├── supabase.ts          # client singleton
    │   ├── queryClient.ts
    │   ├── i18n.ts
    │   ├── format.ts            # money, dates (PKT), phone
    │   └── database.types.ts    # generated from Supabase schema
    ├── locales/
    │   ├── en.json
    │   └── ur.json              # empty placeholder, Phase 2
    ├── services/                # the ONLY place that talks to Supabase
    │   ├── authService.ts
    │   ├── carService.ts
    │   ├── customerService.ts
    │   ├── rentalService.ts
    │   ├── paymentService.ts
    │   ├── reportService.ts
    │   └── alertService.ts
    ├── hooks/                   # TanStack Query wrappers around services
    │   ├── useAuth.ts
    │   ├── useCars.ts
    │   ├── useRentals.ts
    │   ├── usePayments.ts
    │   ├── useReports.ts
    │   └── useAlerts.ts
    ├── validation/              # Zod schemas
    │   ├── carSchema.ts
    │   ├── carOutSchema.ts
    │   ├── carReturnSchema.ts
    │   └── paymentSchema.ts
    ├── components/
    │   ├── layout/              # AppShell, BottomNav, Sidebar, TopBar
    │   ├── ui/                  # Button, Input, Select, Card, Badge, Sheet, Modal, EmptyState, Skeleton
    │   ├── cars/                # CarCard, CarStatusBadge, CarForm
    │   ├── rentals/             # RentalCard, RentalSummary, CarOutForm, CarReturnForm
    │   ├── payments/            # PaymentForm, PaymentList, MoneySummary
    │   └── alerts/              # AlertList, AlertItem
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── cars/                # CarsListPage, CarDetailPage, CarFormPage, SellCarPage
    │   ├── rentals/             # RentalsListPage, RentalDetailPage, CarOutPage, CarReturnPage
    │   ├── customers/           # CustomersListPage, CustomerDetailPage
    │   ├── payments/            # PaymentsListPage
    │   ├── reports/             # ReportsHomePage + one page per report
    │   └── settings/            # SettingsPage, UsersPage, PaymentMethodsPage, AuditLogPage
    └── routes/
        ├── ProtectedRoute.tsx   # requires login + active profile
        └── OwnerRoute.tsx       # requires role = owner
```

### 2.3 Layering rules

```
pages  →  hooks  →  services  →  supabase-js  →  Supabase
  │         │
  └─ components (presentational, no data fetching)
```

- **Components** receive props and don't fetch data.
- **Pages** compose components and call hooks.
- **Hooks** wrap services in TanStack Query (`useQuery` / `useMutation`) and invalidate related caches after changes. For example, a payment invalidates the rental, the dashboard and the reports.
- **Services** are the only files that import the Supabase client. Multi-step actions call **RPC functions** (e.g. `rpc('car_out', …)`), not several separate inserts.

### 2.4 State

- **Server state:** TanStack Query only. There's no Redux: the app has almost no client-only state.
- **Auth state:** React context holding the Supabase session and the user's `profile` (role, name).
- **UI state:** local `useState` (open sheets, filters). Filters are stored in the URL query string, so links and back navigation work.

## 3. Backend architecture (Supabase)

| Component | Usage |
|-----------|-------|
| **PostgreSQL** | All data, calculations (views), business actions (RPC functions), triggers (timestamps, audit, auto-close) |
| **PostgREST** | Auto-generated REST API over tables/views and `rpc/*` functions |
| **Row Level Security** | Every table. Only logged-in users with an **active profile** can read. Writes are limited by role |
| **Auth** | Email/password. Sign-up disabled. Users are created by the Owner from the Supabase dashboard (Phase 1) or an in-app invite (optional Phase 1, see 07) |
| **Storage** | Not needed in Phase 1. Buckets reserved for `branding/`, `documents/` (private) in Phase 2 |
| **Backups** | Supabase daily backups (free tier: 7-day retention; see note in 07 about upgrading when data becomes valuable) |

### 3.1 Business actions (RPC functions)

Every action that changes more than one row, or enforces a lifecycle rule, is a PostgreSQL function running in **one transaction**:

| Function | What it does | Role |
|----------|--------------|------|
| `car_out(...)` | Checks car is Available → creates or links customer → creates rental (Out) → sets car On Rent → records optional advance & deposit | all |
| `car_return(...)` | Checks rental is Out → saves return data & charges → sets car Available / At Maintenance → recalculates status (Returned or Closed) | all |
| `record_payment(...)` | Validates type and amount limits (e.g. deposit used ≤ deposit balance) → inserts → recalculates rental status | all |
| `update_payment(id, ..., reason)` | Edits a payment, requires a reason, writes to the audit log, recalculates | all |
| `void_payment(id, reason)` | Marks voided, audits, recalculates | owner |
| `set_car_maintenance(car_id, on, reason)` | Available ↔ At Maintenance only | all |
| `sell_car(car_id, ...)` | Checks no active rental → creates `sold_cars` row → status Sold → archived | owner |
| `void_rental(id, reason)` | Voids a mistaken rental and releases the car | owner |

Direct `INSERT/UPDATE` on `rentals`, `payments` and `cars.status` from the client is **blocked by RLS**. These can only change through the functions above. Simple edits such as a car's color or a customer's phone are allowed directly under RLS.

### 3.2 Calculations

The view **`rental_balances`** calculates, for every rental: total bill, total paid, pending, deposit taken/used/returned/balance, and alert flags. The dashboard, rental screens and reports all read from this view, so **the same numbers appear everywhere**. The formulas are in [05_Business_Rules.md](05_Business_Rules.md).

## 4. Authentication flow

```
1. User opens app ──▶ ProtectedRoute checks supabase.auth.getSession()
        │
        ├─ no session ──▶ /login
        │                   │ email + password
        │                   ▼
        │             supabase.auth.signInWithPassword()
        │                   │ JWT (access + refresh token) stored by supabase-js
        │                   ▼
        └─ session ──▶ load profile (profiles row for auth.uid())
                            │
                            ├─ no profile or is_active = false ──▶ sign out, show "Account disabled"
                            └─ active ──▶ AuthContext { user, profile.role } ──▶ app
2. Every API call sends the JWT. PostgreSQL RLS reads auth.uid() and checks profiles.role / is_active.
3. Tokens refresh automatically. Logout clears the session on that device.
4. Password reset: "Forgot password" → Supabase email link → /reset-password page.
```

**User creation (Phase 1):** the Owner adds users in the Supabase dashboard (Authentication → Add user). A trigger creates a `profiles` row with role `staff`, and the Owner can change it to `owner`. The first user is set as owner by a one-time SQL step in the deployment instructions.

**Defence in depth:** the UI hides owner-only buttons, but the security comes from RLS and the role checks inside the RPC functions. The app is safe even if someone calls the API directly.

## 5. Data flow examples

### 5.1 Car Out

```
CarOutPage (form, Zod validation)
  → useCarOut() mutation
    → rentalService.carOut(data)
      → supabase.rpc('car_out', {...})
        → PostgreSQL transaction:
            lock car row (SELECT … FOR UPDATE) → verify status = available
            upsert customer → insert rental (status out)
            update car.status = on_rent (+ status history row)
            insert advance / deposit_taken payments (if > 0)
        ← returns rental id
  ← onSuccess: invalidate ['cars'], ['rentals'], ['dashboard'], ['alerts']
  → navigate to RentalDetailPage
```

The row lock means two users sending the same car out at the same moment can't both succeed: the second gets "Car is no longer available".

### 5.2 Viewing the dashboard

```
DashboardPage
  → useDashboard()  → select from dashboard_summary view (counts, totals)
  → useAlerts()     → select from rental_alerts + car_alerts views
  → refetch on window focus + every 60 s
```

## 6. Deployment architecture

| Item | Setting |
|------|---------|
| Repository | One repo containing `documentation/` and `app/` |
| Netlify **base directory** | `app` |
| Build command | `npm run build` |
| Publish directory | `app/dist` |
| SPA routing | `netlify.toml` redirect `/* → /index.html 200` |
| Env vars (Netlify UI) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `documentation/` | Outside the base directory, so it is **never built or deployed** |
| Domain | `*.netlify.app` first, custom domain later |
| HTTPS | Automatic (Netlify) |

The anon key is public by design. It's safe only because RLS is enabled on every table, and a test in 08 checks that. The **service-role key is never put in the frontend or in Netlify**.

## 7. Internationalization (Urdu readiness)

- All strings are in `locales/en.json`. Components use `t('cars.addCar')`.
- Tailwind **logical properties** (`ps-4`, `me-2`, `text-start`) are used instead of left/right, so RTL works by setting `<html dir="rtl">`.
- The Noto Nastaliq Urdu font loads only when Urdu is selected.
- Numbers and currency stay in Western digits (`Rs 45,000`) in both languages unless requested otherwise.
- `profiles.preferred_language` stores each user's choice.

## 8. Multi-branch readiness

- A `branches` table exists from day one, with one row: *Dreamland – Aari Syedan*.
- `cars` and `rentals` have a `branch_id` that defaults to that branch.
- Phase 1 UI ignores branches. Phase 3 adds a branch switcher and branch-scoped RLS (see 09).
