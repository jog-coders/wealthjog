-- Migration 008: Month Close Snapshots
-- Written once per user per month at month-close. Immutable after creation.
-- The carryover engine uses these as its starting baseline for prior periods.

create table if not exists public.month_snapshots (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users on delete cascade not null,

  -- First day of the closed month, e.g. 2026-06-01
  period                  date not null,

  -- Top-level summary (cents)
  net_income_cents        integer not null,
  total_budgeted_cents    integer not null,
  total_spent_cents       integer not null,
  net_worth_cents         integer not null,

  -- Per-category breakdown:
  -- { "<category_id>": { "budgeted": 0, "spent": 0, "carryover_in": 0, "carryover_out": 0 } }
  category_totals         jsonb not null default '{}',

  -- Per-property breakdown:
  -- { "<property_id>": { "rent": 0, "pi": 0, "escrow": 0, "reserve": 0, "net": 0 } }
  property_totals         jsonb not null default '{}',

  closed_at               timestamptz not null default now(),

  -- Enforce one snapshot per user per month
  unique (user_id, period)
);

alter table public.month_snapshots enable row level security;

-- Read + insert allowed; update and delete are blocked (immutability enforced at DB level)
drop policy if exists "month_snapshots_read" on public.month_snapshots;
create policy "month_snapshots_read" on public.month_snapshots
  for select using (user_id = auth.uid());

drop policy if exists "month_snapshots_insert" on public.month_snapshots;
create policy "month_snapshots_insert" on public.month_snapshots
  for insert with check (user_id = auth.uid());

-- Explicitly block updates and deletes (no policy = denied by default with RLS enabled)
-- No update or delete policy is created intentionally.

create index if not exists idx_month_snapshots_user_period
  on public.month_snapshots (user_id, period desc);

-- Migrate existing net_worth_snapshots → month_snapshots (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='net_worth_snapshots') then
    insert into public.month_snapshots (
      user_id, period,
      net_income_cents, total_budgeted_cents, total_spent_cents, net_worth_cents,
      category_totals, property_totals,
      closed_at
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
