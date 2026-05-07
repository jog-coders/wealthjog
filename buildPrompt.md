You are building a full-stack Personal Financial Planner web application
from scratch. Generate ALL files in one shot — frontend, backend, and
deployment config. Do not ask clarifying questions. Build everything
described below completely.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend  : React 18 + Vite, TailwindCSS, Recharts,
            @supabase/supabase-js (auth only),
            react-router-dom v6, react-hot-toast
Backend   : Node.js, Express, @supabase/supabase-js (service role),
            express-validator, cors, helmet, dotenv
Database  : Supabase (PostgreSQL) — schema already exists, do not
            generate migration SQL
Auth      : Supabase Auth — Google OAuth + email/password
Deploy    : Frontend → Vercel, Backend → Render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONOREPO FILE STRUCTURE — generate every file listed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── vercel.json
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── supabaseClient.js
│       ├── context/
│       │   └── AppContext.jsx
│       ├── hooks/
│       │   ├── useApi.js
│       │   ├── useIncome.js
│       │   ├── useBudget.js
│       │   ├── useAssets.js
│       │   ├── useLiabilities.js
│       │   ├── useExpenses.js
│       │   └── useDashboard.js
│       ├── utils/
│       │   ├── formatCurrency.js
│       │   ├── normalizeIncome.js
│       │   └── categoryColors.js
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Stepper.jsx
│       │   ├── CurrencyInput.jsx
│       │   ├── PercentBadge.jsx
│       │   ├── RunningTotal.jsx
│       │   ├── EmptyState.jsx
│       │   ├── ConfirmDialog.jsx
│       │   ├── LoadingSpinner.jsx
│       │   └── AutoInjectedRow.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── Budget/
│           │   ├── BudgetPage.jsx
│           │   ├── IncomeStep.jsx
│           │   ├── AnnualBudgetStep.jsx
│           │   ├── FixedMonthlyStep.jsx
│           │   ├── GuiltFreeStep.jsx
│           │   └── BudgetVisuals.jsx
│           ├── AssetsLiabilities/
│           │   ├── AssetsLiabilitiesPage.jsx
│           │   ├── AssetsTable.jsx
│           │   ├── LiabilitiesTable.jsx
│           │   └── AssetsLiabilitiesVisuals.jsx
│           ├── ExpenseTracker/
│           │   ├── ExpenseTrackerPage.jsx
│           │   ├── ExpenseForm.jsx
│           │   ├── ExpenseTable.jsx
│           │   └── OverspendAlerts.jsx
│           ├── Dashboard/
│           │   ├── DashboardPage.jsx
│           │   ├── NetWorthSnapshot.jsx
│           │   ├── NetWorthHistory.jsx
│           │   ├── ExpenseVsBudget.jsx
│           │   ├── MonthlySpendChart.jsx
│           │   └── AnnualTrackingChart.jsx
│           └── Settings/
│               ├── SettingsPage.jsx
│               └── EnumManager.jsx
│
├── backend/
│   ├── package.json
│   ├── render.yaml
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── supabaseClient.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── validate.js
│       ├── routes/
│       │   ├── income.js
│       │   ├── budget.js
│       │   ├── assets.js
│       │   ├── liabilities.js
│       │   ├── expenses.js
│       │   ├── dashboard.js
│       │   └── settings.js
│       ├── services/
│       │   └── netWorthSnapshot.js
│       └── utils/
│           └── normalize.js
│
├── .gitignore
└── README.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE — existing tables (do NOT recreate, just use)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All tables have: id (uuid pk), user_id (uuid → auth.users), 
created_at, updated_at. RLS is already enabled — every query 
MUST filter by user_id = req.userId on the backend.

Table: income
  name TEXT, description TEXT, type income_type, 
  frequency income_frequency, amount NUMERIC(12,2)
  income_type enum: 'Salary' | 'Rental' | 'Other Income'
  income_frequency enum: 'Biweekly' | 'Monthly' | 'Annual'

Table: budget_line_items
  section budget_section, category TEXT, amount NUMERIC(12,2),
  sort_order INT, is_auto_injected BOOLEAN, source_id UUID,
  source_type TEXT ('asset' | 'liability')
  budget_section enum: 'annual' | 'fixed_monthly' | 'guilt_free'

Table: assets
  name TEXT, type TEXT, institution TEXT,
  amount NUMERIC(14,2), monthly_fixed_savings NUMERIC(12,2)

Table: liabilities
  name TEXT, type TEXT, institution TEXT,
  amount NUMERIC(14,2), monthly_fixed_expense NUMERIC(12,2)

Table: expenses
  date DATE, vendor TEXT, budget_category TEXT, amount NUMERIC(12,2)

Table: net_worth_snapshots
  snapshot_date DATE, total_assets NUMERIC(14,2),
  total_liabilities NUMERIC(14,2), net_worth NUMERIC(14,2)

Table: custom_enum_values
  domain TEXT ('asset_type' | 'liability_type'), label TEXT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND — complete implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── backend/.env.example ──
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLIENT_ORIGIN=http://localhost:5173
PORT=4000

── backend/src/supabaseClient.js ──
Create a single Supabase client using the service role key.
Export it as a named export `supabase`.

── backend/src/middleware/auth.js ──
Extract Bearer token from Authorization header.
Call supabase.auth.getUser(token).
Attach user.id to req.userId. Return 401 if missing or invalid.

── backend/src/middleware/validate.js ──
Export a middleware that reads express-validator results.
If errors exist, return 400 with { errors: [...] }.

── backend/src/utils/normalize.js ──
Export three pure functions — all accept (amount, frequency):
  toMonthly:   Biweekly × (26/12) | Monthly × 1 | Annual ÷ 12
  toAnnual:    Biweekly × 26      | Monthly × 12 | Annual × 1
  toBiweekly:  Monthly × (12/26)  | Annual ÷ 26  | Biweekly × 1

── backend/src/services/netWorthSnapshot.js ──
Export async maybeSnapshot(userId):
  1. Sum assets.amount for userId
  2. Sum liabilities.amount for userId
  3. Upsert into net_worth_snapshots:
     WHERE user_id = userId AND snapshot_date = today
     SET total_assets, total_liabilities,
         net_worth = assets - liabilities
  One snapshot per user per calendar day maximum.

── backend/src/routes/income.js ──
All routes: apply auth middleware, scope all queries to req.userId.

GET  /api/income
  Return all income rows ordered by created_at ASC.
  Also return computed totals in the response:
    biweeklyTotal, monthlyTotal, annualTotal
  (sum all entries after normalizing each to the target frequency)

POST /api/income
  Validate: name required, type in enum, frequency in enum, amount ≥ 0.
  Insert row. Call maybeSnapshot(req.userId). Return new row.

PUT  /api/income/:id
  Verify ownership (select row, check user_id). Same validations.
  Update. Call maybeSnapshot. Return updated row.

DELETE /api/income/:id
  Verify ownership. Delete. Call maybeSnapshot. Return { success: true }.

── backend/src/routes/budget.js ──

GET /api/budget/summary
  Fetch all budget_line_items for user grouped by section.
  Fetch income and compute monthlyIncome using toMonthly.
  Compute:
    annualTotal        = sum of annual section amounts
    fixedMonthlyTotal  = sum of all fixed_monthly amounts
                         (including auto-injected, including
                          the implicit annualTotal/12 row)
    guiltFreeCapAmount = monthlyIncome - fixedMonthlyTotal
    guiltFreeSpent     = sum of guilt_free amounts
    guiltFreeSurplus   = guiltFreeCapAmount - guiltFreeSpent
  Return all line items plus all computed values.

GET /api/budget/:section
  Return all budget_line_items for user where section = :section
  ordered by sort_order ASC.

POST /api/budget/batch
  Body: { section: 'annual'|'fixed_monthly'|'guilt_free',
          items: [{ category, amount, sort_order }] }
  In a single operation:
    DELETE existing rows for user + section WHERE is_auto_injected = false
    INSERT all items from body with is_auto_injected = false
  Never touch is_auto_injected = true rows.
  Return the full updated list for that section.

── backend/src/routes/assets.js ──
All routes: auth middleware, scoped to req.userId.

GET /api/assets
  Supports ?search=text (filter name ILIKE) and ?type=value.
  Return all matching assets ordered by created_at ASC.

GET /api/assets/total
  Return { totalAmount: sum of all asset amounts for user }.

POST /api/assets
  Validate: name required, amount ≥ 0,
            monthly_fixed_savings ≥ 0 if provided.
  Insert asset.
  If monthly_fixed_savings > 0:
    Upsert budget_line_items row:
      section='fixed_monthly', is_auto_injected=true,
      source_id=asset.id, source_type='asset',
      category='[asset.name] — Savings',
      amount=monthly_fixed_savings
  Call maybeSnapshot. Return new asset.

PUT /api/assets/:id
  Verify ownership. Validate same as POST.
  Update asset.
  If monthly_fixed_savings > 0: upsert auto-injected budget row.
  If monthly_fixed_savings is null/0: delete auto-injected row
    WHERE source_id=asset.id AND source_type='asset'.
  Call maybeSnapshot. Return updated asset.

DELETE /api/assets/:id
  Verify ownership. Delete asset.
  Delete auto-injected budget row WHERE source_id=id AND source_type='asset'.
  Call maybeSnapshot. Return { success: true }.

── backend/src/routes/liabilities.js ──
Mirror of assets.js with these differences:
  field: monthly_fixed_expense (not monthly_fixed_savings)
  auto-inject: category='[liability.name] — Payment', source_type='liability'
  endpoint prefix: /api/liabilities
  total endpoint: GET /api/liabilities/total

── backend/src/routes/expenses.js ──

GET /api/expenses
  Supports ?month=YYYY-MM and ?category=text filters.
  Return all matching expenses ordered by date DESC.

POST /api/expenses
  Validate: vendor required, amount ≥ 0, date valid,
            budget_category required.
  Insert. Return new row.

PUT /api/expenses/:id
  Verify ownership. Same validations. Update. Return updated row.

DELETE /api/expenses/:id
  Verify ownership. Delete. Return { success: true }.

GET /api/expenses/overspend
  For each distinct budget_category in expenses:
    monthlyBudget = annual line item for category / 12
                    OR guilt_free line item amount (prefer guilt_free if exists)
    annualBudget  = annual line item amount for category
    monthlySpent  = sum of expenses in current calendar month for category
    annualSpent   = sum of all expenses for category
  Return array of { category, type: 'monthly'|'annual',
                    budget, spent, over } only where spent > budget.

── backend/src/routes/dashboard.js ──

GET /api/dashboard/net-worth-snapshot
  Return { totalAssets, totalLiabilities,
           netWorth: totalAssets - totalLiabilities }
  Using live sums from assets and liabilities tables.

GET /api/dashboard/net-worth-history
  Query param: ?months=6 (default 6, options 3|6|12|all)
  Return net_worth_snapshots ordered by snapshot_date ASC
  filtered to last N months.

GET /api/dashboard/expense-vs-budget
  Query param: ?month=YYYY-MM (default current month)
  For each budget category (annual + guilt_free combined):
    budgeted = annual amount / 12, or guilt_free amount
    actual   = sum of expenses for category in that month
  Return array of { category, budgeted, actual }.

GET /api/dashboard/monthly-spend
  Query param: ?months=6 (default 6)
  Return expenses grouped by month and category:
  [{ month: 'YYYY-MM', [category]: totalAmount, ... }]
  ordered by month ASC.

GET /api/dashboard/annual-budget-vs-actual
  Query param: ?year=YYYY (default current year)
  For each annual budget category:
    budgeted  = budget_line_items amount for that category
    ytdActual = sum of expenses for category in given year
  Return array of { category, budgeted, ytdActual }.

── backend/src/routes/settings.js ──

GET /api/settings/enum-values
  Query param: ?domain=asset_type OR ?domain=liability_type
  Return all custom_enum_values for user + domain.

POST /api/settings/enum-values
  Body: { domain, label }. Validate both required.
  Insert. Return new row.

DELETE /api/settings/enum-values/:id
  Verify ownership.
  Check if label is in use: query assets or liabilities
    WHERE type = label AND user_id = req.userId.
  If in use, return 400 { error: 'Type is in use and cannot be deleted.' }
  Otherwise delete. Return { success: true }.

POST /api/settings/seed-defaults
  Call the Supabase RPC: seed_user_defaults(req.userId)
  This is idempotent — safe to call on every login.
  Return { success: true }.

DELETE /api/settings/all-data
  Delete all rows for req.userId from these tables in order:
    expenses, budget_line_items, assets, liabilities,
    income, net_worth_snapshots, custom_enum_values
  Return { success: true }.

── backend/src/index.js ──
Express app setup:
  Use helmet(), cors({ origin: process.env.CLIENT_ORIGIN,
                       credentials: true }), express.json()
  Mount all routes under their /api prefix.
  Global error handler: return { error: message } with 500.
  Listen on process.env.PORT || 4000.

── backend/package.json ──
Dependencies: express, @supabase/supabase-js, express-validator,
              cors, helmet, dotenv
Dev: nodemon
Scripts: "start": "node src/index.js", "dev": "nodemon src/index.js"

── backend/render.yaml ──
services:
  - type: web
    name: pf-planner-api
    env: node
    buildCommand: npm install
    startCommand: node src/index.js
    envVars:
      - key: SUPABASE_URL
      - key: SUPABASE_SERVICE_ROLE_KEY
      - key: CLIENT_ORIGIN
      - key: PORT
        value: 4000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND — complete implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── frontend/.env.example ──
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:4000

── frontend/src/supabaseClient.js ──
Create and export a Supabase client using VITE_SUPABASE_URL
and VITE_SUPABASE_ANON_KEY. Used only for auth.

── frontend/src/utils/formatCurrency.js ──
Export formatCurrency(amount):
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(amount ?? 0)

── frontend/src/utils/normalizeIncome.js ──
Mirror of backend normalize.js.
Export toMonthly, toAnnual, toBiweekly.

── frontend/src/utils/categoryColors.js ──
Export getCategoryColor(categoryName):
  Deterministic color from a fixed palette using a simple
  hash of the category string. Returns a hex color string.
  Palette of 12 visually distinct colors suitable for charts.
Export getCategoryColorMap(categories[]):
  Returns an object { [category]: hexColor } for a list of categories.
  Same category always gets the same color across all charts.

── frontend/src/context/AppContext.jsx ──
Create AppContext with React.createContext.
AppProvider wraps the whole app. Exposes:
  user, session, authLoading  — from supabase.auth.onAuthStateChange
  income[], budget{}, assets[], liabilities[], expenses[]
  Each slice has its own loading boolean and error string.
  refreshAll() — re-fetches all slices in parallel.
All data fetching goes through the Express API (VITE_API_BASE_URL),
not directly to Supabase.

── frontend/src/hooks/useApi.js ──
Returns { get, post, put, del }.
Each method:
  Reads session.access_token from AppContext.
  Calls fetch(VITE_API_BASE_URL + path, { method, headers, body }).
  Sets Authorization: Bearer <token>.
  On 401 → calls supabase.auth.signOut() then navigate('/login').
  On success → shows react-hot-toast "Saved ✓".
  On error  → shows react-hot-toast with error message.
  Returns { data, error }.

── frontend/src/hooks/useIncome.js ──
Uses useApi. Exposes:
  income[], totals{ biweekly, monthly, annual }, loading, error
  createIncome(payload), updateIncome(id, payload), deleteIncome(id)
  Each mutation refetches income list.

── frontend/src/hooks/useBudget.js ──
Uses useApi. Exposes:
  summary{}, lineItems{ annual[], fixed_monthly[], guilt_free[] },
  loading, error
  saveSection(section, items[]) — calls POST /api/budget/batch
  refresh()

── frontend/src/hooks/useAssets.js ──
Uses useApi. Exposes:
  assets[], total, loading, error,
  search string and setSearch,
  typeFilter string and setTypeFilter,
  createAsset(payload), updateAsset(id, payload), deleteAsset(id)

── frontend/src/hooks/useLiabilities.js ──
Mirror of useAssets. Fields use monthly_fixed_expense.

── frontend/src/hooks/useExpenses.js ──
Uses useApi. Exposes:
  expenses[], overspendAlerts[], loading, error,
  monthFilter, setMonthFilter,
  createExpense(payload), updateExpense(id, payload), deleteExpense(id)
  After each mutation, refetch both expenses and overspend alerts.

── frontend/src/hooks/useDashboard.js ──
Uses useApi. Exposes:
  netWorthSnapshot{}, netWorthHistory[], expenseVsBudget[],
  monthlySpend[], annualTracking[],
  loading, periodMonths, setPeriodMonths,
  refresh()

── frontend/src/components/CurrencyInput.jsx ──
Controlled input. Props: value, onChange, placeholder, error.
Displays $ prefix. Formats to 2 decimal places on blur.
Rejects negative values — shows inline red error text.
onChange fires the raw numeric value (not the formatted string).

── frontend/src/components/AutoInjectedRow.jsx ──
Table row rendered with a gray background and a lock icon.
Props: category, amount, percentOfTotal.
Not editable. Used in FixedMonthlyStep for read-only rows.

── frontend/src/components/ConfirmDialog.jsx ──
Modal dialog. Props: open, title, message, onConfirm, onCancel.
Two buttons: Cancel (outline) and Confirm (red, destructive).

── frontend/src/components/EmptyState.jsx ──
Centered layout. Props: icon, title, message, actionLabel, onAction.

── frontend/src/components/Navbar.jsx ──
Top navigation bar with 5 tabs:
  Budget | Assets & Liabilities | Expense Tracker | Dashboard | Settings
Highlights active tab. Shows user email and a Sign Out button on the right.
Sign out calls supabase.auth.signOut().

── frontend/src/components/Stepper.jsx ──
Horizontal step pills. Props: steps[], currentStep, onStepClick.
Each pill is clickable (navigates to that step).
Active step highlighted. Completed steps show a checkmark.

── frontend/src/App.jsx ──
Sets up react-router-dom BrowserRouter with routes:
  /login           → LoginPage (public)
  /                → redirect to /budget
  /budget          → BudgetPage (protected)
  /assets          → AssetsLiabilitiesPage (protected)
  /expenses        → ExpenseTrackerPage (protected)
  /dashboard       → DashboardPage (protected)
  /settings        → SettingsPage (protected)
Protected routes: if no session, redirect to /login.
Wrap all routes in AppProvider and <Toaster /> from react-hot-toast.

── frontend/src/pages/LoginPage.jsx ──
Centered card layout. App title at top.
Two sections:
  1. "Continue with Google" button → supabase.auth.signInWithOAuth
     with provider: 'google' and redirectTo: window.location.origin
  2. Divider "or"
  3. Email + Password form with Sign In and Sign Up buttons.
     Sign In  → supabase.auth.signInWithPassword({ email, password })
     Sign Up  → supabase.auth.signUp({ email, password })
After successful auth, navigate to /budget.
After first login, call POST /api/settings/seed-defaults.
Show loading spinner during auth operations.
Show error messages inline.

── frontend/src/pages/Budget/BudgetPage.jsx ──
Renders the Stepper (4 steps) and the active step component.
Steps: ['Income', 'Annual Budget', 'Fixed Monthly', 'Guilt-Free Budget']
Passes step navigation callbacks down to each step component.
Renders BudgetVisuals below the stepper.

── frontend/src/pages/Budget/IncomeStep.jsx ──
Table of income entries. Columns: Name, Description, Type,
Frequency, Amount, Actions (Edit / Delete).
Inline add/edit form above the table (toggled by "Add Income" button).
Form fields: Name (text), Description (text), Type (select:
  Salary | Rental | Other Income), Frequency (select:
  Biweekly | Monthly | Annual), Amount (CurrencyInput).
Running Net Total card below the table showing three values:
  Biweekly Total, Monthly Total, Annual Total
  computed using normalizeIncome.js from all entries.
"Next: Annual Budget →" button at the bottom.

── frontend/src/pages/Budget/AnnualBudgetStep.jsx ──
Editable table. Each row:
  Category (text input) | Amount (CurrencyInput) |
  % of Total (read-only) | Delete row button
"+ Add Category" button appends an empty row.
Running Total displayed below the table (sum of all amounts).
% of Total for each row = row amount / running total × 100.
"Save & Continue →" button calls saveSection('annual', items)
then advances to step 3.

── frontend/src/pages/Budget/FixedMonthlyStep.jsx ──
Three groups of rows in one table:

GROUP 1 — single AutoInjectedRow (always first):
  Category: "Annual Budget (Monthly)"
  Amount: annualTotal / 12
  % of Total: (annualTotal/12) / monthlyIncome × 100

GROUP 2 — auto-injected rows from assets/liabilities:
  Each row where is_auto_injected = true rendered as AutoInjectedRow.
  These update automatically when assets/liabilities change.

GROUP 3 — user-editable rows:
  Category (text input) | Amount (CurrencyInput) |
  % of Total (read-only) | Delete button
  "＋ Add Row" button appends empty row.

LAST ROW — AutoInjectedRow styled in teal:
  Category: "Total for Guilt-Free Budget"
  Amount: monthlyIncome − sum(all fixed monthly rows)
  % of Total: auto-calc
  This row is always last and cannot be moved.

ALL % of Total values use monthlyIncome as denominator
so all percentages always sum to 100%.
Show a warning banner if the total exceeds monthly income.
"Save & Continue →" saves user-editable rows only,
then advances to step 4.

── frontend/src/pages/Budget/GuiltFreeStep.jsx ──
Editable table:
  Category (text input) | Amount (CurrencyInput) |
  % of Total (amount / guiltFreeCapAmount × 100, read-only) |
  Delete row button
"＋ Add Category" button.
Running Total below the table.
Alert banner:
  surplus  (running < cap)  → green  "You have [amount] surplus."
  balanced (running = cap)  → blue   "Budget perfectly balanced."
  overspend (running > cap) → red    "You are [amount] over budget."
"Save Budget" button saves this section.

── frontend/src/pages/Budget/BudgetVisuals.jsx ──
Two Recharts charts side by side (stacked on mobile):
  1. BarChart: Annual Income vs Annual Budget Total vs Guilt-Free Total
  2. PieChart: Annual Budget categories (one slice per category)
     with legend. Colors from getCategoryColorMap.
Both use ResponsiveContainer. Show "No data" placeholder if empty.

── frontend/src/pages/AssetsLiabilities/AssetsLiabilitiesPage.jsx ──
Two sections stacked vertically.
Section header "Assets" then AssetsTable.
Section header "Liabilities" then LiabilitiesTable.
AssetsLiabilitiesVisuals at the bottom.

── frontend/src/pages/AssetsLiabilities/AssetsTable.jsx ──
Search input (live, filters by name) and Type dropdown filter.
Table columns: Name | Type | Institution | Amount |
               Monthly Fixed Savings | Actions
"＋ Add Asset" button opens an inline form or modal.
Form fields: Name (text, required), Type (select from
  custom_enum_values for asset_type domain), Institution (text),
  Amount (CurrencyInput, required), Monthly Fixed Savings (CurrencyInput).
Helper text under Monthly Fixed Savings:
  "Automatically added to Fixed Monthly Costs in the Budget tab."
Edit (pencil icon) and Delete (trash icon) per row.
Delete uses ConfirmDialog.
Running Total card below table: sum of all asset amounts.

── frontend/src/pages/AssetsLiabilities/LiabilitiesTable.jsx ──
Mirror of AssetsTable.
Field: Monthly Fixed Expense (not Monthly Fixed Savings).
Helper text: "Automatically added to Fixed Monthly Costs in the Budget tab."
Type options from custom_enum_values for liability_type domain.

── frontend/src/pages/AssetsLiabilities/AssetsLiabilitiesVisuals.jsx ──
Three Recharts charts:
  1. BarChart grouped: Total Assets bar + Total Liabilities bar.
     Metric card above showing Net Worth = Assets − Liabilities.
  2. PieChart: Asset split by type. Colors from getCategoryColorMap.
  3. PieChart: Liability split by type.
All use ResponsiveContainer. Show placeholder if no data.

── frontend/src/pages/ExpenseTracker/ExpenseTrackerPage.jsx ──
If budget has no categories (annual and guilt_free both empty):
  Show EmptyState with title "No budget set up yet",
  message "Set up your budget first to track expenses.",
  action button "Go to Budget" navigating to /budget.
Otherwise render: OverspendAlerts, ExpenseForm, ExpenseTable.

── frontend/src/pages/ExpenseTracker/ExpenseForm.jsx ──
Form fields:
  Date (date input, default today's date)
  Vendor (text, required)
  Budget Category (select): all categories from annual +
    guilt_free sections, merged and deduplicated, alphabetically sorted.
    Fixed monthly categories are excluded.
  Amount (CurrencyInput, required)
Submit button: "Add Expense". Clears form on success.

── frontend/src/pages/ExpenseTracker/ExpenseTable.jsx ──
Table columns: Date | Vendor | Category | Amount | Actions.
Sorted by date DESC by default.
Month filter dropdown (top right) to filter by YYYY-MM.
Edit and Delete actions per row. Delete uses ConfirmDialog.

── frontend/src/pages/ExpenseTracker/OverspendAlerts.jsx ──
Renders alert banners from overspendAlerts[].
Yellow banner for monthly overspend:
  "⚠ [Category] is over monthly budget by [amount]"
Red banner for annual overspend:
  "🚨 [Category] has exceeded its annual budget by [amount]"
If no alerts, render nothing (no empty state needed here).

── frontend/src/pages/Dashboard/DashboardPage.jsx ──
Responsive 2-column grid (CSS Grid, 1 col < 768px).
Renders 5 chart cards. Each card has a title and the chart.
Period selector (3 / 6 / 12 months / All Time) at the top
controls NetWorthHistory and MonthlySpendChart.

── frontend/src/pages/Dashboard/NetWorthSnapshot.jsx ──
Metric card: Total Assets, Total Liabilities, Net Worth.
BarChart with two bars (Assets, Liabilities).
Net Worth = Assets − Liabilities shown prominently.

── frontend/src/pages/Dashboard/NetWorthHistory.jsx ──
LineChart from net_worth_snapshots.
X-axis: formatted month labels. Y-axis: dollar amount.
Uses period from DashboardPage. If only one data point,
show a flat line with a note "Track more data over time."

── frontend/src/pages/Dashboard/ExpenseVsBudget.jsx ──
Grouped BarChart. Month selector dropdown (default current month).
Two bars per category: Budgeted (blue) and Actual (coral).
Show placeholder if no budget or no expenses.

── frontend/src/pages/Dashboard/MonthlySpendChart.jsx ──
Stacked BarChart. One bar per month, stacked by category.
Colors from getCategoryColorMap for consistency.
Uses period from DashboardPage.

── frontend/src/pages/Dashboard/AnnualTrackingChart.jsx ──
Grouped BarChart. Year selector (default current year).
Two bars per category: Annual Budget (blue) and YTD Actual (coral).

── frontend/src/pages/Settings/SettingsPage.jsx ──
Three sections:

1. Asset Types:  <EnumManager domain="asset_type" />
2. Liability Types: <EnumManager domain="liability_type" />
3. Danger Zone card:
   "Clear All Data" button (red, outlined).
   Opens ConfirmDialog with message:
   "This will permanently delete all your financial data.
    This cannot be undone."
   On confirm: calls DELETE /api/settings/all-data,
   then refreshAll() and navigate('/budget').

4. Placeholder card:
   Title: "Future Modules"
   Body: "Investment Tracker, Tax Planner, and Goals can be
          added here as this application grows."

── frontend/src/pages/Settings/EnumManager.jsx ──
Props: domain ('asset_type' | 'liability_type'), label (display name).
Fetches GET /api/settings/enum-values?domain=domain on mount.
Renders a list of current values as pills/tags.
Each has a delete button (×). If in use, button is disabled
with a tooltip "In use — cannot delete."
Text input + "Add" button at the bottom to add a new value.

── frontend/vercel.json ──
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}

── frontend/package.json ──
Dependencies: react, react-dom, react-router-dom,
  @supabase/supabase-js, recharts, react-hot-toast
Dev: vite, @vitejs/plugin-react, tailwindcss,
     autoprefixer, postcss

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROOT FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── .gitignore ──
node_modules/
.env
dist/
.DS_Store
*.log
.vercel/

── README.md ──
Generate a README with:
  # Personal Financial Planner

  ## Local development
  1. Clone the repo
  2. In /backend: cp .env.example .env → fill SUPABASE_URL,
     SUPABASE_SERVICE_ROLE_KEY, set CLIENT_ORIGIN=http://localhost:5173
  3. In /frontend: cp .env.example .env → fill VITE_SUPABASE_URL,
     VITE_SUPABASE_ANON_KEY, set VITE_API_BASE_URL=http://localhost:4000
  4. Run: cd backend && npm install && npm run dev
  5. Run: cd frontend && npm install && npm run dev
  6. Open http://localhost:5173

  ## Deploy to production (free)
  Backend (Render):
    - Connect /backend to a new Render Web Service
    - Set env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
      CLIENT_ORIGIN (your Vercel URL), PORT=4000
    - Note your Render URL (e.g. https://pf-planner-api.onrender.com)
    - Free tier sleeps after 15 min idle; first wake ~30s

  Frontend (Vercel):
    - Connect /frontend to a new Vercel project
    - Set root directory to /frontend
    - Set VITE_API_BASE_URL to your Render URL
    - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

  Supabase Auth setup:
    - Enable Google OAuth in Authentication → Providers
    - Set Site URL to your Vercel URL
    - Add Vercel URL + /auth/callback to Redirect URLs

  ## Adding new modules
  1. Add backend route in /backend/src/routes/newmodule.js
  2. Mount it in /backend/src/index.js
  3. Add page(s) in /frontend/src/pages/NewModule/
  4. Add a tab to /frontend/src/components/Navbar.jsx
  5. Expose shared state in AppContext if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL RULES — follow these throughout all files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Every currency value displayed uses formatCurrency().
   Never display raw numbers for money.

2. Every percentage displays as "XX.XX%" using toFixed(2).

3. CurrencyInput is used for every amount field.
   Never use a plain <input type="number"> for money.

4. No HTML <form> tags anywhere in React.
   Use onClick handlers for all form submissions.

5. All tables with no data render an EmptyState component,
   never an empty table or null.

6. All delete actions use ConfirmDialog before executing.

7. Auto-injected rows in FixedMonthlyStep always use the
   AutoInjectedRow component (gray background + lock icon).
   They are never editable.

8. All API errors surface as react-hot-toast error toasts.
   Never swallow errors silently.

9. Loading states show LoadingSpinner, never a blank screen.

10. categoryColors.js is the single source of truth for
    chart colors. The same category always gets the same
    color across all 5 dashboard charts and all pie charts.
    Import getCategoryColorMap wherever charts are rendered.

11. The backend never trusts user_id from the request body.
    Always use req.userId set by auth middleware.

12. All numeric computations guard against null/undefined
    by defaulting to 0. Never let NaN reach the UI.