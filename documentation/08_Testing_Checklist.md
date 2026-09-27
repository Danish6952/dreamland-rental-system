# 08 — Testing Checklist

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

Run the whole checklist before launch (M6), and the affected sections after each change.
Test on: **Android Chrome**, **iPhone Safari**, **PC Chrome/Edge**.

Legend: ☐ not tested · ✅ pass · ❌ fail (note the issue)

---

## 1. Functional tests

### 1.1 Authentication
- ☐ Log in with valid credentials → dashboard
- ☐ Wrong password → clear error, no details leaked
- ☐ Sign-up page / API sign-up is not possible
- ☐ Logout clears the session. The back button doesn't show data
- ☐ Password reset email arrives and the link works
- ☐ Deactivated user is signed out and sees "Account disabled"
- ☐ Session persists after closing and reopening the browser on a phone

### 1.2 Cars
- ☐ Add a car with required fields only → status Available
- ☐ Add a car with all fields
- ☐ Edit car details
- ☐ Status field is not editable in the edit form
- ☐ Send to maintenance → At Maintenance, history row with reason
- ☐ Mark available → Available
- ☐ At Maintenance car is not selectable in Car Out
- ☐ Filters and search work (number, model, each status)
- ☐ Insurance 20 days out → 🟡 alert; expired → 🔴 alert

### 1.3 Car Out
- ☐ Only Available cars are listed
- ☐ Existing customer found by mobile and by name
- ☐ New customer created inline
- ☐ Agreed rate defaults to standard rent. Changing it shows the difference
- ☐ Agreed total suggestion: daily 3 days × 5,000 = 15,000; weekly 10 days → 2 weeks; monthly 45 days → 2 months; yearly 400 days → 2 years
- ☐ Save with no KM, no fuel, no advance, no deposit → succeeds
- ☐ Save with advance + deposit → both payments created
- ☐ After save: rental Out, car On Rent, status history has a rental reference
- ☐ Two users send the same car out at the same time → exactly one succeeds

### 1.4 Car Return
- ☐ Return with no KM/fuel → succeeds
- ☐ Charges add to the bill correctly
- ☐ Adjusting rent amount updates the summary live
- ☐ Next status At Maintenance → car At Maintenance
- ☐ Fully paid and no deposit → rental goes straight to **Closed**
- ☐ Pending > 0 → **Returned** + 🔴 Payment pending alert
- ☐ Deposit balance > 0 with pending 0 → **Returned** (not Closed)

### 1.5 Payments
- ☐ Each type recorded correctly (advance, rent, deposit taken/used/returned, refund)
- ☐ Multiple instalments sum correctly
- ☐ The worked example in 05 §5 gives exactly the table values at every step and ends **Closed**
- ☐ Edit payment requires a reason. The audit log shows old/new values and the user
- ☐ Editing a payment on a Closed rental so it's unsettled → rental reopens to Returned
- ☐ Owner void → excluded from totals, still visible as Voided
- ☐ New payment method added by the Owner appears in forms. A deactivated one disappears from forms but stays on old payments

### 1.6 Rental lifecycle
- ☐ Out rental fully prepaid is **not** auto-closed before return (R-7)
- ☐ Rental number sequence DR-0001, DR-0002 …
- ☐ Driver details on an old rental don't change when the customer is edited (R-10)
- ☐ Owner voids a mistaken Out rental (no payments) → car Available, rental Void, excluded from reports
- ☐ Void a rental with active payments → blocked
- ☐ Yearly rental: next-due prompt after a rent payment, prefilled +1 month. 🟡/🔴 alerts follow the due date and show the due amount
- ☐ Extending a rental (new expected return + agreed total) is audited and recalculates the balance

### 1.7 Sold vehicle
- ☐ Staff: no Sell button. Direct API call rejected
- ☐ Owner: sell an Available car → Sold, archived, `sold_cars` row, hidden from active lists and counts
- ☐ Selling an On Rent car → blocked
- ☐ Sold car with old pending rental → warning shown. The balance remains collectable after sale
- ☐ Sold car history, earnings and payments unchanged
- ☐ Sold car cannot be edited or changed back

### 1.8 Dashboard and alerts
- ☐ Fleet counts match the car list
- ☐ Pending total = Σ pending in the Outstanding balances report
- ☐ Deposits held = Σ deposit balance
- ☐ Income this week/month = the Weekly/Monthly income report
- ☐ Each alert type appears under its exact condition and disappears when resolved
- ☐ Due-soon boundary: due in exactly 3 days → 🟡; 4 days → none
- ☐ "Today" uses Pakistan time (test near midnight PKT)

### 1.9 Reports
- ☐ Weekly income Mon–Sun matches a manual sum of payments
- ☐ Deposit taken/returned **not** counted as income. Deposit used **is** counted
- ☐ Voided payments and void rentals excluded
- ☐ Pending by customer matches each customer page
- ☐ Earnings per car matches each car detail
- ☐ CSV export opens correctly in Excel (Rs values numeric, dates readable)

## 2. Validation tests

- ☐ Duplicate car number (`abc 123` vs `ABC-123`) → rejected
- ☐ Year 1970 / next year + 2 → rejected
- ☐ Negative rent / charge → rejected
- ☐ Mobile formats: `03001234567` ✅, `+923001234567` ✅ (stored `03…`), `0300123` ❌, `0512345678` (landline) ❌
- ☐ Missing guarantor name or mobile → blocked
- ☐ Expected return before out date → blocked
- ☐ Return date before out date / in the future → blocked
- ☐ End KM < start KM → blocked. End KM without start KM → allowed
- ☐ Payment amount 0 or negative → blocked
- ☐ Rent payment greater than pending → blocked with "Max Rs X"
- ☐ Deposit used > deposit balance, or > pending → blocked
- ☐ Deposit returned > deposit balance → blocked
- ☐ Payment date in the future → blocked
- ☐ Other charge > 0 without a note → blocked
- ☐ Edit or void without a reason (or < 5 chars) → blocked
- ☐ Every rule above is **also** rejected when sent directly to the API, bypassing the UI (database enforcement)

## 3. Security tests

- ☐ **RLS enabled on every table** (SQL check: `select relname from pg_class where relrowsecurity = false and relnamespace = 'public'::regnamespace` returns nothing)
- ☐ The anon key with no login cannot read any table or view (test with curl)
- ☐ Logged-in **deactivated** user gets no data
- ☐ Staff cannot: sell, void, archive, manage users or payment methods (UI hidden **and** API rejected)
- ☐ Nobody can DELETE from any table via the API
- ☐ Nobody can update or delete `audit_log`
- ☐ Direct `UPDATE cars SET status = 'on_rent'` → rejected
- ☐ Direct insert into `payments` or `rentals` (bypassing functions) → rejected
- ☐ Service-role key is not in the frontend bundle (search `dist/` for it)
- ☐ `.env` is not committed to git
- ☐ Sign-ups disabled in Supabase Auth settings
- ☐ HTTPS only. Supabase Auth redirect URLs limited to the Netlify domain
- ☐ Text inputs with `<script>` render as plain text (no XSS)
- ☐ `documentation/` is not reachable on the deployed site

## 4. UI / device tests

- ☐ Every screen at 360 px, 390 px (iPhone), 768 px, 1280 px: no horizontal scroll, nothing cut off
- ☐ Touch targets ≥ 44 px. Numeric keypad appears for money, KM and phone
- ☐ iPhone: bottom nav not hidden behind the home bar (safe-area insets)
- ☐ Loading skeleton, empty state and error state on every list
- ☐ Slow 3G simulation: dashboard usable, no double submissions
- ☐ "Add to Home Screen" works on Android and iPhone
- ☐ Amounts and dates formatted as specified

## 5. Acceptance (owner sign-off)

- ☐ The Owner runs one real rental end to end (out → payments → return → closed)
- ☐ Brother runs one on his phone
- ☐ The Owner confirms the reports match their own calculation for one week
