-- 1. Create Rental Properties Table
CREATE TABLE IF NOT EXISTS public.rental_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    address JSONB,
    purchase_price NUMERIC DEFAULT 0,
    purchase_date DATE,
    closing_date DATE,
    
    -- Cached financial values (managed by rental_financial_history)
    current_market_value NUMERIC DEFAULT 0,
    rent NUMERIC DEFAULT 0,
    property_management_fees NUMERIC DEFAULT 0,
    
    status_occupied BOOLEAN DEFAULT true,
    
    pm_name TEXT,
    pm_email TEXT,
    pm_phone TEXT,
    pm_poc TEXT,
    pm_escalation TEXT,
    
    mortgage_interest_rate NUMERIC DEFAULT 0,
    mortgage_initial_amount NUMERIC DEFAULT 0,
    mortgage_loan_number TEXT,
    mortgage_maturity_date DATE,
    mortgage_pi NUMERIC DEFAULT 0,
    mortgage_escrow NUMERIC DEFAULT 0,
    mortgage_balance NUMERIC DEFAULT 0,
    mortgage_bank TEXT,
    
    lease_tenant_name TEXT,
    lease_start_date DATE,
    lease_end_date DATE,
    lease_document_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1b. Add new columns if the table already exists
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS closing_date DATE;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS mortgage_loan_number TEXT;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS mortgage_maturity_date DATE;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS lease_tenant_name TEXT;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS lease_start_date DATE;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS lease_end_date DATE;
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS lease_document_url TEXT;

-- 2. Create Rental Ledger Table
CREATE TABLE IF NOT EXISTS public.rental_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rental_property_id UUID REFERENCES public.rental_properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense')),
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    notes TEXT,
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Rental Financial History Ledger Table
CREATE TABLE IF NOT EXISTS public.rental_financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rental_property_id UUID REFERENCES public.rental_properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    market_value NUMERIC DEFAULT 0,
    monthly_rent NUMERIC DEFAULT 0,
    pm_fees NUMERIC DEFAULT 0,
    mortgage_balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Add auto-inject tracking to existing tables
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_auto_injected BOOLEAN DEFAULT false;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_auto_injected BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.rental_financial_history ADD COLUMN IF NOT EXISTS mortgage_balance NUMERIC DEFAULT 0;

ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS is_auto_injected BOOLEAN DEFAULT false;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.income ADD COLUMN IF NOT EXISTS is_auto_injected BOOLEAN DEFAULT false;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Enable RLS
ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_financial_history ENABLE ROW LEVEL SECURITY;

-- Drop restrictive check constraints from earlier modules that block rentals
ALTER TABLE public.budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_source_type_check;
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_source_type_check;

-- Create Policies
DROP POLICY IF EXISTS "Users can manage their own rental properties" ON public.rental_properties;
CREATE POLICY "Users can manage their own rental properties" 
ON public.rental_properties FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own rental ledger" ON public.rental_ledger;
CREATE POLICY "Users can manage their own rental ledger" 
ON public.rental_ledger FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own rental history" ON public.rental_financial_history;
CREATE POLICY "Users can manage their own rental history" 
ON public.rental_financial_history FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FAMILY SHARING: profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    family_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR ALL USING (auth.uid() = id);

-- ============================================================
-- RENTAL: is_active flag (soft-delete / deactivate)
-- ============================================================
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
