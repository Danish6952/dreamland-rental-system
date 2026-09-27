# 09 — Future Features

**Document status:** Draft v1 — ideas list, prioritised with the owner after Phase 1 launch

Phase 1 is designed so none of these need a redesign: `branch_id` exists, i18n is built in, Storage is available, and all money logic lives in one place (the database).

---

## 1. Reports (beyond Phase 1)

| Report | Value |
|--------|-------|
| **Profit per car** | Income − maintenance cost − (optionally) purchase cost. Shows which cars are worth keeping |
| **Fleet utilization** | % of days each car was On Rent vs Available vs Maintenance |
| **Customer reliability** | On-time payments, late days, damage history. Useful before renting to a repeat customer |
| **Deposit ledger** | Every deposit held, used, returned, per customer |
| **Year-end summary** | Annual income, per car, per month, for tax/accounting |
| **Sold vehicles** | Purchase vs sale price vs lifetime earnings |
| **Scheduled report email** | Weekly summary emailed to the Owner every Monday |
| **PDF export** of any report | |

## 2. Documents

- **Rental agreement PDF**: company details, car, driver, guarantor, terms, signature lines. Generated at Car Out
- **Payment receipt** PDF/image for each payment, shareable on WhatsApp
- **Invoice** at return, with the itemized bill
- Receipt and invoice numbering
- Company logo and contact details on all documents

## 3. WhatsApp integration

| Level | How | Cost |
|-------|-----|------|
| **L1 — Click to chat** (can be added in Phase 1) | Buttons open WhatsApp with a pre-filled message, e.g. *"Assalam o Alaikum Ali, your rent of Rs 20,000 for ABC-123 was due on 31 Oct. — Dreamland"*. The user taps Send | Free |
| **L2 — Share documents** | Share receipt/agreement PDF through the phone's share sheet | Free |
| **L3 — Automatic reminders** | WhatsApp Business Cloud API + Supabase scheduled Edge Function: due-soon and overdue reminders, return reminders | Per-message fees, Meta business verification |
| **L4 — Internal notifications** | Owner gets a WhatsApp or push message when a payment is recorded or a car goes out | Low |

Message templates in English and Urdu.

## 4. Customer portal

- Customer logs in with mobile number + OTP
- Sees their active rental, bill, payments, pending and deposit
- Downloads receipts and agreement
- Later: request a booking, see available cars (without car numbers)
- Needs: a separate `customer` role, strict RLS (own rows only), and an SMS/OTP provider

## 5. Multiple branches

- Branch management (the `branches` table already exists)
- Assign cars and users to branches
- Branch switcher in the top bar. "All branches" for the Owner
- Branch-scoped RLS: branch staff see only their branch
- Car transfers between branches, with history
- Reports per branch and consolidated

## 6. Operations

- **Maintenance records**: date, workshop, work done, cost, next service due (KM/date), with service-due alerts
- **Car documents**: registration, insurance, token tax, with expiry reminders (token tax, fitness)
- **Photos**: car condition at out/return, damage photos linked to the damage charge
- **CNIC & license images** for driver and guarantor (private storage)
- **Blacklist** customers with a reason
- **Mileage-based fuel/extra-KM** calculation: rate per km, allowed km per period
- **Instalment schedules** for monthly/yearly rentals, with per-instalment due dates and alerts
- **Advance bookings**: reserve a car for future dates, with overlap checks and booking advance/cancellation
- **Expenses**: fuel, repairs, parking, driver salary, for a true profit & loss
- **GPS tracker integration** (if trackers are installed)

## 7. Platform

- Full **Urdu** UI (Phase 2)
- **Offline mode** (PWA): view data and queue payments without signal, sync later
- **Push notifications** in the installed web app
- **Two-factor authentication** for the Owner
- Accounting export (Excel/CSV formatted for an accountant)
- Native Android/iOS app wrapper (Capacitor), only if really needed
