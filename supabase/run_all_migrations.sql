-- ═══════════════════════════════════════════════════════════════════════════
-- WealthJOG — Run All Migrations (idempotent, safe for fresh or existing DB)
-- Paste into: https://app.supabase.com/project/ikdhcuqlpyspneusncev/sql/new
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── HELPER: check if a table exists ─────────────────────────────────────────
create or replace function pg_temp.table_exists(t text) returns boolean language sql as $$
  select exists (
    select from information_schema.tables
    where table_schema = 'public' and table_name = t
  );
$$;


-- ─── 002: Properties ─────────────────────────────────────────────────────────

-- Backfill cents columns on rental_properties if it exists
do $$ begin
  if pg_temp.table_exists('rental_properties') then
    begin
      alter table public.rental_properties add column if not exists gross_rent_cents      integer;
      alter table public.rental_properties add column if not exists pi_cents              integer;
      alter table public.rental_properties add column if not exists escrow_cents          integer;
      alter table public.rental_properties add column if not exists maintenance_pct       numeric(5,4) default 0.1000;
      alter table public.rental_properties add column if not exists property_value_cents  integer;
      alter table public.rental_properties add column if not exists mortgage_balance_cents integer;
    exception when others then null;
    end;

    update public.rental_properties set
      gross_rent_cents         = round(coalesce(rent, 0) * 100)::integer,
      pi_cents                 = round(coalesce(mortgage_pi, 0) * 100)::integer,
      escrow_cents             = round(coalesce(mortgage_escrow, 0) * 100)::integer,
      property_value_cents     = round(coalesce(current_market_value, 0) * 100)::integer,
      mortgage_balance_cents   = round(coalesce(mortgage_balance, 0) * 100)::integer
    where gross_rent_cents is null;
  end if;
end $$;

-- Create the canonical properties table
create table if not exists public.properties (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users on delete cascade not null,
  address                 text not null,
  property_name           text,
  property_value_cents    integer not null default 0,
  purchase_price_cents    integer not null default 0,
  purchase_date           date,
  mortgage_balance_cents  integer not null default 0,
  mortgage_initial_cents  integer not null default 0,
  interest_rate           numeric(5,4) not null default 0,
  pi_cents                integer not null default 0,
  escrow_cents            integer not null default 0,
  mortgage_bank           text,
  mortgage_loan_number    text,
  mortgage_maturity_date  date,
  gross_rent_cents        integer not null default 0,
  maintenance_pct         numeric(5,4) not null default 0.1000,
  lease_tenant_name       text,
  lease_start_date        date,
  lease_end_date          date,
  lease_document_url      text,
  pm_name                 text,
  pm_email                text,
  pm_phone                text,
  is_active               boolean not null default true,
  is_occupied             boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.properties enable row level security;

drop policy if exists "properties_owner" on public.properties;
create policy "properties_owner" on public.properties
  using (user_id = auth.uid());

-- Migrate from rental_properties if it exists
do $$ begin
  if pg_temp.table_exists('rental_properties') then
    insert into public.properties (
      id, user_id, address, property_name,
      property_value_cents, purchase_price_cents, purchase_date,
      mortgage_balance_cents, mortgage_initial_cents, interest_rate,
      pi_cents, escrow_cents, mortgage_bank, mortgage_loan_number, mortgage_maturity_date,
      gross_rent_cents, maintenance_pct,
      lease_tenant_name, lease_start_date, lease_end_date,
      pm_name, pm_email, pm_phone,
      is_active, is_occupied, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(
        case when jsonb_typeof(address) = 'object' then address->>'street' else address::text end,
        property_name, 'Unknown'
      ),
      property_name,
      coalesce(property_value_cents, 0),
      coalesce(round(purchase_price * 100)::integer, 0),
      purchase_date,
      coalesce(mortgage_balance_cents, 0),
      coalesce(round(mortgage_initial_amount * 100)::integer, 0),
      coalesce(mortgage_interest_rate, 0),
      coalesce(pi_cents, 0),
      coalesce(escrow_cents, 0),
      mortgage_bank, mortgage_loan_number, mortgage_maturity_date,
      coalesce(gross_rent_cents, 0),
      0.1000,
      lease_tenant_name, lease_start_date, lease_end_date,
      pm_name, pm_email, pm_phone,
      coalesce(is_active, true),
      coalesce(status_occupied, true),
      created_at, updated_at
    from public.rental_properties
    on conflict (id) do nothing;
  end if;
end $$;


-- ─── 003: Budget Categories ───────────────────────────────────────────────────

do $$ begin
  create type public.category_type as enum ('envelope','sinking_fund','fixed_cost');
exception when duplicate_object then null;
end $$;

create table if not exists public.budget_categories (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users on delete cascade not null,
  name                 text not null,
  category_type        public.category_type not null,
  monthly_amount_cents integer not null default 0,
  annual_target_cents  integer,
  linked_property_id   uuid references public.properties on delete set null,
  sort_order           integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.budget_categories enable row level security;

drop policy if exists "budget_categories_owner" on public.budget_categories;
create policy "budget_categories_owner" on public.budget_categories
  using (user_id = auth.uid());

-- Migrate from budget_line_items if it exists
do $$ begin
  if pg_temp.table_exists('budget_line_items') then
    insert into public.budget_categories (
      id, user_id, name, category_type,
      monthly_amount_cents, annual_target_cents,
      sort_order, is_active, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(name, category, 'Category'),
      case section
        when 'annual'        then 'sinking_fund'::public.category_type
        when 'fixed_monthly' then 'fixed_cost'::public.category_type
        else                      'envelope'::public.category_type
      end,
      coalesce(round(coalesce(monthly_amount, amount, 0) * 100)::integer, 0),
      case when section = 'annual'
        then coalesce(round(coalesce(annual_amount, amount, 0) * 100)::integer, null)
      end,
      coalesce(sort_order, 0),
      true,
      created_at, updated_at
    from public.budget_line_items
    on conflict (id) do nothing;
  end if;
end $$;


-- ─── 004: Income Sources ──────────────────────────────────────────────────────

create table if not exists public.income_sources (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users on delete cascade not null,
  name                 text not null,
  monthly_amount_cents integer not null default 0,
  source_type          text not null default 'salary'
                         check (source_type in ('salary','rental','other')),
  linked_property_id   uuid references public.properties on delete set null,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.income_sources enable row level security;

drop policy if exists "income_sources_owner" on public.income_sources;
create policy "income_sources_owner" on public.income_sources
  using (user_id = auth.uid());

-- Migrate from income if it exists
do $$ begin
  if pg_temp.table_exists('income') then
    insert into public.income_sources (
      id, user_id, name, monthly_amount_cents, source_type, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(name, source, 'Income'),
      coalesce(round(amount * 100)::integer, 0),
      case when source_type = 'rental' then 'rental' else 'salary' end,
      created_at, updated_at
    from public.income
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;


-- ─── 005: Transactions ────────────────────────────────────────────────────────

do $$ begin
  create type public.tx_status as enum ('categorized','uncategorized','excluded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irs_schedule_e_cat as enum (
    'advertising','auto_and_travel','cleaning_and_maintenance','commissions',
    'insurance','legal_and_professional','management_fees','mortgage_interest',
    'other_interest','repairs','supplies','taxes','utilities','hoa_fees',
    'principal_reduction','gross_rental_income'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.transactions (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users on delete cascade not null,
  date                 date not null,
  vendor               text not null,
  amount_cents         integer not null,
  category_id          uuid references public.budget_categories on delete set null,
  status               public.tx_status not null default 'uncategorized',
  property_id          uuid references public.properties on delete set null,
  schedule_e_cat       public.irs_schedule_e_cat,
  notes                text,
  is_mortgage_parent   boolean not null default false,
  parent_tx_id         uuid references public.transactions on delete cascade,
  import_source        text,
  external_id          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint no_circular_split check (
    not (is_mortgage_parent = true and parent_tx_id is not null)
  )
);

alter table public.transactions enable row level security;

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  using (user_id = auth.uid());

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);
create index if not exists idx_transactions_uncategorized
  on public.transactions (user_id, status) where status = 'uncategorized';
create index if not exists idx_transactions_property
  on public.transactions (property_id) where property_id is not null;

-- Migrate from expenses if it exists
do $$ begin
  if pg_temp.table_exists('expenses') then
    insert into public.transactions (
      id, user_id, date, vendor, amount_cents,
      status, import_source, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(date, created_at::date),
      coalesce(vendor, merchant, category, budget_category, 'Unknown'),
      coalesce(round(amount * 100)::integer, 0),
      'categorized',
      'legacy',
      created_at, updated_at
    from public.expenses
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;


-- ─── 006: Vendor Rules ────────────────────────────────────────────────────────

create table if not exists public.vendor_rules (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  pattern     text not null,
  category_id uuid references public.budget_categories on delete cascade not null,
  priority    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.vendor_rules enable row level security;

drop policy if exists "vendor_rules_owner" on public.vendor_rules;
create policy "vendor_rules_owner" on public.vendor_rules
  using (user_id = auth.uid());

create index if not exists idx_vendor_rules_user
  on public.vendor_rules (user_id, priority desc);

create or replace function public.seed_vendor_rules(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cat_car_gas       uuid;
  cat_grocery       uuid;
  cat_restaurant    uuid;
  cat_car_insurance uuid;
begin
  select id into cat_car_gas       from budget_categories where user_id = p_user_id and name ilike '%car%gas%'      limit 1;
  select id into cat_grocery       from budget_categories where user_id = p_user_id and name ilike '%grocery%'       limit 1;
  select id into cat_restaurant    from budget_categories where user_id = p_user_id and name ilike '%restaurant%'    limit 1;
  select id into cat_car_insurance from budget_categories where user_id = p_user_id and name ilike '%car insurance%' limit 1;

  if cat_car_gas is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority)
    values (p_user_id, 'costco gas', cat_car_gas, 10) on conflict do nothing;
  end if;
  if cat_grocery is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority) values
      (p_user_id, 'costco',            cat_grocery, 5),
      (p_user_id, 'bhavani',           cat_grocery, 5),
      (p_user_id, 'hmart',             cat_grocery, 5),
      (p_user_id, 'patel brothers',    cat_grocery, 5),
      (p_user_id, 'stop & shop',       cat_grocery, 5),
      (p_user_id, 'shoprite',          cat_grocery, 5),
      (p_user_id, 'asian food market', cat_grocery, 5),
      (p_user_id, 'ryze',              cat_grocery, 5)
    on conflict do nothing;
  end if;
  if cat_restaurant is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority) values
      (p_user_id, 'chipotle',         cat_restaurant, 5),
      (p_user_id, 'domino',           cat_restaurant, 5),
      (p_user_id, 'ihop',             cat_restaurant, 5),
      (p_user_id, 'eatwell',          cat_restaurant, 5),
      (p_user_id, 'rickys thai',      cat_restaurant, 5),
      (p_user_id, 'taste of thai',    cat_restaurant, 5),
      (p_user_id, 'aroma restaurant', cat_restaurant, 5),
      (p_user_id, 'eggholic',         cat_restaurant, 5)
    on conflict do nothing;
  end if;
  if cat_car_insurance is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority)
    values (p_user_id, 'geico', cat_car_insurance, 5) on conflict do nothing;
  end if;
end;
$$;


-- ─── 007: Balance Sheet Accounts ─────────────────────────────────────────────

do $$ begin
  create type public.account_class as enum (
    'checking','savings','investment_401k','investment_ira','investment_brokerage',
    'real_estate','mortgage_liability','credit_card_liability','other_liability'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.balance_sheet_accounts (
  id                    uuid default gen_random_uuid() primary key,
  user_id               uuid references auth.users on delete cascade not null,
  name                  text not null,
  account_class         public.account_class not null,
  institution           text,
  current_balance_cents integer not null default 0,
  linked_property_id    uuid references public.properties on delete set null,
  sort_order            integer not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.balance_sheet_accounts enable row level security;

drop policy if exists "balance_sheet_accounts_owner" on public.balance_sheet_accounts;
create policy "balance_sheet_accounts_owner" on public.balance_sheet_accounts
  using (user_id = auth.uid());

-- Migrate from assets if it exists
do $$ begin
  if pg_temp.table_exists('assets') then
    insert into public.balance_sheet_accounts (
      id, user_id, name, account_class,
      current_balance_cents, institution, sort_order, created_at, updated_at
    )
    select
      id, user_id,
      coalesce(name, type, 'Account'),
      case
        when type ilike '%401k%'   then 'investment_401k'::public.account_class
        when type ilike '%ira%'    then 'investment_ira'::public.account_class
        when type ilike '%broker%' then 'investment_brokerage'::public.account_class
        when type ilike '%saving%' then 'savings'::public.account_class
        when type ilike '%real%'   then 'real_estate'::public.account_class
        else                            'checking'::public.account_class
      end,
      coalesce(round(coalesce(current_value, amount, 0) * 100)::integer, 0),
      institution,
      coalesce(sort_order, 0),
      created_at, updated_at
    from public.assets
    where is_auto_injected = false or is_auto_injected is null
    on conflict (id) do nothing;
  end if;
end $$;

-- Migrate from liabilities if it exists (stored as negative balance)
do $$ begin
  if pg_temp.table_exists('liabilities') then
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


-- ─── 008: Month Snapshots ─────────────────────────────────────────────────────

create table if not exists public.month_snapshots (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users on delete cascade not null,
  period               date not null,
  net_income_cents     integer not null,
  total_budgeted_cents integer not null,
  total_spent_cents    integer not null,
  net_worth_cents      integer not null,
  category_totals      jsonb not null default '{}',
  property_totals      jsonb not null default '{}',
  closed_at            timestamptz not null default now(),
  unique (user_id, period)
);

alter table public.month_snapshots enable row level security;

drop policy if exists "month_snapshots_read" on public.month_snapshots;
create policy "month_snapshots_read" on public.month_snapshots
  for select using (user_id = auth.uid());

drop policy if exists "month_snapshots_insert" on public.month_snapshots;
create policy "month_snapshots_insert" on public.month_snapshots
  for insert with check (user_id = auth.uid());

create index if not exists idx_month_snapshots_user_period
  on public.month_snapshots (user_id, period desc);

-- Migrate from net_worth_snapshots if it exists
do $$ begin
  if pg_temp.table_exists('net_worth_snapshots') then
    insert into public.month_snapshots (
      user_id, period,
      net_income_cents, total_budgeted_cents, total_spent_cents, net_worth_cents,
      category_totals, property_totals, closed_at
    )
    select
      user_id,
      date_trunc('month', snapshot_date)::date,
      0, 0, 0,
      coalesce(round(net_worth * 100)::integer, 0),
      '{}', '{}',
      coalesce(snapshot_date, created_at)
    from public.net_worth_snapshots
    on conflict (user_id, period) do nothing;
  end if;
end $$;


-- ─── 009: Views ───────────────────────────────────────────────────────────────

create or replace view public.v_budget_status as
select
  bc.id                                                              as category_id,
  bc.user_id,
  bc.name,
  bc.category_type,
  bc.monthly_amount_cents                                            as budgeted_cents,
  coalesce(sum(case when t.status != 'excluded' then t.amount_cents else 0 end), 0) as spent_cents,
  bc.monthly_amount_cents
    - coalesce(sum(case when t.status != 'excluded' then t.amount_cents else 0 end), 0) as remaining_cents,
  count(t.id) filter (where t.status = 'uncategorized')             as uncategorized_count
from public.budget_categories bc
left join public.transactions t
  on  t.category_id = bc.id
  and date_trunc('month', t.date) = date_trunc('month', current_date)
  and t.user_id = bc.user_id
where bc.is_active = true
group by bc.id, bc.user_id, bc.name, bc.category_type, bc.monthly_amount_cents;

create or replace view public.v_property_cash_flow as
select
  p.id, p.user_id, p.address, p.property_name,
  p.gross_rent_cents, p.pi_cents, p.escrow_cents, p.maintenance_pct,
  round(p.gross_rent_cents * p.maintenance_pct)::integer             as maintenance_reserve_cents,
  p.gross_rent_cents - p.pi_cents - p.escrow_cents
    - round(p.gross_rent_cents * p.maintenance_pct)::integer          as net_cash_flow_cents,
  p.property_value_cents,
  p.mortgage_balance_cents,
  p.property_value_cents - p.mortgage_balance_cents                   as equity_cents,
  p.interest_rate, p.is_active, p.is_occupied
from public.properties p;

create or replace view public.v_schedule_e_summary as
select
  p.user_id,
  p.address                            as property_address,
  t.schedule_e_cat,
  date_trunc('year', t.date)::date     as tax_year,
  sum(t.amount_cents)                  as total_cents,
  count(*)                             as tx_count
from public.transactions t
join public.properties p on p.id = t.property_id
where t.schedule_e_cat is not null and t.status != 'excluded'
group by p.user_id, p.address, t.schedule_e_cat, date_trunc('year', t.date)
order by p.address, t.schedule_e_cat;

create or replace view public.v_net_worth as
select
  user_id,
  sum(case when current_balance_cents > 0 then current_balance_cents else 0 end) as total_assets_cents,
  sum(case when current_balance_cents < 0 then current_balance_cents else 0 end) as total_liabilities_cents,
  sum(current_balance_cents)                                                       as net_worth_cents
from public.balance_sheet_accounts
where is_active = true
group by user_id;

create or replace view public.v_zero_based_totals as
select user_id, sum(monthly_amount_cents) as total_allocated_cents
from public.budget_categories
where is_active = true
group by user_id;

create or replace view public.v_uncategorized_count as
select user_id, count(*) as uncategorized_count
from public.transactions
where status = 'uncategorized'
group by user_id;

create or replace view public.v_rental_portfolio as
select
  user_id,
  count(*)                             as property_count,
  sum(gross_rent_cents)                as total_gross_rent_cents,
  sum(pi_cents + escrow_cents)         as total_debt_service_cents,
  sum(net_cash_flow_cents)             as total_net_cash_flow_cents,
  sum(equity_cents)                    as total_equity_cents,
  sum(property_value_cents)            as total_portfolio_value_cents,
  sum(mortgage_balance_cents)          as total_mortgage_balance_cents
from public.v_property_cash_flow
where is_active = true
group by user_id;
