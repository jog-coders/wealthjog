-- Migration 002: Properties
-- Rental property master record. Replaces/extends public.rental_properties.
-- All money columns stored as integer cents to eliminate floating-point rounding.

-- Migrate existing rental_properties data to cents before dropping NUMERIC columns.
-- If rental_properties already exists, we add the new columns and backfill.

alter table if exists public.rental_properties
  add column if not exists gross_rent_cents     integer,
  add column if not exists pi_cents             integer,
  add column if not exists escrow_cents         integer,
  add column if not exists maintenance_pct      numeric(5,4) default 0.1000,
  add column if not exists property_value_cents integer,
  add column if not exists mortgage_balance_cents integer;

-- Backfill cents columns from existing NUMERIC columns (only runs if table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='rental_properties') then
    update public.rental_properties set
      gross_rent_cents        = round(rent * 100)::integer,
      pi_cents                = round(mortgage_pi * 100)::integer,
      escrow_cents            = round(mortgage_escrow * 100)::integer,
      property_value_cents    = round(current_market_value * 100)::integer,
      mortgage_balance_cents  = round(mortgage_balance * 100)::integer
    where gross_rent_cents is null;
  end if;
end $$;

-- Create the canonical properties table if it doesn't exist yet
-- (new installs skip the backfill above)
create table if not exists public.properties (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users on delete cascade not null,

  -- Identity
  address                 text not null,
  property_name           text,

  -- Valuation
  property_value_cents    integer not null default 0,
  purchase_price_cents    integer not null default 0,
  purchase_date           date,

  -- Mortgage
  mortgage_balance_cents  integer not null default 0,
  mortgage_initial_cents  integer not null default 0,
  interest_rate           numeric(5,4) not null default 0,    -- e.g. 0.0675 = 6.75%
  pi_cents                integer not null default 0,         -- principal + interest / month
  escrow_cents            integer not null default 0,         -- taxes + insurance / month
  mortgage_bank           text,
  mortgage_loan_number    text,
  mortgage_maturity_date  date,

  -- Rental income & reserve
  gross_rent_cents        integer not null default 0,         -- monthly gross rent
  maintenance_pct         numeric(5,4) not null default 0.1000,

  -- Lease
  lease_tenant_name       text,
  lease_start_date        date,
  lease_end_date          date,
  lease_document_url      text,

  -- Property manager
  pm_name                 text,
  pm_email                text,
  pm_phone                text,

  -- Status
  is_active               boolean not null default true,
  is_occupied             boolean not null default true,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.properties enable row level security;

drop policy if exists "properties_owner" on public.properties;
create policy "properties_owner" on public.properties
  using (user_id = auth.uid());

-- Migrate rows from rental_properties → properties (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='rental_properties') then
    insert into public.properties (
      id, user_id, address, property_name,
      property_value_cents, purchase_price_cents, purchase_date,
      mortgage_balance_cents, mortgage_initial_cents, interest_rate,
      pi_cents, escrow_cents, mortgage_bank, mortgage_loan_number, mortgage_maturity_date,
      gross_rent_cents, maintenance_pct,
      lease_tenant_name, lease_start_date, lease_end_date,
      pm_name, pm_email, pm_phone,
      is_active, is_occupied,
      created_at, updated_at
    )
    select
      id, user_id,
      coalesce(property_name, 'Unknown'), property_name,
      coalesce(property_value_cents, 0),
      0,
      null,
      coalesce(mortgage_balance_cents, 0),
      0, 0,
      coalesce(pi_cents, 0),
      coalesce(escrow_cents, 0),
      null, null, null,
      coalesce(gross_rent_cents, 0),
      0.1000,
      null, null, null,
      null, null, null,
      coalesce(is_active, true),
      true,
      created_at, updated_at
    from public.rental_properties
    on conflict (id) do nothing;
  end if;
end $$;
