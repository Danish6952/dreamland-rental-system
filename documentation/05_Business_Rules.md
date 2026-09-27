# 05 — Business Rules

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

Rules are numbered so that code, tests and discussions can refer to them (e.g. "rule P-4").
Rules tagged **[Qn]** were decided by the owner on 2026-09-27; see **§9 Decisions log**.

---

## 1. Car status rules (C)

| # | Rule |
|---|------|
| C-1 | Car statuses are **Available**, **On Rent**, **At Maintenance**, **Sold**. |
| C-2 | A new car starts as **Available**. |
| C-3 | **On Rent cannot be selected manually.** Only Car Out sets it. Only Car Return (or voiding an Out rental) clears it. |
| C-4 | Users can switch a car manually only between **Available ↔ At Maintenance**. |
| C-5 | A car that is On Rent cannot be sent to maintenance directly. Return it first and choose "At Maintenance" as the next status. |
| C-6 | Only **Available** cars can go out. At Maintenance, On Rent and Sold cars are not selectable. |
| C-7 | Only the **Owner** can mark a car **Sold**. It must be Available or At Maintenance, with no Out rental. |
| C-8 | **Sold is final and archived.** A sold car can't be edited, rented or changed back. Its history stays. |
| C-9 | Every status change records who, when, from → to, and a reason or rental reference. |
| C-10 | Insurance: 🟡 warning from 30 days before `insurance_expiry`, 🔴 when expired. An expired insurance date **warns** at Car Out but doesn't block it. **[Q11]** |

```
                 ┌────────── Car Out (auto) ──────────┐
                 │                                    ▼
  [new] ──▶ Available ◀─── Car Return (auto) ─── On Rent
              ▲   │                                   │
   mark avail │   │ send to maint.        Car Return  │
              │   ▼                   (next = maint.) │
          At Maintenance ◀────────────────────────────┘
              │   ▲
              └───┴──── Owner: Mark Sold ──▶ Sold (final, archived)
                        (from Available or At Maintenance)
```

## 2. Rental lifecycle rules (R)

| # | Rule |
|---|------|
| R-1 | Rental statuses are **Out → Returned → Closed**. **Void** is for mistakes. There are **no advance bookings** in Phase 1: a rental starts at Car Out. **[Q1]** |
| R-2 | **Out**: the car has left. Created by Car Out. The car is On Rent. |
| R-3 | **Returned**: the car is back, but pending > 0 **or** deposit balance > 0. |
| R-4 | **Closed**: the car is back **and** pending = 0 **and** deposit balance = 0. |
| R-5 | Returned ↔ Closed is **automatic**. The system rechecks after every return, payment, payment edit or void, and charge change. A Closed rental whose payment is later edited reopens to Returned if it's no longer settled. |
| R-6 | A rental never goes from Returned or Closed back to Out. |
| R-7 | An Out rental is never auto-closed, even if fully paid in advance. It has to be returned first. |
| R-8 | A car has at most **one** Out rental at any time. |
| R-9 | Guarantor name and mobile are required for every rental. |
| R-10 | The driver's name, mobile and license are **copied onto the rental** at Car Out. Later edits to the customer don't change past rentals. |
| R-11 | Rental history is **never deleted**. Only the Owner can **void** a rental, for data-entry mistakes, and only after its payments are voided (Flow 7). Void rentals are excluded from all totals and reports. |
| R-12 | Charges (fuel, damage, extra KM, other) and the rent amount can still be corrected after return. The change is audited and the status is rechecked. |

## 3. Rent and bill calculation (B)

| # | Rule |
|---|------|
| B-1 | Each car has a **standard rent** and a period (e.g. Rs 50,000 / monthly). It's the default, not a rule. |
| B-2 | Each rental stores its own **agreed rate** (e.g. Rs 45,000 / monthly) and the standard rent at that time, for comparison. |
| B-3 | **Agreed total rent** (`rent_amount`) = the rent for the whole rental. The system suggests `agreed_rate × periods`, and the user can override it. **[Q3]** |
| B-4 | Period count for the suggestion: daily = calendar days (minimum 1); weekly = ceil(days ÷ 7); monthly = ceil(days ÷ 30); yearly = ceil(days ÷ 365). Days are counted from the out date to the expected return date, or the actual return date at return. |
| B-5 | At return, the system shows the suggestion for the actual duration. The user confirms or edits `rent_amount`. The system **never changes the rent automatically**. |
| B-6 | **Total Bill = rent + fuel + damage** (+ extra KM charge + other charge). The last two are optional and default to 0. |
| B-7 | Fuel/mileage charge is entered **manually** in Phase 1. Mileage-based calculation is a future feature. |
| B-8 | Damage charge is entered manually and decided internally. Damage notes are recommended whenever the charge is > 0. |
| B-9 | Every amount is ≥ 0 and in whole rupees or 2 decimals. The UI works in whole rupees. |

## 4. Payment rules (P)

| # | Rule |
|---|------|
| P-1 | A rental can have any number of payments. |
| P-2 | **Paid = advance + rent payments + deposit used − refunds.** Voided payments are always excluded. |
| P-3 | **Pending = Total Bill − Paid.** |
| P-4 | **No overpayment:** an Advance or Rent payment can't make Pending < 0. The form shows "Maximum Rs X". If a later bill reduction causes an overpayment, the rental shows 🔴 "Overpaid Rs X" and can't close until a **Refund** is recorded. **[Q4]** |
| P-5 | Payment methods: Cash, Bank Transfer, Mobile Wallet. The Owner can add more. A method is required for every type except **Deposit used**. |
| P-6 | Payment date defaults to today (PKT) and may be earlier, but not in the future. |
| P-7 | **Income** (for income reports) = advance + rent payments + deposit used − refunds, by payment date. **Deposit taken and deposit returned are not income**: that money is held on the customer's behalf. **[Q7]** |
| P-8 | **Editing** a payment is allowed for all users, needs a reason, and is logged with old and new values. **Voiding** is Owner only, needs a reason, and keeps the payment visible as voided. Hard delete is never allowed. **[Q5]** |
| P-9 | **Next payment due:** each rental has a `payment_due_date` and an optional `payment_due_amount`. Default: expected return date (daily/weekly), or one month after out date (monthly/yearly). After each rent payment on an Out rental, the user is prompted to set the next due date/amount, prefilled one period ahead. If no due amount is set, the whole pending amount is treated as due. **[Q2]** |
| P-10 | **Advance** = money taken up front at Car Out, or during the rental before the final bill. It's optional and counts toward Paid like any rent payment. **[Q1]** |

## 5. Deposit rules (D)

| # | Rule |
|---|------|
| D-1 | A security deposit is **optional**. It can be 0 and can differ per customer. |
| D-2 | **Deposit balance = deposit taken − deposit returned − deposit used.** |
| D-3 | **Deposit used** moves held deposit into Paid. It can pay **any** pending amount: damage, fuel or rent. **[Q13]** |
| D-4 | Deposit used ≤ current deposit balance **and** ≤ current pending. |
| D-5 | Deposit returned ≤ current deposit balance. |
| D-6 | Deposit balance can never be negative. |
| D-7 | A rental can't be Closed while deposit balance > 0. The deposit must be fully used or returned. |
| D-8 | The dashboard shows **Deposits currently held** = Σ deposit balance across all rentals. |
| D-9 | Deposit can be taken at Car Out or later. It can be used or returned at return or later. |

### Worked example

Customer B, monthly rental. Car standard Rs 50,000, agreed Rs 45,000.

| Step | Transaction | Bill | Paid | Pending | Deposit balance | Status |
|------|-------------|-----:|-----:|--------:|----------------:|--------|
| Car Out | agreed rent 45,000; advance 10,000; deposit taken 20,000 | 45,000 | 10,000 | 35,000 | 20,000 | Out |
| Day 15 | rent payment 15,000 | 45,000 | 25,000 | 20,000 | 20,000 | Out |
| Return | + fuel 2,000 + damage 5,000 | 52,000 | 25,000 | 27,000 | 20,000 | Returned |
| Return | deposit used 5,000 | 52,000 | 30,000 | 22,000 | 15,000 | Returned |
| Return | rent payment 20,000 | 52,000 | 50,000 | 2,000 | 15,000 | Returned |
| Return | deposit returned 15,000 | 52,000 | 50,000 | 2,000 | 0 | Returned |
| +4 days | rent payment 2,000 | 52,000 | 52,000 | **0** | **0** | **Closed** ✅ |

Customer A, same car, no deposit, no advance, paid in full at return, so it goes straight to **Closed** at return.

## 6. Alert rules (A)

Evaluated on non-void rentals with status Out or Returned. "Today" is PKT.

| # | Alert | Condition | Severity |
|---|-------|-----------|----------|
| A-1 | Payment overdue | pending > 0 AND payment_due_date < today. Amount shown = min(due amount, pending) | 🔴 |
| A-2 | Payment pending | status = Returned AND (pending > 0 OR deposit balance > 0) AND not already overdue | 🔴 |
| A-3 | Payment due soon | pending > 0 AND today ≤ payment_due_date ≤ today + 3 days | 🟡 |
| A-4 | Return overdue | status = Out AND expected_return_date < today | 🔴 |
| A-5 | Insurance expiring | 0 ≤ insurance_expiry − today ≤ 30 days (non-sold cars) | 🟡 |
| A-6 | Insurance expired | insurance_expiry < today (non-sold cars) | 🔴 |
| A-7 | Overpaid | pending < 0 | 🔴 |

Alerts are sorted by severity, then by days overdue (most first). Each alert links to the rental or car, with a one-tap **Record Payment**.

## 7. Validation rules (V)

| # | Field / action | Rule |
|---|----------------|------|
| V-1 | Car number | Required, 2–20 chars, letters/digits/space/dash. Unique after normalization |
| V-2 | Model | Required, ≤ 60 chars |
| V-3 | Year | Optional, 1980 … current year + 1 |
| V-4 | Standard rent | Required, ≥ 0 |
| V-5 | Mobile numbers (driver, guarantor, buyer) | Pakistani mobile: `03XXXXXXXXX` (11 digits). Also accepts `+923…` / `923…`, stored as `03…` |
| V-6 | Driver full name / guarantor name | Required, 2–80 chars |
| V-7 | License number | Required, 3–30 chars |
| V-8 | Guarantor mobile | Warning (not a block) if it equals the driver's mobile |
| V-9 | Expected return date | Required, ≥ out date |
| V-10 | Return date/time | ≥ out date/time, not in the future |
| V-11 | End KM | Optional. If both are set, must be ≥ start KM. Warn if distance > 10,000 km |
| V-12 | Agreed rate / rent amount / charges | ≥ 0, max Rs 10,000,000 |
| V-13 | Payment amount | > 0, within the limits in P-4, D-4, D-5 |
| V-14 | Payment date | Not in the future; not before the rental's out date |
| V-15 | Other charge | Note required when > 0 |
| V-16 | Edit payment / void anything | Reason required, ≥ 5 characters |
| V-17 | Sale | Sale date required, not in the future; price ≥ 0; buyer name required; confirmation by typing the car number |
| V-18 | Optional fields | KM, fuel level, notes and advance **never block** saving |

Validation runs in **both** the form (Zod, instant feedback) and the database (constraints and functions, final authority).

## 8. Access rules (X)

| # | Rule |
|---|------|
| X-1 | Only logged-in, active users can see any data. |
| X-2 | All active users can view everything, including financial reports. |
| X-3 | Owner-only: mark Sold, void payment or rental, archive car or customer, manage users and payment methods. |
| X-4 | Nobody can hard-delete records. The audit log can't be edited by anyone. |

## 9. Decisions log (owner, 2026-09-27)

| Q | Decision |
|---|----------|
| **Q1** | **No advance bookings in Phase 1.** "Advance" means money taken from the customer at Car Out (or during the rental) if they agree. There are no Booked/Cancelled statuses. |
| **Q2** | Rentals can also be **yearly**, so `yearly` is added as a rental type. Overdue works from a **next payment due date + optional due amount** per rental, re-set after each payment (P-9). Full instalment schedules move to Phase 2. |
| **Q3** | The rent never changes automatically on early or late return. The system suggests an amount, and the user decides. |
| **Q4** | Overpayment is blocked. A Refund is used if money must go back. |
| **Q5** | All users can edit payments, with a reason (audited). Only the Owner can void. |
| **Q6** | One customer record per mobile number. |
| **Q7** | Income is cash basis. Deposit taken/returned is not income; deposit used is. |
| **Q8** | The report week is Monday–Sunday, PKT. |
| **Q9** | **TypeScript** (chosen by the developer, at the owner's request). |
| **Q10** | Users are created from the Supabase dashboard in Phase 1. In-app invite comes in Phase 2. |
| **Q11** | Expired insurance warns at Car Out but doesn't block it. |
| **Q12** | Rental numbers use the format `DR-0001`. |
| **Q13** | The deposit can pay any pending amount (rent, fuel, damage). |
| **Q14** | Amounts use lakh-style grouping: `Rs 1,42,000`. |
