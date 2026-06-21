-- Migration 010: Schema Reconciliation
-- Aligns checked-in migrations with the application and current production DB.
-- This migration is intentionally idempotent: it only adds missing tables,
-- columns, policies, and indexes required by the current app code.

-- ─── Properties: fields used by the rental UI/API ───────────────────────────

alter table if exists public.properties
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip text,
  add column if not exists closing_date date,
  add column if not exists property_management_fees_cents integer not null default 0,
  add column if not exists pm_poc text,
  add column if not exists notes text;

-- Backfill split address fields from the legacy display address where possible.
update public.properties
set address_street = coalesce(address_street, address)
where address_street is null
  and address is not null;

-- ─── Property snapshots: rental valuation/history ledger ────────────────────

create table if not exists public.property_snapshots (
  id                       uuid default gen_random_uuid() primary key,
  user_id                  uuid references auth.users on delete cascade not null,
  property_id              uuid references public.properties on delete cascade not null,
  date                     date not null,
  market_value_cents       integer not null default 0,
  monthly_rent_cents       integer not null default 0,
  pm_fees_cents            integer not null default 0,
  mortgage_balance_cents   integer not null default 0,
  notes                    text,
  created_at               timestamptz not null default now()
);

alter table public.property_snapshots enable row level security;

drop policy if exists "property_snapshots_owner" on public.property_snapshots;
create policy "property_snapshots_owner" on public.property_snapshots
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_property_snapshots_user_property_date
  on public.property_snapshots (user_id, property_id, date desc);

-- ─── User lookup values: user-managed account/institution options ────────────

create table if not exists public.user_lookup_values (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  domain       text not null check (domain in ('asset_type','liability_type','institution')),
  label        text not null,
  value        text not null,
  sort_order   integer not null default 999,
  created_at   timestamptz not null default now()
);

alter table public.user_lookup_values enable row level security;

drop policy if exists "user_lookup_values_owner" on public.user_lookup_values;
create policy "user_lookup_values_owner" on public.user_lookup_values
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create unique index if not exists idx_user_lookup_values_unique
  on public.user_lookup_values (user_id, domain, lower(value));

create index if not exists idx_user_lookup_values_user_domain
  on public.user_lookup_values (user_id, domain, sort_order, created_at);

-- ─── Budget categories: auto-injected rows from assets/liabilities/rentals ───

alter table if exists public.budget_categories
  add column if not exists is_auto_injected boolean not null default false;

create index if not exists idx_budget_categories_user_type_active
  on public.budget_categories (user_id, category_type, is_active, is_auto_injected, sort_order);

-- ─── Income sources: frequency and paycheck detail fields ───────────────────

alter table if exists public.income_sources
  add column if not exists frequency text not null default 'Monthly'
    check (frequency in ('Monthly','Annual','Biweekly')),
  add column if not exists description text,
  add column if not exists gross_income_cents integer,
  add column if not exists retirement_savings_cents integer,
  add column if not exists other_deductions_cents integer;

-- ─── Balance sheet accounts: monthly payment/savings and as-of date ─────────

alter table if exists public.balance_sheet_accounts
  add column if not exists monthly_payment_cents integer not null default 0,
  add column if not exists date date;

create index if not exists idx_balance_sheet_accounts_user_class_active
  on public.balance_sheet_accounts (user_id, account_class, is_active, sort_order);

-- ─── Vendor rules and transaction import hardening ──────────────────────────

alter table if exists public.vendor_rules
  add column if not exists match_type text not null default 'contains'
    check (match_type in ('contains','starts_with','exact','regex')),
  add column if not exists property_id uuid references public.properties on delete set null,
  add column if not exists schedule_e_cat public.irs_schedule_e_cat;

create index if not exists idx_vendor_rules_user_priority
  on public.vendor_rules (user_id, priority desc, created_at);

create unique index if not exists idx_transactions_user_external_id
  on public.transactions (user_id, external_id)
  where external_id is not null;

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_transactions_user_status
  on public.transactions (user_id, status);

create index if not exists idx_transactions_user_category
  on public.transactions (user_id, category_id);

-- ─── Month snapshots: keep app/export expectations compatible ───────────────

alter table if exists public.month_snapshots
  add column if not exists created_at timestamptz not null default now();

update public.month_snapshots
set created_at = coalesce(created_at, closed_at, now())
where created_at is null;
