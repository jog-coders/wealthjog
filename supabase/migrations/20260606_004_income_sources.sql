-- Migration 004: Income Sources
-- Named income streams: salary, rental net, side income, etc.
-- Replaces ad-hoc income rows stored in public.income.

create table if not exists public.income_sources (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,

  name                text not null,                      -- e.g. "Base Salary", "Rental Net – Gorsuch"
  monthly_amount_cents integer not null default 0,        -- net take-home cents/month
  source_type         text not null default 'salary'
                        check (source_type in ('salary', 'rental', 'other')),

  -- If source_type = 'rental', net cash flow is derived from properties view.
  -- This field links the income row to its property for display.
  linked_property_id  uuid references public.properties on delete set null,

  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.income_sources enable row level security;

drop policy if exists "income_sources_owner" on public.income_sources;
create policy "income_sources_owner" on public.income_sources
  using (user_id = auth.uid());

-- Migrate existing income rows (non-rental only; rental income is derived from properties)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='income') then
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
