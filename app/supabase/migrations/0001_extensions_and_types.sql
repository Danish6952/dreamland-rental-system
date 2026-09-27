-- =====================================================================
-- Dreamland Rental Management System
-- 0001 — Extensions, schemas and enumerated types
-- See documentation/03_Database_Design.md §2
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- Internal helpers and trigger functions live here. This schema is NOT
-- exposed through the Supabase API, so nothing in it is callable as RPC.
create schema if not exists private;

create type public.user_role     as enum ('owner', 'staff');
create type public.car_status    as enum ('available', 'on_rent', 'maintenance', 'sold');
create type public.rent_period   as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.rental_status as enum ('out', 'returned', 'closed', 'void');
create type public.payment_type  as enum ('advance', 'rent', 'deposit_taken', 'deposit_used', 'deposit_returned', 'refund');
create type public.fuel_level    as enum ('empty', 'quarter', 'half', 'three_quarter', 'full');
