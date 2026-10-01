# PLAN.md (v2) — Ticket Website for "งานลาบแรกพบ" at ร้านลาบก้อยซอยนานา

> **Audience:** an autonomous coding agent (Antigravity). Read this whole file first, then execute the phases in order.
> **Language rule:** code, comments, commits and docs in English. **All user-facing UI text in Thai** (strings provided below).
> **This file replaces PLAN.md v1.** v1 described a multi-zone concert with seat capacity. That model is gone. Do not reuse v1 tables or logic for rounds, zones, inventory, availability or seat holds.

---

## 0. Working Rules for the Agent

1. Follow the phases in section 9 **in order**. Finish a phase, run its tests, tick its checkboxes in this file, then commit (`phase-N: <summary>`).
2. **Never invent real-world values** (event date/time, bank accounts, PromptPay ID, domain, logo). Put them in `config/event.config.ts` and `.env.local` with obvious `TODO(owner)` placeholders and keep going. The site must run end-to-end on placeholders.
3. **Never commit secrets.** Provide `.env.example` only. The Supabase service-role key is used server-side only.
4. You cannot create third-party accounts. Whenever a manual step is needed (create Supabase project, set env vars, verify email sender, deploy, create first admin), write it into `HUMAN_TODO.md` as a numbered checklist with exact instructions, and continue working.
5. Keep scope tight. This must launch in about one week. Build only what is in sections 1–9. Section 10 is out of scope.
6. When something is ambiguous, choose the simplest option consistent with this file, record it in `DECISIONS.md`, and continue. Do not stop to ask.
7. Every phase ends with: lint passes, type-check passes, tests pass, app builds.

---

## 1. Product Summary

A mobile-first website where guests buy 20 THB tickets for a one-night live-music event at a restaurant, pay by PromptPay QR / bank transfer, upload a payment slip, and receive one QR code per ticket. Any free staff member reviews slips in an admin page on their phone. At the door, staff scan each ticket QR once and hand out a wristband.

### Fixed decisions (the owner made these; do not revisit)

| Topic | Decision |
|---|---|
| Event | "งานลาบแรกพบ", live music, at ร้านลาบก้อยซอยนานา (behind Khon Kaen University). **Single round.** |
| Ticket | **One ticket type, flat 20 THB** |
| Quantity per order | Not limited by the owner. Keep only a technical sanity ceiling (`maxTicketsPerOrder: 100`) to reject typos and abuse |
| Venue capacity | **No automatic seat cap, seat counting or seat hold.** Staff manage crowding on-site. The only control is a **manual "ร้านเต็มชั่วคราว" switch that staff flip themselves**; while it is on, new orders are blocked (section 6.7). No waitlist |
| Scanning | **Scan once at entry**, then hand out a wristband. **No check-out, no re-entry logic, no occupancy tracking** |
| QR | **One QR per ticket** (each person holds their own) |
| Payment | PromptPay QR with the exact amount pre-filled (20 × N), plus bank account as fallback |
| Slip review | Manual. **Any free staff member** can open the admin page and approve or reject |
| Split payments | Support both: (a) one order paid with several slips, (b) separate people placing separate orders |
| Order expiry | An order with no slip and no approved payment shows as expired **30 minutes** after creation (display-level only, see section 5) |
| Build approach | Custom code: Next.js + TypeScript + Supabase + Vercel |
| Launch target | About 1 week |

> PromptPay QR only pre-fills the amount. It does **not** confirm payment. Confirmation is always a staff action.

---

## 2. Tech Stack

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS, mobile-first
- **Database / Auth / Storage:** Supabase (Postgres; Auth for staff; private Storage bucket `slips`)
- **Hosting:** Vercel (also runs locally with `npm run dev`)
- **Validation:** zod on every API input
- **PromptPay QR:** `promptpay-qr` + `qrcode`
- **Ticket QR rendering:** `qrcode`
- **Camera scanning (staff):** `html5-qrcode` or `@zxing/browser`
- **Email:** provider-agnostic `lib/email.ts`; Resend by default, SMTP via `nodemailer` as an alternative (env switch). Email must never be the only way to get a ticket; the order page is the fallback
- **Fonts:** Thai-capable font via `next/font` (Noto Sans Thai or Prompt)
- **Tests:** Vitest
- **No cron and no realtime subscriptions needed.** Expiry is evaluated at read time; the admin page polls

Suggested layout:

```
/app
  /(public)        landing, /buy, /checkout/[code], /orders/[code], /privacy
  /admin           login, orders, order detail, dashboard
  /staff           scan, search
  /api             route handlers (all privileged logic runs server-side)
/lib               supabase clients, promptpay, email, tickets, rate-limit
/config            event.config.ts
/supabase          migrations/*.sql
/tests
PLAN.md  HUMAN_TODO.md  DECISIONS.md  README.md  .env.example
```

---

## 3. Configuration (placeholders — the owner fills these in)

`config/event.config.ts`:

```ts
export const EVENT = {
  name: "งานลาบแรกพบ",
  venue: "ร้านลาบก้อยซอยนานา (หลัง ม.ข.)",
  startsAt: null as string | null,   // TODO(owner): date/time shown on the site
  orderCodePrefix: "LRP",
  ticketPriceThb: 20,
  maxTicketsPerOrder: 100,           // technical sanity ceiling only; owner wants "unlimited"
  orderExpiryMinutes: 30,            // countdown shown to buyers; also restarted after a rejected slip
  banks: [
    { bank: "TODO", accountName: "TODO", accountNo: "xxx-x-xxxxx-x" }, // TODO(owner)
  ],
  branding: { primary: "#E4572E", logoPath: "/logo.svg", slogan: "" }, // TODO(owner)
};
```

`.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
PROMPTPAY_ID=                     # phone / national ID / e-wallet ID of the receiving account
EMAIL_PROVIDER=resend             # resend | smtp
RESEND_API_KEY=
EMAIL_FROM=
SMTP_URL=
APP_BASE_URL=http://localhost:3000
```

---

## 4. Data Model (Postgres / Supabase)

Migrations in `/supabase/migrations`. Enable RLS on **all** tables with **no public policies**. The browser never queries tables directly; all access goes through server route handlers using the service role.

There is **no** rounds, zones, inventory, order_items or availability table, and no seat counter. A single ticket type means an order only needs a quantity. The only venue-level state is one manual flag in the single-row `venue_status` table.

```sql
create extension if not exists pgcrypto;

create type order_status   as enum ('pending_payment','under_review','paid','cancelled');
create type payment_status as enum ('pending','approved','rejected');
create type ticket_status  as enum ('issued','checked_in','void');

create table orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- e.g. LRP-7K3Q9X
  access_token text not null,                -- random, required to view the order page
  buyer_name text not null,
  phone text not null check (phone ~ '^0[0-9]{9}$'),
  email text not null,
  backup_contact text,                       -- LINE / FB / IG (optional)
  quantity int not null check (quantity >= 1),
  unit_price_thb int not null check (unit_price_thb >= 0),   -- copied from config at order time
  total_thb int not null check (total_thb >= 0),
  status order_status not null default 'pending_payment',
  expires_at timestamptz,                    -- display-only deadline; NULL once any payment is approved
  consented_at timestamptz not null,
  admin_note text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  slip_path text not null,                   -- path in private bucket "slips"
  slip_sha256 text not null,                 -- duplicate-slip detection
  amount_thb numeric(10,2) not null check (amount_thb > 0),  -- claimed by buyer; staff may correct on approval
  transferred_at timestamptz not null,
  to_bank text not null,
  payer_name_or_last4 text not null,
  status payment_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text unique not null,                 -- random, unguessable, >= 16 chars (base32/hex)
  holder_name text,                          -- defaults to buyer_name
  status ticket_status not null default 'issued',
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz not null default now()
);

create table staff_profiles (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('admin','scanner'))
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- single-row table, created and seeded by the migration
create table venue_status (
  id int primary key default 1 check (id = 1),
  is_full boolean not null default false,    -- flipped manually by staff, never by the system
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into venue_status (id) values (1);

create index on orders (status, created_at);
create index on payments (order_id);
create index on payments (slip_sha256);
create index on tickets (order_id);
```

Server logic to implement as SQL functions (or one transaction per call in a server module):

- `create_order(...)`: validate, copy price from config, compute `total_thb = quantity * unit_price_thb`, generate `code` (retry on unique violation) and `access_token = encode(gen_random_bytes(24),'hex')`, set `expires_at = now() + orderExpiryMinutes`. Before inserting, read `venue_status`; if `is_full` is true, reject with error `venue_full` and create nothing. There are no other capacity checks.
- `approve_payment(payment_id, reviewer, corrected_amount?)`: atomic and idempotent, see below.
- `reject_payment(payment_id, reviewer, reason)`: same pattern.
- `recompute_order_status(order_id)`: see section 5.
- `issue_tickets(order_id)`: creates missing tickets up to `quantity`; idempotent.
- `check_in_ticket(code, staff_id)`: `update tickets set status='checked_in', checked_in_at=now(), checked_in_by=$2 where code=$1 and status='issued' returning ...`. Zero rows means already used or invalid.
- `set_venue_full(is_full, staff_id)`: updates the single `venue_status` row (sets `updated_by`, `updated_at`) and writes an `audit_log` entry. Allowed for both staff roles.

Two staff may press approve on the same slip at the same time. Use `update payments set status='approved', ... where id=$1 and status='pending' returning *`. If no row comes back, return "already reviewed by X at HH:MM" and change nothing. `recompute_order_status` must lock the order row (`select ... for update`) so two concurrent approvals cannot issue tickets twice.

---

## 5. Order and Payment State Machine

```
pending_payment ──(buyer uploads slip)──> under_review
under_review ──(staff approves; approved_sum >= total)──> paid          [tickets issued once]
under_review ──(staff approves; approved_sum <  total)──> pending_payment  [expires_at = NULL, show remaining amount]
under_review ──(staff rejects the last pending slip)──> pending_payment    [if nothing approved yet: expires_at = now() + orderExpiryMinutes]
any ──(staff cancels)──> cancelled                                         [tickets void]
```

Rules:

- `approved_sum = sum(amount_thb of approved payments)`. Order becomes `paid` when `approved_sum >= total_thb`. If `approved_sum > total_thb`, add an "overpaid" note for staff; no refund logic.
- **Expiry is display-only.** There is no `expired` enum value and no cron job. An order that is `pending_payment`, has no payments, and has `expires_at < now()` is shown as "หมดเวลาชำระเงิน" and hidden from staff's default "needs attention" list. **A buyer can still upload a slip to an expired order**; it moves to `under_review` and staff decide. This is safe because no seats are being held.
- Once any payment is approved, set `expires_at = NULL` so partly paid orders never show as expired.
- Tickets are created only when an order becomes `paid`: one ticket per `quantity`. Cancelling an order voids its tickets.

---

## 6. Features and Screens

### 6.1 Buyer flow (public)

1. **`/` Landing:** event name, venue, date/time (placeholder allowed), price "20 บาท/ใบ", CTA "ซื้อบัตร". No seat counts. While `venue_status.is_full` is true, replace the CTA with a disabled button and a banner `ร้านเต็มชั่วคราว — กรุณารอสักครู่ หรือสอบถามสตาฟหน้างาน`; when staff reopen, the CTA returns (see 6.7).
2. **`/buy`:** quantity stepper (min 1, max `maxTicketsPerOrder`), buyer name, phone (10 digits), email, optional LINE/FB/IG, consent checkboxes. Show live total (20 × N). Honeypot field. If the venue is marked full, show the same banner instead of the form; the API enforces this too, so a stale page cannot create an order.
3. **`/checkout/[code]?t=<token>`:** order summary, 30-minute countdown (when it reaches zero, show "หมดเวลา แต่ยังแนบสลิปได้ถ้าโอนแล้ว"), PromptPay QR for the **remaining** amount, bank account, "คัดลอกยอดเงิน" button, slip upload form (6.2).
4. **`/orders/[code]?t=<token>`:** status page (6.3).

Consent text (Thai):

- `ข้าพเจ้าได้ตรวจสอบข้อมูลถูกต้องแล้ว และยอมรับว่าบัตรไม่สามารถขอคืนเงินได้` (required)
- `ยินยอมให้ผู้จัดงานใช้ข้อมูลของข้าพเจ้าเพื่อยืนยันตัวตนและรับ wristband เข้างาน` (required)

### 6.2 Slip upload (repeatable per order)

Fields: slip file (image or PDF, max 10 MB, one file per submission), amount transferred (default = remaining amount), date & time on the slip, destination bank, payer name or last 4 digits of the account.

Server-side:

- Validate file type by **content sniffing**, not extension. Allow jpeg, png, webp, heic/heif (if feasible), pdf. Enforce 10 MB.
- Compute SHA-256 and store it in `payments.slip_sha256`.
- Upload to private bucket `slips` at `orders/{order_id}/{uuid}.{ext}`.
- Insert a `payments` row (`pending`), then `recompute_order_status`.
- Rate-limit per IP and per order (max 10 slips per order).

Split payments: (a) the same upload form is reused from the order page ("เพิ่มสลิปการโอน") and the page shows `paid so far / remaining`; (b) separate people simply create separate orders.

### 6.3 Order status page `/orders/[code]?t=<token>`

- Requires correct code **and** token; otherwise a generic "ไม่พบคำสั่งซื้อ".
- Shows status badge, quantity, total, approved amount, remaining amount, each submitted slip with its status and reject reason.
- While not `paid`/`cancelled`: "เพิ่มสลิปการโอน" form.
- When `paid`: **one QR code per ticket** (labelled ใบที่ 1/N), each with a "บันทึกรูป QR" button, plus "บันทึกทั้งหมด". This page is the fallback if email fails.
- "หาออเดอร์ของฉัน" form (order code + email) that re-sends the status link to the email on file.

Status labels (Thai): `pending_payment` = รอชำระเงิน, `under_review` = รอตรวจสอบสลิป, `paid` = ชำระเงินแล้ว, `cancelled` = ยกเลิกแล้ว. Slip statuses: รอตรวจ / อนุมัติแล้ว / ไม่ผ่าน.

### 6.4 Admin panel (`/admin`, role `admin`)

- Supabase Auth login (email + password). Multiple staff accounts. First admin created via `HUMAN_TODO.md` instructions.
- **Default view: "รอตรวจสลิป"**, oldest first, designed for one-handed phone use. The list **polls every 5 seconds**, shows a count badge, and offers an optional beep/vibration toggle for new slips (audio starts only after the first tap, as browsers require).
- **Slip review screen:** slip image (signed URL, 5 min) beside "ยอดที่ควรได้รับ" and the claimed amount. Big **อนุมัติ** button (one tap when claimed amount equals the remaining amount; otherwise show an amount field so staff can correct it to what the slip really shows) and **ปฏิเสธ** with reason presets plus free text.
- If another staff member already handled the slip, show "ตรวจแล้วโดย X เมื่อ HH:MM" and do nothing.
- **Duplicate warning:** if `slip_sha256` matches another payment, or another payment has the same amount + `transferred_at`, show a red banner linking to the other order.
- Review checklist shown next to each slip: amount matches · receiving account is correct · transfer time is plausible · reference number not seen before.
- Other actions: cancel order, edit admin note, resend email, revert a mistaken scan (admin only: set a ticket back to `issued`, audit-logged).
- Search by name, phone, email, order code. Filters by status.
- **Dashboard:** orders by status, tickets issued, confirmed revenue, pending-review count, **tickets checked in** (for information only; it never blocks anything).
- CSV export of paid orders and their tickets.
- Every admin action writes to `audit_log`.
- The venue-full switch (6.7) sits in the header of every admin page.

### 6.5 Staff scanner (`/staff`, roles `admin` and `scanner`)

- `/staff/scan`: camera QR scanner, large touch targets, works on a phone in portrait.
  - Valid and `issued` → show holder name and order code, big green button **"ให้ wristband แล้ว"**. One tap calls `check_in_ticket`.
  - Already `checked_in` → big red banner: `บัตรนี้เข้างานแล้วเมื่อ HH:MM` (and by whom). No other action, because there is no check-out.
  - `void` or unknown code → red banner `บัตรไม่ถูกต้อง`.
- `/staff/search`: manual lookup by name, phone, order code (fallback when the QR or camera fails), with the same check-in button.
- Check-in must be atomic (the `update ... where status='issued'` pattern) so two staff cannot both succeed on one ticket.
- Debounce repeated reads of the same QR for ~2 seconds to avoid double submissions.
- The venue-full switch (6.7) is also in the header of every staff page, because door staff know when the room is full.

### 6.6 Email (via `lib/email.ts`, Thai templates)

- **Order created:** order code, status link, payment reminder, deadline.
- **Slip received:** "เราได้รับสลิปแล้ว อยู่ระหว่างตรวจสอบ".
- **Paid:** ticket QR codes (or a link to them), status link, how to collect wristband at the door.
- **Partial approval:** amount received, remaining amount, link.
- **Slip rejected:** reason + link to re-upload.

Email failures must be logged and must never break the main action. Add a "resend" action in admin.

### 6.7 Venue-full switch (manual)

The owner wants staff, not the system, to decide when the room is full.

- A prominent switch **"ร้านเต็มชั่วคราว"** in the header of every `/admin` and `/staff` page, usable by **both roles** (`admin` and `scanner`).
- Turning it **on** asks for one confirmation (`หยุดรับออเดอร์ใหม่?`); turning it **off** is a single tap. Show who flipped it and when. Every toggle goes to `audit_log`.
- While **on**: new orders are blocked (landing and `/buy` show the banner from 6.1, and `create_order` returns `venue_full`). **Not affected:** existing orders can still upload slips and be approved, paid tickets stay valid, and scanning continues. Staff decide at the door.
- The system never turns it on or off by itself and keeps no seat counter.
- Public pages read the flag with `cache: 'no-store'` and re-fetch it every 10 seconds. A buyer who submits at the exact moment of a flip may still get through; this is acceptable.
- Thai strings: public banner `ร้านเต็มชั่วคราว — กรุณารอสักครู่ หรือสอบถามสตาฟหน้างาน`; staff label `ร้านเต็มชั่วคราว (หยุดรับออเดอร์ใหม่)`.

---

## 7. Security and Privacy

- RLS on, no public policies; all data access via server route handlers.
- Slips are private (they contain bank details). Staff view them only through short-lived signed URLs.
- Order pages require the unguessable `access_token`. Ticket codes are >= 16 random characters.
- Validate every input with zod (Thai phone `^0\d{9}$`, email, quantity bounds, file type and size).
- Rate limits on: create order, slip upload, order lookup/resend. Honeypot on the buy form.
- Security headers (CSP, X-Frame-Options, Referrer-Policy) in `next.config`.
- PDPA: `/privacy` page in Thai stating what is collected (name, phone, email, optional social contact, payment slips), purpose (order handling, identity check at entry), retention (delete after the event plus a stated period), and a contact channel (placeholder). Provide an admin action or script to purge personal data and slips after the retention period.
- Never log slip contents or full personal data.

---

## 8. Testing Requirements

1. **Payment logic unit tests:** exact payment, partial payment, overpayment, rejection after partial approval, cancel after paid (tickets void).
2. **Idempotency/concurrency:** two staff approving the same slip → exactly one succeeds; two different slips on one order approved simultaneously → tickets issued exactly `quantity` times, never more.
3. **Expiry behaviour:** an order past `expires_at` with no payment shows as expired but still accepts a slip and moves to `under_review`; an order with an approved payment never shows as expired.
4. **Upload tests:** wrong MIME (e.g. .exe renamed .jpg), over 10 MB, duplicate hash flagged.
5. **Scanner tests:** valid scan → checked in; second scan of the same ticket → rejected with the original time; unknown code; void ticket; two simultaneous scans → exactly one succeeds.
6. **Access control tests:** order page without token → not found; admin routes without login → redirected; `scanner` role cannot open admin pages.
7. **Venue-full switch:** with the flag on, `create_order` is rejected with `venue_full` and no order row is created; an existing unpaid order can still upload a slip and be approved; paid tickets still scan; turning the flag off restores ordering; both `admin` and `scanner` roles can toggle it; every toggle appears in `audit_log`.
8. **Manual QA checklist** in `README.md`: iPhone Safari, Android Chrome, slow network, Thai text rendering, long names, camera permission denied, bright-sun phone screen readability for QR.

---

## 9. Phases (execute in order; tick when done)

### Phase 0 — Scaffold
- [ ] Next.js + TS + Tailwind, lint/format/type-check, Vitest
- [ ] `config/event.config.ts`, `.env.example`, `HUMAN_TODO.md`, `DECISIONS.md`
- [ ] Thai font, base layout, brand tokens, mobile-first shell

### Phase 1 — Database and payment logic
- [ ] Migrations for all tables, enums, indexes; RLS enabled everywhere
- [ ] `venue_status` table; `create_order` (rejects when full), `set_venue_full`, `approve_payment`, `reject_payment`, `recompute_order_status`, `issue_tickets` (idempotent), `check_in_ticket`
- [ ] Unit/concurrency tests from sections 8.1–8.3 pass

### Phase 2 — Buyer ordering and checkout
- [ ] Landing page and `/buy` form (validation, consent, honeypot)
- [ ] Order creation API (server-side price, sanity ceiling)
- [ ] `/checkout/[code]` with countdown, PromptPay QR for the remaining amount, bank details
- [ ] Venue-full banner and disabled CTA on landing and `/buy` (re-fetch every 10 s, `no-store`); API rejects with `venue_full`

### Phase 3 — Slips and order page
- [ ] Slip upload API (content sniffing, size, hash, private storage, rate limit)
- [ ] Multiple slips per order; paid/remaining display
- [ ] `/orders/[code]` status page and "find my order" email resend

### Phase 4 — Admin
- [ ] Staff auth, roles, audit log
- [ ] "รอตรวจสลิป" queue with 5-second polling, badge, optional beep
- [ ] Slip review screen: approve (with amount correction), reject, duplicate warning, already-reviewed handling
- [ ] Search/filters, cancel, revert scan, dashboard, CSV export
- [ ] Venue-full switch in admin and staff headers (6.7), with confirmation when turning on

### Phase 5 — Email and tickets
- [ ] `lib/email.ts` + all Thai templates; resend action
- [ ] Ticket QR rendering on the order page and in the paid email; save-image buttons

### Phase 6 — Staff scanner
- [ ] Camera scanner page, atomic check-in, banners, debounce
- [ ] Manual search fallback
- [ ] Scanner tests (8.5)

### Phase 7 — Hardening and handoff
- [ ] Security headers, rate limits, `/privacy` page
- [ ] All tests in section 8 pass; manual QA checklist written
- [ ] `README.md`: local setup, env vars, Supabase setup, Vercel deploy, admin user creation, event-night runbook
- [ ] `HUMAN_TODO.md` complete and ordered
- [ ] Final review against section 11

---

## 10. Out of Scope (do not build)

- Any automatic seat/capacity cap or seat counting, seat holds, waitlist, rolling occupancy (the only venue control is the manual switch in 6.7)
- Check-out scanning, self check-out, auto check-out, re-entry rules
- Rounds, multiple zones or price tiers
- Automatic slip verification via API, or a payment gateway with auto-confirmation
- Refund handling, ticket transfers, promo codes, multi-event support
- LINE Notify / SMS notifications, physical ticket shipping

---

## 11. Definition of Done

- A buyer on a phone can: choose a quantity → get a PromptPay QR with the right amount → upload a slip → see status → receive and save one QR per ticket after approval.
- Split payment works both ways (several slips on one order; separate orders).
- Staff can review slips on a phone, approve or reject in one or two taps, and see duplicate-slip warnings; two staff cannot double-process a slip or double-issue tickets.
- Staff can scan a ticket QR on a phone, tap to confirm the wristband, and a second scan of the same ticket is clearly rejected.
- An expired unpaid order can still receive a slip and be reviewed.
- Staff can mark the venue full from a phone; new orders are then blocked on the site and in the API until a staff member reopens. Existing orders, payments and tickets are unaffected.
- No secrets in the repo; slips are private; order pages need a token.
- The app deploys to Vercel with documented steps; `HUMAN_TODO.md` lists everything the owner must do by hand.

---

## 12. Info the Owner Must Provide Before Launch (tracked in HUMAN_TODO.md)

1. Event date, start time, and doors-open time
2. Receiving bank account(s) and PromptPay ID
3. Final event name, logo, brand colors, slogan, and a domain if wanted
4. Contact channel and retention period for the privacy notice
5. Accounts: Supabase project, email sender setup, Vercel, and the first admin user
