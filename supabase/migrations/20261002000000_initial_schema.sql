-- Initial schema migration for งานลาบแรกพบ ticket system
-- Matches PLAN.md Section 4

create extension if not exists pgcrypto;

-- Enums
create type order_status   as enum ('pending_payment', 'under_review', 'paid', 'cancelled');
create type payment_status as enum ('pending', 'approved', 'rejected');
create type ticket_status  as enum ('issued', 'checked_in', 'void');

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- e.g. LRP-7K3Q9X
  access_token text not null,                -- random, required to view the order page
  buyer_name text not null,
  phone text not null check (phone ~ '^0[0-9]{9}$'),
  email text not null,
  backup_contact text,                       -- LINE / FB / IG (optional)
  quantity int not null check (quantity >= 1),
  unit_price_thb int not null check (unit_price_thb >= 0),
  total_thb int not null check (total_thb >= 0),
  status order_status not null default 'pending_payment',
  expires_at timestamptz,                    -- display-only deadline; NULL once any payment is approved
  consented_at timestamptz not null,
  admin_note text,
  created_at timestamptz not null default now()
);

-- Payments table (slips)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  slip_path text not null,                   -- path in private bucket "slips"
  slip_sha256 text not null,                 -- duplicate-slip detection
  amount_thb numeric(10,2) not null check (amount_thb > 0),
  transferred_at timestamptz not null,
  to_bank text not null,
  payer_name_or_last4 text not null,
  status payment_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

-- Tickets table
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text unique not null,                 -- random, unguessable >= 16 chars
  holder_name text,                          -- defaults to buyer_name
  status ticket_status not null default 'issued',
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz not null default now()
);

-- Staff profiles
create table if not exists staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'scanner'))
);

-- Audit log
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Venue status (single-row table)
create table if not exists venue_status (
  id int primary key default 1 check (id = 1),
  is_full boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into venue_status (id, is_full)
values (1, false)
on conflict (id) do nothing;

-- Indexes
create index if not exists idx_orders_status_created on orders (status, created_at);
create index if not exists idx_payments_order_id on payments (order_id);
create index if not exists idx_payments_slip_sha256 on payments (slip_sha256);
create index if not exists idx_tickets_order_id on tickets (order_id);
create index if not exists idx_tickets_code on tickets (code);

-- Enable Row Level Security (RLS) on all tables with NO public policies
alter table orders enable row level security;
alter table payments enable row level security;
alter table tickets enable row level security;
alter table staff_profiles enable row level security;
alter table audit_log enable row level security;
alter table venue_status enable row level security;
