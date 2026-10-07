-- Migration: Support walk-up ticket sales with '-' phone placeholder
-- Allows phone = '-' or 10-digit Thai phone format ^0[0-9]{9}$
alter table orders drop constraint if exists orders_phone_check;
alter table orders add constraint orders_phone_check check (phone = '-' or phone ~ '^0[0-9]{9}$');
