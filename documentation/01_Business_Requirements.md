# 01 — Business Requirements

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead
**Source:** Owner's answers to the requirements questionnaire (2026-09-27)

Requirement IDs (e.g. `CAR-03`) are referenced in the testing checklist.
Priority: **M** = Must have (Phase 1), **S** = Should have (Phase 1 if time allows), **F** = Future.

---

## 1. Business context

| Item | Value |
|------|-------|
| Business name | Dreamland |
| Location | Aari Syedan, Islamabad, Pakistan |
| Office | None; operated remotely from different locations |
| Fleet | 6–7 cars now, 10–11 expected within 1–2 years |
| Internal users | 3 (Owner, Brother, Father) |
| Customers | Drivers who rent cars. Each rental needs a guarantor |
| Currency | PKR |
| Languages | English now, Urdu later |
| Devices | Android phones, iPhones, PC browsers |
| Existing data | None; starting fresh |

## 2. User roles and access

| Capability | Owner | Staff (Brother, Father) |
|------------|:-----:|:-----:|
| View all data (cars, rentals, payments, reports) | ✅ | ✅ |
| Add / edit cars | ✅ | ✅ |
| Set car to At Maintenance / Available | ✅ | ✅ |
| Car Out / Car Return | ✅ | ✅ |
| Create payments | ✅ | ✅ |
| Edit payments (with reason; audited) | ✅ | ✅ |
| View financial reports | ✅ | ✅ |
| **Mark car as Sold** | ✅ | ❌ |
| **Void a payment or rental** | ✅ | ❌ |
| **Archive a car / customer** | ✅ | ❌ |
| **Manage users** (invite, deactivate, change role) | ✅ | ❌ |
| **Manage payment methods** | ✅ | ❌ |
| View audit log | ✅ | ✅ (read only) |
| Hard delete anything | ❌ | ❌ |

> Nobody can hard-delete anything, not even the Owner. Records are **archived**, **voided** or **sold** instead (owner decision, Q20).

## 3. Functional requirements

### 3.1 Authentication (AUTH)

| ID | Requirement | Pri |
|----|-------------|-----|
| AUTH-01 | Users log in with email and password | M |
| AUTH-02 | Public sign-up is disabled. The Owner creates or invites users | M |
| AUTH-03 | Each user has a role: `owner` or `staff` | M |
| AUTH-04 | The Owner can deactivate a user. A deactivated user cannot use the system even with a valid password | M |
| AUTH-05 | Password reset by email | M |
| AUTH-06 | Sessions persist on the device until logout (users check the app often from phones) | M |
| AUTH-07 | Every record stores who created it and who last changed it | M |

### 3.2 Dashboard (DASH)

| ID | Requirement | Pri |
|----|-------------|-----|
| DASH-01 | Fleet counts: Available, On Rent, At Maintenance (Sold is excluded from active counts) | M |
| DASH-02 | Alerts list: 🔴 Payment overdue, 🔴 Payment pending, 🟡 Payment due soon, 🔴 Car return overdue, 🟡 Insurance expiring / 🔴 expired | M |
| DASH-03 | Money summary: total outstanding (pending) across all rentals, deposits currently held, income this week, income this month | M |
| DASH-04 | List of cars currently out, with driver, expected return date and pending amount | M |
| DASH-05 | Quick actions: **Car Out**, **Record Payment**, **Car Return** | M |

### 3.3 Cars (CAR)

| ID | Requirement | Pri |
|----|-------------|-----|
| CAR-01 | Add a car: car number (registration), make, model, year, color, registered to, standard rent and its period (daily/weekly/monthly/yearly), insurance expiry, notes | M |
| CAR-02 | Car number is unique. Spaces and case are ignored when checking duplicates (`ABC-123` = `abc 123`) | M |
| CAR-03 | Edit car details | M |
| CAR-04 | Car status: **Available**, **On Rent**, **At Maintenance**, **Sold** | M |
| CAR-05 | **On Rent cannot be selected manually.** It is set by Car Out and cleared by Car Return | M |
| CAR-06 | Users can switch a car between Available and At Maintenance manually, with an optional reason | M |
| CAR-07 | Marking a car as Sold is Owner-only. It records sale date, price, buyer name and buyer mobile, and archives the car | M |
| CAR-08 | Sold cars are hidden from active lists but remain searchable with full rental history | M |
| CAR-09 | Car detail page shows status, rental history, total earnings, and status-change history | M |
| CAR-10 | Filter/search cars by status, number, model | M |
| CAR-11 | Insurance expiry warning (30 days before) and expired alert | M |

### 3.4 Customers / Drivers (CUS)

| ID | Requirement | Pri |
|----|-------------|-----|
| CUS-01 | Store driver: full name, mobile number, license number | M |
| CUS-02 | On Car Out, search for an existing customer by name or mobile, or create a new one inline | M |
| CUS-03 | Customer page shows all their rentals, total paid, and total pending | M |
| CUS-04 | CNIC number and document images | F |

### 3.5 Car Out (OUT)

| ID | Requirement | Pri |
|----|-------------|-----|
| OUT-01 | Select an **Available** car | M |
| OUT-02 | Select or create the driver (customer) | M |
| OUT-03 | Guarantor name and mobile are **required** | M |
| OUT-04 | Rental type: Daily / Weekly / Monthly / Yearly | M |
| OUT-05 | Agreed rate per period (defaults to the car's standard rent, editable). The standard rent at that time is also saved for comparison | M |
| OUT-06 | Out date/time (defaults to now) and expected return date | M |
| OUT-07 | **Agreed total rent amount** (auto-suggested as rate × periods, editable) | M |
| OUT-08 | Optional: start KM, fuel level out, notes | M |
| OUT-09 | Optional: advance payment (amount + method) | M |
| OUT-10 | Optional: security deposit taken (amount + method). Can be 0 | M |
| OUT-11 | Next payment due date and optional due amount (rule P-9 in [05](05_Business_Rules.md)) | M |
| OUT-12 | On save, the car becomes **On Rent** and the rental becomes **Out** in a single step: either everything saves or nothing does | M |

### 3.6 Car Return (RET)

| ID | Requirement | Pri |
|----|-------------|-----|
| RET-01 | Select a rental with status **Out** | M |
| RET-02 | Return date/time (defaults to now) | M |
| RET-03 | Optional: end KM, fuel level in. These never block completion | M |
| RET-04 | Confirm or adjust the final rent amount (e.g. the car came back early or late) | M |
| RET-05 | Enter charges: fuel/mileage charge, damage charge (with notes), extra KM charge, other charge (with note) | M |
| RET-06 | Show a live summary: Total Bill, Paid, Pending, Deposit held | M |
| RET-07 | Optional on the same screen: record a final payment, use deposit, return deposit | M |
| RET-08 | Choose the car's next status: **Available** (default) or **At Maintenance** | M |
| RET-09 | Rental becomes **Returned**, or **Closed** automatically if fully settled | M |

### 3.7 Payments (PAY)

| ID | Requirement | Pri |
|----|-------------|-----|
| PAY-01 | Unlimited payments per rental | M |
| PAY-02 | Payment types: **Advance**, **Rent payment**, **Deposit taken**, **Deposit used**, **Deposit returned**, **Refund** | M |
| PAY-03 | Methods: Cash, Bank Transfer, Mobile Wallet, managed as a list so the Owner can add more | M |
| PAY-04 | Each payment: date, amount, type, method, optional reference (transaction ID), optional note | M |
| PAY-05 | Payments can be edited. Editing requires a reason, and the old and new values are saved in the audit log | M |
| PAY-06 | Payments are never deleted. The Owner can **void** one with a reason. Voided payments stay visible but are excluded from totals | M |
| PAY-07 | Payment history per rental, per customer, per car, and for all rentals | M |
| PAY-08 | Payments can be recorded while the rental is Out or Returned. After a rent payment on an Out rental, the user is asked to set the next due date/amount (optional) | M |

### 3.8 Rental lifecycle and history (REN)

| ID | Requirement | Pri |
|----|-------------|-----|
| REN-01 | Rental statuses: **Out → Returned → Closed** (plus **Void** for mistakes). No advance bookings in Phase 1 | M |
| REN-02 | Closed only when: car returned, pending = 0, and deposit balance = 0 | M |
| REN-03 | Status moves between Returned and Closed automatically as payments change | M |
| REN-04 | Rental history is never deleted. The Owner can void a rental entered by mistake (see [05](05_Business_Rules.md)) | M |
| REN-05 | Rental list filterable by status, car, customer, date range | M |
| REN-06 | Each rental has a human-readable number, e.g. `DR-0001` | M |

### 3.9 Reports (REP)

All users can view every report. Each report has a date range filter, defaulting to this week or this month.

| ID | Report | Pri |
|----|--------|-----|
| REP-01 | **Weekly income** (Mon–Sun, PKT) | M |
| REP-02 | **Monthly income** | M |
| REP-03 | **Pending payments by customer/driver** | M |
| REP-04 | **Payment history** (filter by date, method, type, car, customer) | M |
| REP-05 | **Outstanding balances**: every rental with pending > 0 or deposit balance > 0 | M |
| REP-06 | **Earnings per car** for a date range | M |
| REP-07 | **Rental history per car** | M |
| REP-08 | **Current vehicle status** | M |
| REP-09 | **Vehicles currently unavailable** (On Rent + At Maintenance, with since-when) | M |
| REP-10 | Export report to CSV | S |

### 3.10 Alerts (ALT)

| ID | Alert | Pri |
|----|-------|-----|
| ALT-01 | 🔴 **Payment overdue**: pending > 0 and payment due date has passed | M |
| ALT-02 | 🔴 **Payment pending**: rental Returned with pending > 0 or deposit not settled | M |
| ALT-03 | 🟡 **Payment due soon**: pending > 0 and due within 3 days | M |
| ALT-04 | 🔴 **Return overdue**: rental Out and expected return date has passed | M |
| ALT-05 | 🟡 Insurance expiring within 30 days / 🔴 expired | M |
| ALT-06 | Alerts shown in the app only. WhatsApp/SMS notifications are a future feature | M |

## 4. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Mobile-first**: every screen usable one-handed on a 360 px-wide phone. Also works well on desktop |
| NFR-02 | **Performance**: dashboard loads in under 2 s on 4G |
| NFR-03 | **Security**: all data behind login. Database-level Row Level Security. No data is readable with the public API key alone |
| NFR-04 | **Integrity**: money calculations happen in the database, never only in the browser. Multi-step actions (Car Out, Return, Sell) happen in one transaction |
| NFR-05 | **Auditability**: payment edits and voids, and car status changes, are logged with user, time and reason |
| NFR-06 | **No data loss**: no hard deletes. Supabase daily backups, plus a manual CSV export option |
| NFR-07 | **i18n**: every UI string goes through a translation layer. Layout supports right-to-left (RTL) for Urdu |
| NFR-08 | **Scalability**: the schema includes `branch_id` so multi-branch support needs no redesign |
| NFR-09 | **Cost**: runs within Supabase and Netlify free tiers at the current scale |
| NFR-10 | **Browser support**: latest Chrome (Android/PC), Safari (iOS), Edge |
| NFR-11 | **Formats**: currency `Rs 45,000`; dates `27 Sep 2026`; time zone Asia/Karachi |
