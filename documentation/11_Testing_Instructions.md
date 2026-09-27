# 11 — Testing Instructions

**Audience:** developers, plus the owner for the manual part (§5).
There are four automated layers and one manual layer. The checklist items they cover are in [08_Testing_Checklist.md](08_Testing_Checklist.md).

| Layer | Command (from `app/`) | Needs | Covers |
|-------|----------------------|-------|--------|
| 1. Unit | `npm test` | Node 20+ | Money/date formatting, rent suggestion, due dates, validation rules |
| 2. Database | `npm run test:db` | Docker | All migrations + 55 checks: worked example, lifecycle, limits, RLS, owner-only, audit |
| 3. Integration | `npm run stack:up` then `npm run test:integration` | Docker | The app's real service layer against GoTrue + PostgREST + Postgres (login, roles, every business action, reports) |
| 4. UI smoke | `npm run stack:up`, `npm run dev`, then `npm run test:ui` | Docker, Chrome | A browser drives the real screens on a phone viewport: login → add car → Car Out → payment → return → closed. Saves screenshots, fails on any browser error or horizontal scroll |
| 5. Manual | — | Real phones | 08 §4 device checks and §5 owner acceptance |

Also run `npm run typecheck` and `npm run build` before every deploy.

---

## 1. Unit tests

```bash
cd app
npm install
npm test
```
Files: `src/lib/*.test.ts`, `src/validation/*.test.ts`. They run in under a second.

## 2. Database tests

```bash
npm run test:db
```
This starts a throwaway `postgres:16` container, adds a small Supabase stub (`supabase/tests/00_supabase_stub.sql`: auth schema, `auth.uid()`, API roles), applies every migration, and runs `supabase/tests/10_business_scenarios.sql`. Every check prints `ok …`. The first failure stops the run with `FAIL: …`. The last line must be **ALL DATABASE SCENARIO TESTS PASSED**.

Add a new check for every new business rule. The helpers are `pg_temp.check(condition, message)` and `pg_temp.expect_error(sql, '%message%')`.

## 3. Integration tests (local mini-Supabase)

```bash
npm run stack:up            # Postgres + GoTrue (auth) + PostgREST on http://localhost:54321
npm run test:integration    # src/integration/flows.itest.ts
npm run stack:down          # removes the containers
```
`stack:up` writes `.env.local` with local keys, so `npm run dev` then uses the local stack too, which is handy for development. These keys only work on your machine.

## 4. UI smoke test

```bash
npm run stack:up
npm run dev                 # keep running in another terminal
npm run test:ui             # screenshots in app/e2e-screenshots/
```
Uses Google Chrome (`/usr/bin/google-chrome`, or set `CHROME=/path/to/chrome`). Each run creates a new demo owner and car, so it can be repeated.

## 5. Manual testing on phones (before launch)

1. Deploy to Netlify (see [10_Deployment_Guide.md](10_Deployment_Guide.md)), or run `npm run dev -- --host` and open `http://<computer-ip>:5173` on a phone on the same Wi-Fi.
2. Work through [08_Testing_Checklist.md](08_Testing_Checklist.md), mark each item ✅/❌, and note problems.
3. Must-do devices: one **Android (Chrome)**, one **iPhone (Safari)**, one **PC (Chrome/Edge)**.
4. **Owner acceptance (08 §5):**
   - Owner runs one real rental end to end.
   - Brother does one on his phone.
   - Compare one week's income report with your own calculation.

## Security spot checks on the live site

```bash
# Replace with your values. Without logging in, every table must be refused:
curl -s "https://<ref>.supabase.co/rest/v1/cars?select=*" -H "apikey: <anon-key>"
# expected: {"code":"42501", … "permission denied for table cars"}
```
In the Supabase SQL Editor, this must return **no rows** (every table has RLS enabled):
```sql
select relname from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
```

## What was verified in development (2026-09-27)

| Check | Result |
|-------|--------|
| TypeScript strict type-check | ✅ no errors |
| Production build | ✅ (code-split, ~95 kB gzip main bundle) |
| Unit tests | ✅ 35 / 35 |
| Database scenario tests | ✅ all passed |
| Integration tests (GoTrue + PostgREST) | ✅ 18 / 18 |
| UI smoke test (390 px phone + 1280 px desktop) | ✅ full flow, no console errors, no horizontal scroll |
| Real Android / iPhone devices | ☐ to do by owner (§5) |
