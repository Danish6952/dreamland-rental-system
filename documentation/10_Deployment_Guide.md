# 10 — Deployment Guide

**Audience:** the owner (or whoever sets up the accounts). No coding needed, about 45 minutes.
**Result:** the app is live at `https://<your-site>.netlify.app`, with data stored in Supabase.

---

## Step 1 — Create the Supabase project (database + login)

1. Go to **supabase.com** → *Start your project* → sign up (GitHub or email).
2. **New project**
   - Name: `dreamland-rentals`
   - Database password: generate a strong one and **save it in a safe place**
   - Region: **South Asia (Mumbai)**, the closest to Islamabad
   - Plan: Free
3. Wait about 2 minutes for the project to be ready.

## Step 2 — Create the database

Use **one** of these two options.

**Option A — SQL Editor (simplest)**
1. Supabase → **SQL Editor** → *New query*.
2. Open `app/supabase/all-migrations.sql` from the project, copy **all** of it, and paste it in.
3. Press **Run**. You should see *"Success. No rows returned"*.

**Option B — Supabase CLI (for developers)**
```bash
cd app
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/0001…0008 in order
```

> Run the database setup **once** on a new project. Later changes are added as new numbered files (`0009_…sql`) and applied the same way. Never edit a migration that has already run.

## Step 3 — Secure the login settings

Supabase → **Authentication**:

| Setting | Where | Value |
|---------|-------|-------|
| Allow new users to sign up | Sign In / Providers → *User Signups* | **OFF** (AUTH-02) |
| Email provider | Sign In / Providers → Email | **Enabled** |
| Confirm email | Sign In / Providers → Email | ON (users are created confirmed by the owner, see Step 4) |
| Site URL | URL Configuration | `https://<your-site>.netlify.app` (set after Step 6; `http://localhost:5173` until then) |
| Redirect URLs | URL Configuration | `https://<your-site>.netlify.app/reset-password` |

## Step 4 — Create the three users (**Owner first!**)

Supabase → **Authentication → Users → Add user → Create new user**:

1. **Owner** first: email, password, tick **Auto Confirm User**.
   The **first user ever created automatically becomes Owner.**
2. Then **Brother**, then **Father** (they become *Staff*).
3. Check it worked: SQL Editor →
   ```sql
   select full_name, role, is_active from public.profiles order by created_at;
   ```
   The owner row must show `owner`. To change a user's display name, open the app → Settings.

> If a staff member was created first by mistake, fix it once in the SQL Editor:
> `update public.profiles set role = 'owner' where id = (select id from auth.users where email = 'owner@example.com');`

## Step 5 — Copy the API keys

Supabase → **Project Settings → API Keys** (or *Data API*):
- **Project URL**, e.g. `https://abcdxyz.supabase.co`
- **anon / publishable key** (safe to put in the app)
- ⚠️ **Never** copy the `service_role` / secret key anywhere in the app or in Netlify.

## Step 6 — Put the code on GitHub

1. Create a **private** repository on github.com, e.g. `dreamland-rental-system`.
2. On the computer with the project:
   ```bash
   cd Dreamland-Rental-System
   git init
   git add .
   git commit -m "Dreamland Rental Management System — Phase 1"
   git branch -M main
   git remote add origin https://github.com/<you>/dreamland-rental-system.git
   git push -u origin main
   ```
   `.gitignore` keeps `node_modules`, builds and `.env.local` (keys) out of git.

## Step 7 — Deploy on Netlify

1. **netlify.com** → sign up with GitHub → **Add new site → Import an existing project → GitHub** → choose the repo.
2. Build settings:

   | Field | Value |
   |-------|-------|
   | Base directory | `app` |
   | Build command | `npm run build` |
   | Publish directory | `app/dist` |

   Because the base directory is `app`, the `documentation/` folder is **never built or published**.
3. **Environment variables** (Site configuration → Environment variables → Add):
   - `VITE_SUPABASE_URL` = Project URL from Step 5
   - `VITE_SUPABASE_ANON_KEY` = anon / publishable key from Step 5
4. **Deploy site**. After 1–2 minutes you get `https://random-name.netlify.app`. You can rename it under *Site configuration → Change site name*, e.g. `dreamland-rentals.netlify.app`.
5. Go back to **Step 3** and set the **Site URL** and **Redirect URL** to this address.

`app/netlify.toml` already contains the single-page-app redirect and security headers.

## Step 8 — First use

1. Open the site on your phone → sign in as Owner.
2. **Add to Home Screen**:
   - iPhone (Safari): Share → *Add to Home Screen*
   - Android (Chrome): ⋮ → *Add to Home screen* / *Install app*
3. Add the fleet (Cars → Add car).
4. Run one real rental end to end ([08 §5](08_Testing_Checklist.md)).
5. Brother and Father sign in on their phones. They can set a new password with *Forgot password?*.

## Step 9 — Custom domain (later)

Netlify → *Domain management → Add a domain* → follow the DNS steps (HTTPS is automatic). Then update the Supabase **Site URL** and **Redirect URLs** to the new domain.

## Ongoing operations

| Topic | What to do |
|-------|------------|
| **Updates** | Push to `main` on GitHub. Netlify rebuilds and deploys automatically |
| **Database changes** | New file `app/supabase/migrations/0009_*.sql`, then apply it (SQL Editor or `supabase db push`) **before** deploying code that needs it |
| **Free-tier pause** | Supabase pauses free projects after 7 days with **no activity**. Daily use prevents it. If paused, press *Restore* in the dashboard |
| **Backups** | Free tier: daily backups kept a short time. Also export Payments / Outstanding reports to CSV monthly. Upgrade to **Pro (~$25/month)** once the data is valuable, for longer backups and no pausing |
| **Disable a user** | App → Settings → Users → *Disable* (Owner). They lose access immediately |
| **Password reset** | *Forgot password?* on the sign-in page. Supabase's built-in email sender is rate-limited, so for production email add your own SMTP (Authentication → Emails → SMTP) |
| **Real logo** | Replace `app/public/icon.svg` and `logo-placeholder.svg`, run `node scripts/make-icons.mjs`, then push |

## Security checklist before going live

- ☐ Sign-ups disabled (Step 3)
- ☐ Only 3 users exist, and the owner is `owner`
- ☐ Netlify has only the **anon** key, not the service role key
- ☐ Opening `https://<site>/documentation/` shows the app (404 → app), not the docs
- ☐ Logged out, the app shows only the sign-in page
- ☐ [08_Testing_Checklist.md §3](08_Testing_Checklist.md) security tests passed
