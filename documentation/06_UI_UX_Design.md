# 06 — UI / UX Design

**Document status:** v1.1 — owner decisions applied (2026-09-27), awaiting final go-ahead

---

## 1. Design principles

1. **Phone first.** Most use happens standing next to a car, so the app works one-handed on a 360 px screen. Desktop is a wider version of the same layout.
2. **Money at a glance.** Every rental shows **Bill · Paid · Pending · Deposit** in the same order and colors everywhere.
3. **Three taps to the common tasks.** Car Out, Car Return and Record Payment are reachable from the dashboard in one tap.
4. **Optional means optional.** Skippable fields (KM, fuel, notes) are grouped under "More details" and never block saving.
5. **No surprises with money.** Before anything that moves money or changes status, a summary shows the result, e.g. "Pending will become Rs 2,000".
6. **Premium, calm, professional.** Dark navy, white, and a restrained gold accent.

## 2. Visual style

### 2.1 Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| `navy-950` | `#0A1628` | App bar, sidebar, login background |
| `navy-900` | `#0F2040` | Primary surfaces in dark areas |
| `navy-700` | `#1E3A66` | Hover / secondary |
| `gold-500` | `#C9A227` | Primary accent: main buttons, active nav, logo |
| `gold-400` | `#D8B64A` | Hover on gold |
| `gold-100` | `#F6EDD0` | Soft highlight backgrounds |
| `white` | `#FFFFFF` | Cards, content background |
| `slate-50` | `#F6F7F9` | Page background (content area) |
| `slate-500` | `#64748B` | Secondary text |
| `slate-900` | `#0F172A` | Primary text on light |

Status colors (always shown with a text label, never color alone):

| Meaning | Color | Example |
|---------|-------|---------|
| Available / Closed / Paid | Green `#16A34A` | "Available" badge |
| On Rent / Out | Blue `#2563EB` | "On Rent" |
| At Maintenance / Due soon | Amber `#D97706` | "At Maintenance", 🟡 |
| Overdue / Pending / Expired | Red `#DC2626` | 🔴 "Overdue 5 days" |
| Sold / Void / Archived | Gray `#6B7280` | "Sold" |

Gold is used only for the accent and primary buttons, so it keeps its premium feel.

### 2.2 Typography

- **Inter** for UI (400/500/600/700). **Noto Nastaliq Urdu** when Urdu is enabled.
- Money uses tabular numbers (`font-variant-numeric: tabular-nums`) so columns line up.
- Sizes: page title 20–24 px, card title 16 px, body 14–16 px, minimum 12 px for meta text.

### 2.3 Shape and spacing

- Cards: 12 px radius, subtle shadow, 16 px padding.
- Touch targets ≥ 44 × 44 px. Primary buttons are full-width on mobile.
- 4-px spacing scale (Tailwind default).

### 2.4 Logo placeholder

A text wordmark, **DREAMLAND** in gold letter-spaced caps on navy, with a small car-silhouette icon. It's one SVG file (`logo-placeholder.svg`), so the real logo can replace it later.

## 3. Navigation

### 3.1 Mobile (< 768 px): bottom navigation

```
┌─────────────────────────────────┐
│ ☰ DREAMLAND            🔔 3    │  ← top bar (navy): title, alerts bell with count
├─────────────────────────────────┤
│                                 │
│           page content          │
│                                 │
│                          (＋)   │  ← floating action button (gold): Car Out / Payment / Return
├─────────────────────────────────┤
│  🏠     🚗      📋      💰    ⋯  │  ← bottom nav
│ Home   Cars  Rentals Payments More│
└─────────────────────────────────┘
```

**More** contains: Customers, Reports, Sold cars, Settings (Users, Payment methods, Audit log, Language), Logout.

### 3.2 Desktop (≥ 1024 px): left sidebar

The navy sidebar has the logo, Dashboard, Cars, Rentals, Customers, Payments, Reports, Settings. The content area is on the right, and lists become tables.

### 3.3 Routes

| Route | Page |
|-------|------|
| `/login`, `/reset-password` | Auth |
| `/` | Dashboard |
| `/cars`, `/cars/new`, `/cars/:id`, `/cars/:id/edit`, `/cars/:id/sell` | Cars |
| `/rentals`, `/rentals/:id` | Rentals |
| `/car-out` (`?car=` preselect) | Car Out wizard |
| `/rentals/:id/return` | Car Return |
| `/customers`, `/customers/:id` | Customers |
| `/payments` | All payments |
| `/reports`, `/reports/:reportKey` | Reports |
| `/settings`, `/settings/users`, `/settings/payment-methods`, `/settings/audit-log` | Settings |

## 4. Screens

### 4.1 Login
Navy full-screen background, a centered white card, the logo, email, password, "Forgot password?". Errors in plain language ("Wrong email or password").

### 4.2 Dashboard
```
┌─────────────────────────────────┐
│ Good morning                    │
│ ┌───────┐┌───────┐┌───────┐     │
│ │  3    ││  3    ││  1    │     │  ← fleet status tiles (tap → filtered car list)
│ │Avail. ││On Rent││Maint. │     │
│ └───────┘└───────┘└───────┘     │
│ ┌─────────────────────────────┐ │
│ │ Pending      Rs 64,000      │ │  ← money card
│ │ Deposits held Rs 40,000     │ │
│ │ This week    Rs 38,000      │ │
│ │ This month   Rs 1,42,000    │ │
│ └─────────────────────────────┘ │
│ [ Car Out ] [ Payment ] [Return]│  ← quick actions
│ Alerts (4)                  All>│
│ 🔴 Overdue 5d · Ali · ABC-123 Rs 20,000 [Pay] │
│ 🔴 Pending · Bilal · LEA-77  Rs 7,000  [Pay]  │
│ 🟡 Due in 2d · Usman · RIC-9 Rs 45,000        │
│ 🟡 Insurance 12d · XYZ-456                    │
│ Cars out (3)                                  │
│ ABC-123 Corolla · Ali Khan · back 30 Sep · Rs 20,000 pending │
└─────────────────────────────────┘
```

Amounts use Pakistani lakh grouping (`Rs 1,42,000`).

### 4.3 Cars list
- Filter chips: All · Available · On Rent · At Maintenance · Sold.
- Search by number or model.
- Car card: number (bold), make/model/year/color, status badge, and a line depending on status:
  - On Rent: driver + return date
  - Maintenance: since date + reason
  - Available: standard rent
- Tap → Car detail.

### 4.4 Car detail
- Header: number, model, status badge, actions (**Car Out**, **Send to Maintenance / Mark Available**, **Edit**, ⋯ **Mark as Sold** for the Owner).
- Tabs: **Overview** (details, insurance, current rental) · **Rentals** (history) · **Earnings** (totals, billed vs received) · **Status history**.

### 4.5 Car Out wizard
Steps with a progress bar: **Car → Driver → Guarantor → Terms → More details (skippable) → Money → Review**. There's a sticky bottom bar with Back / Next and a mini-summary "Bill Rs 45,000 · Advance Rs 10,000". The driver step has a search box with instant results and a "+ New customer" option.

### 4.6 Rental detail
```
DR-0012 · Out                 [Return Car]
ABC-123 Corolla · Ali Khan 0300-1234567 📞
Guarantor: Imran 0312-7654321 📞
Out 01 Oct 10:30 · Expected back 31 Oct · Monthly Rs 45,000
┌──────────┬──────────┬──────────┬──────────┐
│ Bill     │ Paid     │ Pending  │ Deposit  │
│ 45,000   │ 25,000   │ 20,000   │ 20,000   │
└──────────┴──────────┴──────────┴──────────┘
Payments                          [+ Add]
01 Oct  Advance        10,000  Cash
01 Oct  Deposit taken  20,000  Bank
15 Oct  Rent           15,000  Wallet  (edited)
Charges · KM & fuel · Notes · History
```
Phone numbers are tap-to-call links. A WhatsApp tap-to-chat link (`wa.me`) is a cheap Phase 1 extra (see 09).

### 4.7 Car Return
One scrolling form: return details → rent confirmation → charges → a **live money summary card** (sticky on mobile) → settle now (use deposit / payment / return deposit) → next car status → **Confirm Return**.

### 4.8 Payment form (bottom sheet on mobile, modal on desktop)
Type as large segmented buttons (Rent · Advance · Use deposit · Return deposit · Deposit taken · Refund), then amount with a "Max Rs X" hint and a **Fill pending** shortcut, date, method chips, reference, note. It shows a before/after balance preview.

### 4.9 Reports
A list of report cards. Each report has a date range picker (This week / This month / Last month / Custom), summary numbers at the top, then a table (a card list on mobile), plus **Export CSV**. Simple bar charts for weekly/monthly income and earnings per car.

### 4.10 Settings
Profile and language · Users (Owner) · Payment methods (Owner) · Audit log (filter by table/user/date) · About.

## 5. Component library (`components/ui`)

| Component | Notes |
|-----------|-------|
| `Button` | variants: primary (gold), secondary (navy outline), danger, ghost. Loading state |
| `Input`, `MoneyInput`, `PhoneInput`, `DateInput`, `Select`, `Textarea` | labels always visible, inline error text, `inputmode` set (numeric keypad for money, KM and phone) |
| `SegmentedControl` | rental type, payment type, fuel level |
| `Card`, `StatTile`, `MoneySummary` | MoneySummary = the four-box Bill/Paid/Pending/Deposit |
| `StatusBadge` | car and rental statuses (icon + text + color) |
| `AlertItem` | severity icon, text, amount, action button |
| `BottomSheet`, `Modal`, `ConfirmDialog` | ConfirmDialog supports "type to confirm" for Sell |
| `Stepper` | Car Out wizard |
| `SearchBox` | debounced, used for car/customer/rental search |
| `EmptyState`, `Skeleton`, `ErrorState` | every list has all three states |
| `Toast` | success/error after actions |
| `DataTable` / `CardList` | a table on desktop that becomes cards on mobile |

## 6. UX details

- **Loading:** skeletons, not spinners, for lists and cards.
- **Offline or error:** "No internet — changes not saved" banner. Forms keep their input so nothing is lost.
- **Double submit:** buttons disable while saving. Database constraints are the final guard.
- **Confirmations:** needed only for irreversible or money-moving actions (Car Out, Return, Void, Sell), not for simple edits.
- **Formatting:** `Rs 45,000`, `Rs 1,42,000` (lakh grouping); dates `01 Oct 2026`; times 12-hour `10:30 AM`; phones `0300-1234567`.
- **Accessibility:** contrast ≥ 4.5:1 (gold text only on navy, never gold on white for body text), focus rings, labels on every input, status never shown by color alone.
- **Urdu (Phase 2):** `dir="rtl"`, mirrored layout via logical properties, Nastaliq font with more line-height.
- **Installable:** a web app manifest so users can "Add to Home Screen" (app icon, navy splash screen). A full offline PWA is not in Phase 1.
