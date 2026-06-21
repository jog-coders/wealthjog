-- Migration 006: Vendor Fuzzy-Match Rules
-- Config-driven table for vendor string → category mapping.
-- Application performs case-insensitive substring match ordered by priority desc.

create table if not exists public.vendor_rules (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,

  pattern      text not null,                      -- substring to match (case-insensitive)
  category_id  uuid references public.budget_categories on delete cascade not null,
  priority     integer not null default 0,         -- higher value wins on conflict

  created_at   timestamptz not null default now()
);

alter table public.vendor_rules enable row level security;

drop policy if exists "vendor_rules_owner" on public.vendor_rules;
create policy "vendor_rules_owner" on public.vendor_rules
  using (user_id = auth.uid());

create index if not exists idx_vendor_rules_user
  on public.vendor_rules (user_id, priority desc);

-- Seed default rules for a given user.
-- Called from application after new user profile is created.
-- Patterns match the spec §1.D exactly.
create or replace function public.seed_vendor_rules(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cat_car_gas       uuid;
  cat_grocery       uuid;
  cat_restaurant    uuid;
  cat_car_insurance uuid;
begin
  -- Resolve category IDs by name for this user
  select id into cat_car_gas       from budget_categories where user_id = p_user_id and name ilike '%car%gas%'       limit 1;
  select id into cat_grocery       from budget_categories where user_id = p_user_id and name ilike '%grocery%'        limit 1;
  select id into cat_restaurant    from budget_categories where user_id = p_user_id and name ilike '%restaurant%'     limit 1;
  select id into cat_car_insurance from budget_categories where user_id = p_user_id and name ilike '%car insurance%'  limit 1;

  -- Only insert rules where the target category exists
  if cat_car_gas is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority) values
      (p_user_id, 'costco gas', cat_car_gas, 10);  -- higher priority than plain 'costco'
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
      (p_user_id, 'ryze',              cat_grocery, 5);
  end if;

  if cat_restaurant is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority) values
      (p_user_id, 'chipotle',          cat_restaurant, 5),
      (p_user_id, 'domino',            cat_restaurant, 5),   -- matches "Dominos" and "Domino's"
      (p_user_id, 'ihop',              cat_restaurant, 5),
      (p_user_id, 'eatwell',           cat_restaurant, 5),
      (p_user_id, 'rickys thai',       cat_restaurant, 5),
      (p_user_id, 'taste of thai',     cat_restaurant, 5),
      (p_user_id, 'aroma restaurant',  cat_restaurant, 5),
      (p_user_id, 'eggholic',          cat_restaurant, 5);
  end if;

  if cat_car_insurance is not null then
    insert into vendor_rules (user_id, pattern, category_id, priority) values
      (p_user_id, 'geico', cat_car_insurance, 5);
  end if;
end;
$$;
