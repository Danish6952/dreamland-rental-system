# Dreamland Rental Management System — app

React + Vite + TypeScript + Tailwind (mobile first) · Supabase (PostgreSQL, Auth) · Netlify.
Planning and design docs are in `../documentation/` (not deployed).

## Quick start (local)

```bash
npm install
npm run stack:up     # local Postgres + auth + API in Docker, writes .env.local
npm run dev          # http://localhost:5173
```
Create logins (local stack only; the first one becomes owner):
```bash
npm run user:create -- owner@dreamland.local Owner-123 "Raja"
npm run user:create -- brother@dreamland.local Brother-123 "Brother"
```
To use a real Supabase project instead, copy `.env.example` to `.env.local` and fill in the URL and anon key.

## Scripts

| Script | What |
|--------|------|
| `npm run dev` / `build` / `preview` | develop / production build / preview build |
| `npm run typecheck` | strict TypeScript check |
| `npm test` | unit tests |
| `npm run test:db` | migrations + database business-rule tests (Docker) |
| `npm run stack:up` / `stack:down` | local mini-Supabase |
| `npm run test:integration` | service layer against the local stack |
| `npm run test:ui` | browser smoke test + screenshots (needs `npm run dev`) |
| `npm run user:create` | create a login on the local stack |
| `npm run db:bundle` | regenerate `supabase/all-migrations.sql` for the SQL Editor |

## Structure

```
supabase/migrations/   0001…0008 SQL: types, tables, indexes, triggers, views, RPC functions, RLS, seed
supabase/tests/        database scenario tests (plain Postgres + Supabase stub)
supabase/local/        local stack (Docker) — development only
src/lib/               supabase client, formatting (PKT, Rs lakh), rent calculations, i18n, CSV
src/services/          the ONLY code that talks to Supabase
src/hooks/             TanStack Query hooks + useAction (toast + refresh)
src/validation/        Zod schemas (mirror the database rules)
src/components/        ui/, layout/, cars/, rentals/, payments/, alerts/
src/pages/             one file per screen (lazy loaded)
src/integration/       integration tests
scripts/               UI smoke test, icon generator, migration bundler
```

## Rules of the codebase

- Business rules live in the **database** (RPC functions, triggers, constraints, RLS). The UI validates for speed, but the database decides.
- Multi-step actions (Car Out, Return, payments, Sell, Void) are **RPC calls**, never several separate writes.
- Money shown anywhere comes from the `rental_balances`-based views, so every screen agrees.
- UI strings use `t('English text')`. Add Urdu to `src/locales/ur.json`.
- A schema change means a new migration file plus a check in `supabase/tests/10_business_scenarios.sql`.

Deployment: see `../documentation/10_Deployment_Guide.md`. Testing: `../documentation/11_Testing_Instructions.md`.
