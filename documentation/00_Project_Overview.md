# 00 — Project Overview

**Project:** Dreamland Rental Management System
**Business:** Dreamland — car rental, Aari Syedan, Islamabad, Pakistan
**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead
**Last updated:** 2026-09-27

---

## 1. What the system does

Dreamland rents cars on a daily, weekly, monthly and yearly basis. The business has no physical office, and the three people who run it work from different places. Rental information is on paper or in people's heads, so nobody has a single picture of:

- which cars are available, on rent, or at maintenance
- who has each car, and who their guarantor is
- how much each driver owes, has paid, and still has pending
- how much security deposit is being held, and how much has been used or returned
- how much each car has earned

The **Dreamland Rental Management System** is a private, mobile-first web app. It gives the three internal users one live record of the fleet, the rentals and the money. It runs in any browser (Android, iPhone, PC) and needs no installation.

## 2. Business goals

| # | Goal | How the system achieves it |
|---|------|----------------------------|
| G1 | Know vehicle availability instantly, from anywhere | Live car status (Available / On Rent / At Maintenance / Sold) on a dashboard |
| G2 | Never lose track of money owed | Every rental calculates its bill, amount paid and pending amount automatically. Overdue and pending payments are highlighted |
| G3 | Handle deposits correctly | Tracks deposit taken, used against damage or rent, returned, and remaining |
| G4 | Keep a permanent history | Nothing is hard-deleted. Rental, payment and car history is kept, including after a car is sold |
| G5 | Understand profitability | Weekly/monthly income, earnings per car, and outstanding balances |
| G6 | Stay accountable between family members | Every payment edit is recorded in an audit log showing who changed what, and when |
| G7 | Grow without a rewrite | The design supports more cars, more users, Urdu, and multiple branches later |

## 3. Users

Internal staff only. There are no customer or driver logins.

| User | Role in system |
|------|----------------|
| Owner | **Owner**: full access, including selling cars, voiding records and managing users |
| Brother | **Staff**: day-to-day operations |
| Father (occasional) | **Staff** |

## 4. Scope

### In scope (Phase 1)

- Secure login (Supabase Auth), with no public sign-up
- Dashboard: fleet status, alerts, money summary
- Cars: add, edit, change status to/from At Maintenance, mark as Sold (Owner only), archive
- Customers (drivers): stored once and reused on later rentals
- Rental types: Daily, Weekly, Monthly, **Yearly**
- **Car Out**: start a rental with driver, guarantor, rental type, agreed rate/amount, optional KM and fuel, optional advance and deposit
- **Car Return**: close out the car with optional end KM and fuel, and enter fuel, damage, extra-KM and other charges
- **Payments**: several payments per rental (advance, instalments, final), deposit taken, used and returned. Payment edits are audited
- Rental lifecycle: Out → Returned → Closed, with automatic closing
- Sold vehicle process: archived, with full history kept
- Rental history per car and per customer
- Reports: weekly/monthly income, pending payments by customer, payment history, outstanding balances, earnings per car, vehicle status
- Alerts: payment overdue, payment pending, payment due soon, car return overdue, insurance expiring
- Responsive UI in English, ready for Urdu translation (built with i18n)
- Deployment to Netlify, with a Supabase backend

### Out of scope (Phase 1), planned for later

See [09_Future_Features.md](09_Future_Features.md).

- Rental agreement PDF, payment receipts, invoices
- CNIC details and document or car photos
- Full Urdu translation (the structure is ready in Phase 1)
- WhatsApp reminders
- Maintenance cost tracking
- Customer portal
- Multiple branches (the database is ready in Phase 1, the UI comes later)
- Advance **bookings** (reserving a car for a future date). In Phase 1, an "advance" is money taken at Car Out or during the rental
- Full instalment schedules for long rentals (Phase 1 uses a "next payment due" date and amount)

## 5. Key constraints and assumptions

- **Currency:** PKR only. Amounts are shown as `Rs 45,000`.
- **Time zone:** Asia/Karachi (PKT, UTC+5). All "today", "overdue" and weekly/monthly report boundaries use PKT.
- **Scale:** about 7 cars now and 10–11 in 1–2 years. The design scales to hundreds of cars without changes.
- **Budget:** runs on the Supabase and Netlify free tiers at this scale.
- **Data:** starting fresh, with no migration of old records.
- **Branding:** no logo yet, so a placeholder "Dreamland" wordmark is used. The theme is dark navy, white and gold.

## 6. Document index

| File | Contents |
|------|----------|
| [01_Business_Requirements.md](01_Business_Requirements.md) | Functional and non-functional requirements |
| [02_System_Architecture.md](02_System_Architecture.md) | Frontend, backend, auth, data flow, deployment |
| [03_Database_Design.md](03_Database_Design.md) | Tables, relationships, indexes, constraints, security |
| [04_User_Flows.md](04_User_Flows.md) | Step-by-step flows for each process |
| [05_Business_Rules.md](05_Business_Rules.md) | Every rule and calculation, plus **open questions** |
| [06_UI_UX_Design.md](06_UI_UX_Design.md) | Screens, navigation, components, visual style |
| [07_Development_Plan.md](07_Development_Plan.md) | Phases and milestones |
| [08_Testing_Checklist.md](08_Testing_Checklist.md) | Functional, validation, security tests |
| [09_Future_Features.md](09_Future_Features.md) | Roadmap beyond Phase 1 |
| [10_Deployment_Guide.md](10_Deployment_Guide.md) | Step-by-step Supabase + Netlify setup |
| [11_Testing_Instructions.md](11_Testing_Instructions.md) | How to run every test layer |
