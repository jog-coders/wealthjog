-- Migration 003: Budget Categories
-- Unified envelope / sinking fund / fixed cost category table.
-- Replaces/extends public.budget_line_items.

do $$ begin
  create type public.category_type as enum (
    'envelope',      -- monthly zero-based spending envelope
    'sinking_fund',  -- annual savings bucket
    'fixed_cost'     -- fixed monthly bill (mortgage, insurance, subscription)
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.budget_categories (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,

  name                text not null,
  category_type       public.category_type not null,

  -- Monthly budget amount in cents
  monthly_amount_cents integer not null default 0,

  -- Sinking fund fields (null for non-sinking types)
  annual_target_cents  integer,

  -- Maintenance reserve auto-routing: when set, the reserve computed from
  -- properties.gross_rent_cents * properties.maintenance_pct flows here monthly
  linked_property_id  uuid references public.properties on delete set null,

  sort_order          integer not null default 0,
  is_active           boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.budget_categories enable row level security;

drop policy if exists "budget_categories_owner" on public.budget_categories;
create policy "budget_categories_owner" on public.budget_categories
  using (user_id = auth.uid());

-- Migrate existing budget_line_items → budget_categories (only if old table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='budget_line_items') then
    insert into public.budget_categories (
      id, user_id, name, category_type,
      monthly_amount_cents, annual_target_cents,
      sort_order, is_active, created_at, updated_at
    )
    select
      id, user_id, name,
      case section
        when 'annual'        then 'sinking_fund'::public.category_type
        when 'fixed_monthly' then 'fixed_cost'::public.category_type
        else                      'envelope'::public.category_type
      end,
      coalesce(round(monthly_amount * 100)::integer, 0),
      case when section = 'annual' then coalesce(round(annual_amount * 100)::integer, null) end,
      coalesce(sort_order, 0),
      true,
      created_at, updated_at
    from public.budget_line_items
    on conflict (id) do nothing;
  end if;
end $$;
