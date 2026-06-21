-- Migration 001: Profiles
-- Extends auth.users with display preferences. One row per user, created on sign-up.

create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  display_name text,
  currency     text not null default 'USD',
  -- family sharing: non-head members point to the head's user_id
  family_head_id uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  using (id = auth.uid());

-- Auto-create profile row on new user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
