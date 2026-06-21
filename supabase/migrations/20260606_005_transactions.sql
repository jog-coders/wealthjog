-- Migration 005: Transactions (Unified Ledger)
-- Central fact table for every dollar movement — personal and rental.
-- Amounts stored as integer cents. Positive = expense/outflow. Negative = income/refund.

do $$ begin
  create type public.tx_status as enum (
    'categorized',
    'uncategorized',    -- needs user review (yellow badge)
    'excluded'          -- user explicitly ignored
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irs_schedule_e_cat as enum (
    'advertising',
    'auto_and_travel',
    'cleaning_and_maintenance',
    'commissions',
    'insurance',
    'legal_and_professional',
    'management_fees',
    'mortgage_interest',
    'other_interest',
    'repairs',
    'supplies',
    'taxes',
    'utilities',
    'hoa_fees',
    'principal_reduction',   -- non-deductible; balance sheet only
    'gross_rental_income'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.transactions (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users on delete cascade not null,

  -- Core fields
  date                 date not null,
  vendor               text not null,
  amount_cents         integer not null,              -- positive = expense, negative = income/refund

  -- Classification
  category_id          uuid references public.budget_categories on delete set null,
  status               public.tx_status not null default 'uncategorized',

  -- Rental classification (null for personal transactions)
  property_id          uuid references public.properties on delete set null,
  schedule_e_cat       public.irs_schedule_e_cat,

  notes                text,

  -- Mortgage split: parent tx holds the gross payment.
  -- Child rows (interest, principal, escrow) reference parent_tx_id.
  is_mortgage_parent   boolean not null default false,
  parent_tx_id         uuid references public.transactions on delete cascade,

  -- Import metadata
  import_source        text,                          -- 'csv' | 'manual' | 'plaid' (future)
  external_id          text,                          -- dedup key from bank/CSV row

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- A transaction cannot be both a split parent and a split child
  constraint no_circular_split check (
    not (is_mortgage_parent = true and parent_tx_id is not null)
  )
);

alter table public.transactions enable row level security;

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  using (user_id = auth.uid());

-- Performance indexes
create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_transactions_uncategorized
  on public.transactions (user_id, status)
  where status = 'uncategorized';

create index if not exists idx_transactions_property
  on public.transactions (property_id)
  where property_id is not null;

create index if not exists idx_transactions_month
  on public.transactions (user_id, date_trunc('month', date::timestamp));

-- Migrate existing expense rows → transactions (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='expenses') then
    insert into public.transactions (
      id, user_id, date, vendor, amount_cents,
      status, import_source, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(date, created_at::date),
      coalesce(vendor, merchant, category, 'Unknown'),
      coalesce(round(amount * 100)::integer, 0),
      'categorized',
      'legacy',
      created_at, updated_at
    from public.expenses
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;

-- TODO: Integrate Plaid Link API handler down the road
-- The import_source = 'plaid' and external_id = plaid transaction_id.
-- Plaid webhook → upsert into transactions on (user_id, external_id).
-- Fuzzy match runs post-insert via DB trigger or edge function.
