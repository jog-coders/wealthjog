-- Migration 009: Database Views
-- All derived/computed data lives here. Frontend reads views; never computes aggregates itself.

-- ─── 1. Zero-Based Budget Status (current calendar month) ────────────────────

create or replace view public.v_budget_status as
select
  bc.id                                                           as category_id,
  bc.user_id,
  bc.name,
  bc.category_type,
  bc.monthly_amount_cents                                         as budgeted_cents,
  coalesce(sum(
    case when t.status != 'excluded' then t.amount_cents else 0 end
  ), 0)                                                           as spent_cents,
  bc.monthly_amount_cents - coalesce(sum(
    case when t.status != 'excluded' then t.amount_cents else 0 end
  ), 0)                                                           as remaining_cents,
  count(t.id) filter (where t.status = 'uncategorized')          as uncategorized_count
from public.budget_categories bc
left join public.transactions t
  on  t.category_id = bc.id
  and date_trunc('month', t.date) = date_trunc('month', current_date)
  and t.user_id = bc.user_id
where bc.is_active = true
group by bc.id, bc.user_id, bc.name, bc.category_type, bc.monthly_amount_cents;

-- ─── 2. Property Cash Flow ────────────────────────────────────────────────────

create or replace view public.v_property_cash_flow as
select
  p.id,
  p.user_id,
  p.address,
  p.property_name,
  p.gross_rent_cents,
  p.pi_cents,
  p.escrow_cents,
  p.maintenance_pct,
  round(p.gross_rent_cents * p.maintenance_pct)::integer          as maintenance_reserve_cents,
  p.gross_rent_cents
    - p.pi_cents
    - p.escrow_cents
    - round(p.gross_rent_cents * p.maintenance_pct)::integer       as net_cash_flow_cents,
  p.property_value_cents,
  p.mortgage_balance_cents,
  p.property_value_cents - p.mortgage_balance_cents               as equity_cents,
  p.interest_rate,
  p.is_active,
  p.is_occupied
from public.properties p;

-- ─── 3. Schedule E Summary (for CSV export — IRS-aligned, grouped by property) ─

create or replace view public.v_schedule_e_summary as
select
  p.user_id,
  p.address                                                       as property_address,
  t.schedule_e_cat,
  date_trunc('year', t.date)::date                               as tax_year,
  sum(t.amount_cents)                                             as total_cents,
  count(*)                                                        as tx_count
from public.transactions t
join public.properties p on p.id = t.property_id
where
  t.schedule_e_cat is not null
  and t.status != 'excluded'
group by p.user_id, p.address, t.schedule_e_cat, date_trunc('year', t.date)
order by p.address, t.schedule_e_cat;

-- ─── 4. Net Worth (live, derived from balance_sheet_accounts) ─────────────────

create or replace view public.v_net_worth as
select
  user_id,
  sum(case when current_balance_cents > 0 then current_balance_cents else 0 end) as total_assets_cents,
  sum(case when current_balance_cents < 0 then current_balance_cents else 0 end) as total_liabilities_cents,
  sum(current_balance_cents)                                       as net_worth_cents
from public.balance_sheet_accounts
where is_active = true
group by user_id;

-- ─── 5. Zero-Based Totals (does monthly income = total allocations?) ──────────

create or replace view public.v_zero_based_totals as
select
  bc.user_id,
  sum(bc.monthly_amount_cents)                                     as total_allocated_cents
from public.budget_categories bc
where bc.is_active = true
group by bc.user_id;

-- ─── 6. Uncategorized Transaction Count (for nav badge) ──────────────────────

create or replace view public.v_uncategorized_count as
select
  user_id,
  count(*) as uncategorized_count
from public.transactions
where status = 'uncategorized'
group by user_id;

-- ─── 7. Rental Portfolio Summary ─────────────────────────────────────────────

create or replace view public.v_rental_portfolio as
select
  user_id,
  count(*)                                        as property_count,
  sum(gross_rent_cents)                           as total_gross_rent_cents,
  sum(pi_cents + escrow_cents)                    as total_debt_service_cents,
  sum(net_cash_flow_cents)                        as total_net_cash_flow_cents,
  sum(equity_cents)                               as total_equity_cents,
  sum(property_value_cents)                       as total_portfolio_value_cents,
  sum(mortgage_balance_cents)                     as total_mortgage_balance_cents
from public.v_property_cash_flow
where is_active = true
group by user_id;
