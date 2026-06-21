-- Migration 007: Balance Sheet Accounts
-- Assets and liabilities used in the Macro Balance Sheet Studio (Page 5).
-- Replaces public.assets + public.liabilities with a single unified table.

do $$ begin
  create type public.account_class as enum (
    'checking',
    'savings',
    'investment_401k',
    'investment_ira',
    'investment_brokerage',
    'real_estate',
    'mortgage_liability',
    'credit_card_liability',
    'other_liability'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.balance_sheet_accounts (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,

  name                text not null,
  account_class       public.account_class not null,
  institution         text,

  -- Balance in cents. Positive = asset value. Negative = liability owed.
  current_balance_cents integer not null default 0,

  -- Links mortgage liability or real_estate asset to a property
  linked_property_id  uuid references public.properties on delete set null,

  sort_order          integer not null default 0,
  is_active           boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.balance_sheet_accounts enable row level security;

drop policy if exists "balance_sheet_accounts_owner" on public.balance_sheet_accounts;
create policy "balance_sheet_accounts_owner" on public.balance_sheet_accounts
  using (user_id = auth.uid());

-- Migrate existing assets → balance_sheet_accounts (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='assets') then
    insert into public.balance_sheet_accounts (
      id, user_id, name, account_class,
      current_balance_cents, institution, sort_order, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(name, type, 'Account'),
      case
        when type ilike '%401k%'    then 'investment_401k'::public.account_class
        when type ilike '%ira%'     then 'investment_ira'::public.account_class
        when type ilike '%broker%'  then 'investment_brokerage'::public.account_class
        when type ilike '%saving%'  then 'savings'::public.account_class
        when type ilike '%real%'    then 'real_estate'::public.account_class
        else                             'checking'::public.account_class
      end,
      coalesce(round(current_value * 100)::integer, round(amount * 100)::integer, 0),
      institution,
      coalesce(sort_order, 0),
      created_at, updated_at
    from public.assets
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;

-- Migrate existing liabilities → balance_sheet_accounts (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='liabilities') then
    insert into public.balance_sheet_accounts (
      id, user_id, name, account_class,
      current_balance_cents, institution, sort_order, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(name, type, 'Liability'),
      case
        when type ilike '%mortgage%' then 'mortgage_liability'::public.account_class
        when type ilike '%credit%'   then 'credit_card_liability'::public.account_class
        else                              'other_liability'::public.account_class
      end,
      -1 * coalesce(round(amount * 100)::integer, 0),
      institution,
      coalesce(sort_order, 0),
      created_at, updated_at
    from public.liabilities
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;
