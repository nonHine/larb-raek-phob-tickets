# DECISIONS.md — Technical Architecture & Design Decisions

This document records architectural, technical, and domain decisions made during the development of "งานลาบแรกพบ" ticket platform.

---

## 1. Single Ticket & No Inventory Reservation
- **Decision:** Flat 20 THB ticket price, single round, no inventory or seat hold table.
- **Rationale:** The restaurant venue handles crowd management physically on-site. Eliminating round/zone/seat holding logic removes race conditions, timeouts, and inventory locking bugs, dramatically simplifying the codebase and ensuring high stability.

## 2. Manual Venue-Full Switch (`venue_status.is_full`)
- **Decision:** Staff manually toggles "ร้านเต็มชั่วคราว" from the header in `/admin` and `/staff`. The system never toggles it automatically based on counts.
- **Rationale:** The owner requested human door-staff control over capacity. Turning it on blocks new orders (`create_order` rejects with `venue_full`), while preserving slip uploads for existing orders, review workflows, and ticket scanning.

## 3. Concurrency & Idempotent Approvals
- **Decision:** 
  1. Atomic slip status updates: `UPDATE payments SET status = 'approved', ... WHERE id = $1 AND status = 'pending' RETURNING *`. If 0 rows return, staff sees "already reviewed".
  2. Order-level locking (`SELECT ... FOR UPDATE`) during status recalculation ensures concurrent slip approvals never double-issue tickets.
  3. Atomic ticket check-in: `UPDATE tickets SET status = 'checked_in', ... WHERE code = $1 AND status = 'issued' RETURNING *`. Prevents duplicate wristband hand-outs.

## 4. Display-Only Expiration
- **Decision:** Orders have `expires_at = now() + 30 mins`, but no cron deletes or marks them as cancelled. If an expired order receives a slip, it still moves to `under_review` for staff to decide. Once any payment is approved, `expires_at` is cleared (`NULL`).
- **Rationale:** No tickets or seats are held, so accepting late payments costs nothing and prevents customer frustration.

## 5. Mobile-First UX & Design System Tokens
- **Decision:** Adopted specifications from `outputs/UX-UI-SPEC.md`:
  - Primary color: Deep Red `#8F1D2D`
  - Font: `Noto Sans Thai`
  - Minimum touch target: 44x44px (48px for scanner & admin buttons)
  - 3-step checkout stepper with honeypot field.
