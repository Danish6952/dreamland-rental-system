# 04 — User Flows

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

Every flow assumes the user is logged in. "All users" means Owner and Staff.

---

## Flow 1 — Car purchase / addition

**Who:** all users. **Trigger:** Dreamland buys a new car, or a car is entered into the system for the first time.

1. **Cars** → **+ Add Car**.
2. Fill in the form:
   - **Required:** Car number, Model, Standard rent + period
   - **Optional:** Make, Year, Color, Registered to, Insurance expiry, Notes
3. Save.
   - If the car number already exists (ignoring spaces and case), show "Car ABC-123 already exists" with a link to it.
4. The car is created with status **Available**, and the first status-history row is written.
5. Result: the Car detail page opens, and the car appears in fleet counts and in Car Out selection.

**Editing later:** Car detail → **Edit**. Status is **not** on the edit form; it has its own actions (Flow 1b).

### Flow 1b — Maintenance

1. Car detail (status Available) → **Send to Maintenance** → optional reason ("AC repair") → confirm.
2. The status becomes **At Maintenance**, and a history row is written. The car is hidden from Car Out.
3. When it's back: **Mark Available** → status **Available**.
4. The button isn't shown when the car is On Rent or Sold.

```
Available ──(send to maintenance)──▶ At Maintenance ──(mark available)──▶ Available
```

---

## Flow 2 — Car Out

**Who:** all users. **Trigger:** a driver takes a car (customer comes and takes an available car).

1. Dashboard **Car Out** button (or Car detail → **Car Out**).
2. **Step 1 — Car:** choose from **Available** cars only. It's preselected if the flow started from a car.
3. **Step 2 — Driver:**
   - Search by name or mobile.
   - Existing customer found → select. Their details are prefilled and can be corrected.
   - Not found → **New customer**: Full name, Mobile, License number (all required).
4. **Step 3 — Guarantor:** Name, Mobile (both required).
5. **Step 4 — Rent terms:**
   - Rental type: Daily / Weekly / Monthly / Yearly
   - Agreed rate: prefilled from the car's standard rent, editable. If it differs, show "Standard: Rs 50,000/month".
   - Out date/time: default now
   - Expected return date: required
   - **Agreed total rent**: auto-suggested = rate × number of periods between out date and expected return, editable
   - Next payment due date: defaults to the expected return date (daily/weekly), or one month after out date (monthly/yearly), editable
   - Due amount (optional): e.g. Rs 45,000 due every month on a yearly rental
6. **Step 5 — Optional details:** Start KM, Fuel level out, Notes. Can be skipped.
7. **Step 6 — Money at handover (optional):**
   - Advance received: amount + method
   - Security deposit taken: amount + method (0 / empty = no deposit)
8. **Review screen:** car, driver, guarantor, terms, and a money summary (Bill so far = agreed rent, Paid = advance, Pending, Deposit held).
9. **Confirm Car Out.**
10. System (one transaction): creates rental **Out** → car **On Rent** → records advance and deposit payments.
11. Result: the Rental detail page, with a success message "DR-0012 — Corolla ABC-123 is out with Ali Khan".

**Errors:**
- Car taken by another user a moment ago → "This car is no longer available", back to Step 1.
- Validation errors are shown inline on the step they belong to.

On mobile each step is a screen with Next/Back. On desktop all steps are one long form.

---

## Flow 3 — Return process

**Who:** all users. **Trigger:** a driver brings the car back.

1. Dashboard "Cars out" list → rental → **Return Car** (or Rental detail → **Return Car**).
2. **Return details:**
   - Return date/time: default now
   - End KM (optional). If start KM exists, show the distance driven.
   - Fuel level in (optional)
3. **Rent confirmation:** the agreed total rent is shown. The user can adjust it if the car came back early or late. A hint shows the suggested amount for the actual duration.
4. **Charges:**
   - Fuel / mileage charge (Rs)
   - Damage charge (Rs) + damage notes
   - Extra KM charge (Rs)
   - Other charge (Rs) + note
5. **Live money summary:**
   ```
   Total bill        Rs 52,000   (rent 45,000 + fuel 2,000 + damage 5,000)
   Paid so far       Rs 45,000
   Pending           Rs  7,000
   Deposit held      Rs 20,000
   ```
6. **Settle now (optional):**
   - **Use deposit** toward pending: amount, capped at min(deposit held, pending)
   - **Record payment**: amount + method
   - **Return deposit**: amount + method, capped at the remaining deposit
   - The summary updates live.
7. **Car's next status:** Available (default) or At Maintenance (e.g. damaged), with an optional reason.
8. **Confirm Return.**
9. System (one transaction): saves return data → car status updated → payments recorded → rental becomes **Closed** if pending = 0 and deposit balance = 0, otherwise **Returned**.
10. Result: Rental detail page. If still Returned, it shows a "Pending Rs 7,000 · Deposit held Rs 0" banner, and the rental appears in 🔴 Payment pending alerts.

---

## Flow 4 — Payment process

**Who:** all users (void is Owner only).

### 4a. Record a payment
1. Entry points: Dashboard **Record Payment** (search for rental/driver/car), Rental detail → **Add Payment**, or an alert → **Record Payment**.
2. Choose the type:
   - **Rent payment**: instalment or final payment toward the bill
   - **Advance**: money taken at Car Out, or up-front during the rental
   - **Deposit taken**: extra deposit collected
   - **Use deposit**: apply the held deposit to the pending bill (no method, no money moves)
   - **Return deposit**: give the deposit back to the customer
   - **Refund**: return an overpayment to the customer
3. Amount, date (default today, can be earlier, not in the future), method (not for Use deposit), reference, note.
4. The system checks limits (see 05 §4) and shows the new balance before saving.
5. Save → balances recalculate → the rental may auto-close (Returned → Closed).
6. If the rental is still **Out** and money is still pending, the app asks: *"Next payment due?"* date + amount, prefilled one period ahead (e.g. +1 month). Skip keeps the current one.

### 4b. Edit a payment
1. Rental detail → payment → **Edit**.
2. Change the amount, date, method, reference or note. A **reason is required**.
3. Save → the audit log stores old and new values, user and time. Balances recalculate. The rental status may change (Closed → Returned if it becomes unsettled).
4. The payment shows "Edited" with its history.

### 4c. Void a payment (Owner only)
1. Payment → **Void** → reason required → confirm.
2. The payment stays in the list, struck through as "Voided", and is excluded from all totals. It's audited.

### 4d. Instalments example (monthly rental)
```
01 Oct  Car Out     Advance        Rs 10,000   Cash
                    Deposit taken  Rs 20,000   Bank Transfer
15 Oct  Rent payment               Rs 15,000   Mobile Wallet
01 Nov  Car Return  fuel 2,000, damage 5,000 → bill Rs 52,000
                    Use deposit    Rs  5,000
                    Rent payment   Rs 20,000   Cash
                    Return deposit Rs 15,000   Cash
                    → paid 50,000, pending 2,000 → status Returned
05 Nov  Rent payment               Rs  2,000   Cash → pending 0, deposit 0 → Closed ✅
```

---

## Flow 5 — Sold vehicle process

**Who:** Owner only (the button is hidden for Staff, and the database also rejects it).

1. Car detail → **⋯ → Mark as Sold**.
2. Pre-checks:
   - Car is **On Rent** → blocked: "Return the car first".
   - The car has rentals with pending money → **warning**, not a block: "2 rentals still have Rs 12,000 pending. Those balances stay open and collectable."
3. Form: Sale date (required), Sale price (required), Buyer name (required), Buyer mobile, Buyer CNIC, Notes.
4. Confirm by typing the car number (it's permanent).
5. System (one transaction): creates the `sold_cars` row → car status **Sold** → `archived_at` set → status history and audit written.
6. Result:
   - The car disappears from active lists, fleet counts and Car Out.
   - It's visible under **Cars → Sold** filter and the Sold vehicles report.
   - Its rentals, payments and earnings stay exactly as they were. Pending balances on its old rentals can still be collected.
7. **Sold is final.** If a sale was entered by mistake, the fix is an Owner-only database correction, which is documented in the admin notes and audited. There's no "unsell" button, to prevent accidents.

---

## Flow 6 — Void a rental (Owner only)

For a rental entered by mistake (wrong car, duplicate), not for a normal return.

1. Rental detail → **⋯ → Void rental** → reason required.
2. Allowed only if all its payments are voided first, or it has none. This avoids hiding real money.
3. If the rental was Out, the car goes back to **Available**.
4. The rental stays in history marked **Void** and is excluded from reports.

---

## Flow 7 — Long rental (monthly / yearly) with instalments

1. Car Out: type **Yearly**, agreed rate Rs 500,000/year, agreed total Rs 500,000, advance Rs 50,000, next due 1 Nov, due amount Rs 45,000.
2. 🟡 "Due in 3 days" appears on 29 Oct. 🔴 "Overdue" if nothing is paid by 1 Nov.
3. 1 Nov: rent payment Rs 45,000 → app asks for the next due date → 1 Dec, Rs 45,000 (prefilled).
4. This repeats each month. At the end of the year: Car Return → settle → Closed.
5. A rental can also be **extended** at any time: edit expected return date and agreed total (audited).
