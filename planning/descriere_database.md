# descriere_database

> Fișier centralizat cu toate resursele legate de baza de date din proiectul FinGuard v2.
> Generat automat - conținut copiat identic din fișierele sursă.

---

## Inventar fișiere

### Migrații SQL
- `supabase/migrations/20260118224720_cb251b20-5c9b-4750-a4e6-104e5748b971.sql`
- `supabase/migrations/20260118224822_6a74d623-a9ed-445a-b94d-dc876eb22fd8.sql`
- `supabase/migrations/20260119094518_8bae7ead-991c-462a-a03a-04039fc01725.sql`
- `supabase/migrations/20260119094906_18e1d082-0c00-4119-a9d7-643cca59968d.sql`
- `supabase/migrations/20260119095336_795e1e99-f2d1-421c-abb1-178fa2981a4e.sql`
- `supabase/migrations/20260120100000_performance_optimizations.sql`
- `supabase/migrations/20260127000000_plan_v3.3_financial_statements_mappings.sql`

### Configurare Supabase
- `supabase/config.toml`

### Edge Functions
- `supabase/functions/parse-balanta/index.ts`

### Client & Tipuri Supabase
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

### Hooks pentru acces DB
- `src/hooks/useCompany.tsx`
- `src/hooks/useTrialBalances.tsx`
- `src/hooks/useBalante.tsx`

### Documentație DB
- `planning/tabele.md`
- `.lovable/plan_implementare _db.md`

### Fișiere ignorate (binary/temp)
- `supabase/.temp/cli-latest` (binary/ignored)

---

## Conținut Fișiere

---

### supabase/migrations/20260118224720_cb251b20-5c9b-4750-a4e6-104e5748b971.sql

```sql
-- =============================================
-- FAZA 1: STRUCTURA BAZEI DE DATE FINGUARD
-- =============================================

-- 1. Funcție Trigger pentru updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tipuri ENUM
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE public.import_status AS ENUM ('draft', 'processing', 'validated', 'completed', 'error');

-- 3. Tabel users
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_email ON public.users(email);

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tabel user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- 5. Funcție has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

ALTER FUNCTION public.has_role(UUID, app_role) OWNER TO postgres;

-- 6. Funcție get_user_id_from_auth (Helper pentru RLS)
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$;

ALTER FUNCTION public.get_user_id_from_auth() OWNER TO postgres;

-- 7. Tabel companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cui VARCHAR(50) UNIQUE NOT NULL,
    country_code CHAR(2) DEFAULT 'RO',
    currency CHAR(3) DEFAULT 'RON',
    fiscal_year_start_month INT DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_companies_cui ON public.companies(cui);
CREATE INDEX idx_companies_is_active ON public.companies(is_active);

CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Tabel company_users (FĂRĂ coloana role)
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, user_id)
);

CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);

CREATE TRIGGER set_company_users_updated_at
    BEFORE UPDATE ON public.company_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Funcție is_company_member (SECURITY DEFINER pentru RLS)
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_users
        WHERE user_id = _user_id
          AND company_id = _company_id
    )
$$;

ALTER FUNCTION public.is_company_member(UUID, UUID) OWNER TO postgres;

-- 10. Tabel trial_balance_imports
CREATE TABLE public.trial_balance_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    source_file_url TEXT,
    file_size_bytes BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status import_status DEFAULT 'draft',
    error_message TEXT,
    validation_errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT valid_period CHECK (period_start <= period_end),
    UNIQUE (company_id, period_start, period_end)
);

CREATE INDEX idx_trial_balance_imports_company_id ON public.trial_balance_imports(company_id);
CREATE INDEX idx_trial_balance_imports_status ON public.trial_balance_imports(status);
CREATE INDEX idx_trial_balance_imports_period ON public.trial_balance_imports(period_start, period_end);

CREATE TRIGGER set_trial_balance_imports_updated_at
    BEFORE UPDATE ON public.trial_balance_imports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Tabel trial_balance_accounts
CREATE TABLE public.trial_balance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    opening_debit NUMERIC(15,2) DEFAULT 0,
    opening_credit NUMERIC(15,2) DEFAULT 0,
    debit_turnover NUMERIC(15,2) DEFAULT 0,
    credit_turnover NUMERIC(15,2) DEFAULT 0,
    closing_debit NUMERIC(15,2) DEFAULT 0,
    closing_credit NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (import_id, account_code),
    CONSTRAINT check_opening_balance_xor CHECK (NOT (opening_debit > 0 AND opening_credit > 0)),
    CONSTRAINT check_closing_balance_xor CHECK (NOT (closing_debit > 0 AND closing_credit > 0))
);

CREATE INDEX idx_trial_balance_accounts_import_id ON public.trial_balance_accounts(import_id);
CREATE INDEX idx_trial_balance_accounts_account_code ON public.trial_balance_accounts(account_code);

-- 12. Funcție can_access_import (SECURITY DEFINER pentru RLS accounts)
CREATE OR REPLACE FUNCTION public.can_access_import(_user_id UUID, _import_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.trial_balance_imports tbi
        JOIN public.company_users cu ON cu.company_id = tbi.company_id
        WHERE tbi.id = _import_id
          AND cu.user_id = _user_id
    )
$$;

ALTER FUNCTION public.can_access_import(UUID, UUID) OWNER TO postgres;

-- 13. Funcție pentru creare automată profil la înregistrare
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'user'
    FROM public.users
    WHERE auth_user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 14. POLITICI RLS
-- =============================================

-- RLS pentru users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
        OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
    );

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Only system can insert users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (
        auth_user_id = auth.uid()
        OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
    );

-- RLS pentru user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        user_id = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
        OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
    );

CREATE POLICY "Only super_admin can insert roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(public.get_user_id_from_auth(), 'super_admin'));

CREATE POLICY "Only super_admin can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.has_role(public.get_user_id_from_auth(), 'super_admin'))
    WITH CHECK (public.has_role(public.get_user_id_from_auth(), 'super_admin'));

CREATE POLICY "Only super_admin can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.has_role(public.get_user_id_from_auth(), 'super_admin'));

-- RLS pentru companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view company"
    ON public.companies FOR SELECT
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), id)
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
        OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
    );

CREATE POLICY "Authenticated users can create companies"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Company members can update company"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), id)
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    )
    WITH CHECK (
        public.is_company_member(public.get_user_id_from_auth(), id)
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    );

CREATE POLICY "Only admin can delete companies"
    ON public.companies FOR DELETE
    TO authenticated
    USING (
        public.has_role(public.get_user_id_from_auth(), 'admin')
        OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
    );

-- RLS pentru company_users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view memberships"
    ON public.company_users FOR SELECT
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    );

CREATE POLICY "Company members can add members"
    ON public.company_users FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
        OR NOT EXISTS (SELECT 1 FROM public.company_users cu2 WHERE cu2.company_id = company_id)
    );

CREATE POLICY "Company members can update memberships"
    ON public.company_users FOR UPDATE
    TO authenticated
    USING (public.is_company_member(public.get_user_id_from_auth(), company_id))
    WITH CHECK (public.is_company_member(public.get_user_id_from_auth(), company_id));

CREATE POLICY "Company members can remove members"
    ON public.company_users FOR DELETE
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        OR user_id = public.get_user_id_from_auth()
    );

-- RLS pentru trial_balance_imports
ALTER TABLE public.trial_balance_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view imports"
    ON public.trial_balance_imports FOR SELECT
    TO authenticated
    USING (public.is_company_member(public.get_user_id_from_auth(), company_id));

CREATE POLICY "Company members can create imports"
    ON public.trial_balance_imports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        AND uploaded_by = public.get_user_id_from_auth()
    );

CREATE POLICY "Uploader or admin can update imports"
    ON public.trial_balance_imports FOR UPDATE
    TO authenticated
    USING (
        uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    )
    WITH CHECK (
        uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    );

CREATE POLICY "Uploader or admin can delete imports"
    ON public.trial_balance_imports FOR DELETE
    TO authenticated
    USING (
        uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin')
    );

-- RLS pentru trial_balance_accounts
ALTER TABLE public.trial_balance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts if can access import"
    ON public.trial_balance_accounts FOR SELECT
    TO authenticated
    USING (public.can_access_import(public.get_user_id_from_auth(), import_id));

CREATE POLICY "Users can insert accounts if can access import"
    ON public.trial_balance_accounts FOR INSERT
    TO authenticated
    WITH CHECK (public.can_access_import(public.get_user_id_from_auth(), import_id));

CREATE POLICY "Users can update accounts if can access import"
    ON public.trial_balance_accounts FOR UPDATE
    TO authenticated
    USING (public.can_access_import(public.get_user_id_from_auth(), import_id))
    WITH CHECK (public.can_access_import(public.get_user_id_from_auth(), import_id));

CREATE POLICY "Users can delete accounts if can access import"
    ON public.trial_balance_accounts FOR DELETE
    TO authenticated
    USING (public.can_access_import(public.get_user_id_from_auth(), import_id));

-- =============================================
-- 15. STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('balante', 'balante', false);

CREATE POLICY "Company members can upload balance files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'balante'
        AND public.is_company_member(
            public.get_user_id_from_auth(),
            (storage.foldername(name))[1]::UUID
        )
    );

CREATE POLICY "Company members can view balance files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'balante'
        AND public.is_company_member(
            public.get_user_id_from_auth(),
            (storage.foldername(name))[1]::UUID
        )
    );

CREATE POLICY "Company members can delete balance files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'balante'
        AND public.is_company_member(
            public.get_user_id_from_auth(),
            (storage.foldername(name))[1]::UUID
        )
    );
```

---

### supabase/migrations/20260118224822_6a74d623-a9ed-445a-b94d-dc876eb22fd8.sql

```sql
-- Rezolvare avertismente de securitate

-- 1. Adaugă search_path la funcția update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2. Adaugă search_path la funcția handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'user'
    FROM public.users
    WHERE auth_user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3. Înlocuiește politica permisivă pentru INSERT companies cu o verificare reală
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

CREATE POLICY "Authenticated users can create companies"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_id_from_auth() IS NOT NULL
    );
```

---

### supabase/migrations/20260119094518_8bae7ead-991c-462a-a03a-04039fc01725.sql

```sql
-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Company members can view company" ON public.companies;

-- Create a new SELECT policy that also allows the creator to see the company
-- by checking if they just inserted it (using a subquery for recent inserts isn't reliable)
-- Instead, we'll allow users to see companies they are members of OR if no members exist yet
CREATE POLICY "Company members can view company" 
ON public.companies 
FOR SELECT 
USING (
  is_company_member(get_user_id_from_auth(), id) 
  OR has_role(get_user_id_from_auth(), 'admin'::app_role) 
  OR has_role(get_user_id_from_auth(), 'super_admin'::app_role)
);

-- Also, update the company_users INSERT policy to allow first member insertion
DROP POLICY IF EXISTS "Company members can add members" ON public.company_users;

CREATE POLICY "Users can add themselves to new companies or existing members can add" 
ON public.company_users 
FOR INSERT 
WITH CHECK (
  -- Allow if user is adding themselves
  (user_id = get_user_id_from_auth())
  OR
  -- Allow if user is already a member of the company
  is_company_member(get_user_id_from_auth(), company_id) 
  OR 
  -- Allow admins
  has_role(get_user_id_from_auth(), 'admin'::app_role)
);
```

---

### supabase/migrations/20260119094906_18e1d082-0c00-4119-a9d7-643cca59968d.sql

```sql
-- Create a function that creates a company and adds the user as a member in one transaction
-- This bypasses the RLS SELECT restriction by returning the ID directly
CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name VARCHAR,
  p_cui VARCHAR,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Insert the company
  INSERT INTO public.companies (name, cui)
  VALUES (p_name, p_cui)
  RETURNING id INTO v_company_id;
  
  -- Add the user as a member
  INSERT INTO public.company_users (company_id, user_id)
  VALUES (v_company_id, p_user_id);
  
  RETURN v_company_id;
END;
$$;
```

---

### supabase/migrations/20260119095336_795e1e99-f2d1-421c-abb1-178fa2981a4e.sql

```sql
-- Update the function to handle existing companies with same CUI
CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name VARCHAR,
  p_cui VARCHAR,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_existing_company_id UUID;
BEGIN
  -- Check if company with this CUI already exists
  SELECT id INTO v_existing_company_id
  FROM public.companies
  WHERE cui = p_cui;
  
  IF v_existing_company_id IS NOT NULL THEN
    -- Check if user is already a member
    IF EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = v_existing_company_id AND user_id = p_user_id
    ) THEN
      -- User is already a member, just return the company ID
      RETURN v_existing_company_id;
    END IF;
    
    -- Add user to existing company
    INSERT INTO public.company_users (company_id, user_id)
    VALUES (v_existing_company_id, p_user_id);
    
    RETURN v_existing_company_id;
  END IF;
  
  -- Insert new company
  INSERT INTO public.companies (name, cui)
  VALUES (p_name, p_cui)
  RETURNING id INTO v_company_id;
  
  -- Add the user as a member
  INSERT INTO public.company_users (company_id, user_id)
  VALUES (v_company_id, p_user_id);
  
  RETURN v_company_id;
END;
$$;
```

---

### supabase/migrations/20260120100000_performance_optimizations.sql

```sql
-- =============================================
-- MIGRARE: OPTIMIZĂRI PERFORMANȚĂ ȘI SCALABILITATE
-- Data: 2026-01-20
-- Rezolvă: N+1 queries, totals server-side, soft delete, paginare
-- =============================================

-- =============================================================================
-- 1. SOFT DELETE PENTRU TRIAL_BALANCE_IMPORTS
-- Rezolvă: UNIQUE constraint rigid - permite re-upload pentru aceeași perioadă
-- =============================================================================

-- Adăugăm coloana deleted_at pentru soft delete
ALTER TABLE public.trial_balance_imports 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index pentru filtrare rapidă a înregistrărilor active
CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_deleted_at 
ON public.trial_balance_imports(deleted_at) 
WHERE deleted_at IS NULL;

-- Ștergem constraint-ul UNIQUE vechi și creăm unul nou care exclude înregistrările șterse
ALTER TABLE public.trial_balance_imports 
DROP CONSTRAINT IF EXISTS trial_balance_imports_company_id_period_start_period_end_key;

-- Creăm un index unic parțial care permite re-upload pentru aceeași perioadă
-- (doar înregistrările active trebuie să fie unice)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_balance_unique_active_period 
ON public.trial_balance_imports(company_id, period_start, period_end) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. FUNCȚIE PENTRU CALCULAREA TOTALURILOR SERVER-SIDE
-- Rezolvă: N+1 query la încărcarea totalurilor pentru liste
-- =============================================================================

/**
 * Funcție care calculează totalurile pentru un import specific.
 * Evită necesitatea de a încărca toate conturile în client pentru calculul totalurilor.
 * 
 * @param _import_id - ID-ul importului pentru care se calculează totalurile
 * @returns Record cu totaluri și număr de conturi
 */
CREATE OR REPLACE FUNCTION public.get_import_totals(_import_id UUID)
RETURNS TABLE (
    total_opening_debit NUMERIC(15,2),
    total_opening_credit NUMERIC(15,2),
    total_debit_turnover NUMERIC(15,2),
    total_credit_turnover NUMERIC(15,2),
    total_closing_debit NUMERIC(15,2),
    total_closing_credit NUMERIC(15,2),
    accounts_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(SUM(opening_debit), 0)::NUMERIC(15,2) as total_opening_debit,
        COALESCE(SUM(opening_credit), 0)::NUMERIC(15,2) as total_opening_credit,
        COALESCE(SUM(debit_turnover), 0)::NUMERIC(15,2) as total_debit_turnover,
        COALESCE(SUM(credit_turnover), 0)::NUMERIC(15,2) as total_credit_turnover,
        COALESCE(SUM(closing_debit), 0)::NUMERIC(15,2) as total_closing_debit,
        COALESCE(SUM(closing_credit), 0)::NUMERIC(15,2) as total_closing_credit,
        COUNT(*)::BIGINT as accounts_count
    FROM public.trial_balance_accounts
    WHERE import_id = _import_id
$$;

ALTER FUNCTION public.get_import_totals(UUID) OWNER TO postgres;

-- =============================================================================
-- 3. FUNCȚIE BATCH PENTRU TOTALURILE MULTIPLE IMPORTURI
-- Rezolvă: N+1 query când afișăm lista de importuri cu totaluri
-- =============================================================================

/**
 * Funcție care calculează totalurile pentru multiple importuri dintr-o dată.
 * Folosită pentru afișarea listei de balanțe cu totaluri fără N+1 queries.
 * 
 * @param _company_id - ID-ul companiei
 * @returns Set de recorduri cu totaluri pentru fiecare import
 */
CREATE OR REPLACE FUNCTION public.get_company_imports_with_totals(_company_id UUID)
RETURNS TABLE (
    import_id UUID,
    source_file_name VARCHAR(255),
    period_start DATE,
    period_end DATE,
    status public.import_status,
    error_message TEXT,
    created_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    source_file_url TEXT,
    total_closing_debit NUMERIC(15,2),
    total_closing_credit NUMERIC(15,2),
    accounts_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tbi.id as import_id,
        tbi.source_file_name,
        tbi.period_start,
        tbi.period_end,
        tbi.status,
        tbi.error_message,
        tbi.created_at,
        tbi.processed_at,
        tbi.source_file_url,
        COALESCE(SUM(tba.closing_debit), 0)::NUMERIC(15,2) as total_closing_debit,
        COALESCE(SUM(tba.closing_credit), 0)::NUMERIC(15,2) as total_closing_credit,
        COUNT(tba.id)::BIGINT as accounts_count
    FROM public.trial_balance_imports tbi
    LEFT JOIN public.trial_balance_accounts tba ON tba.import_id = tbi.id
    WHERE tbi.company_id = _company_id
      AND tbi.deleted_at IS NULL
    GROUP BY tbi.id, tbi.source_file_name, tbi.period_start, tbi.period_end, 
             tbi.status, tbi.error_message, tbi.created_at, tbi.processed_at, tbi.source_file_url
    ORDER BY tbi.created_at DESC
$$;

ALTER FUNCTION public.get_company_imports_with_totals(UUID) OWNER TO postgres;

-- =============================================================================
-- 4. FUNCȚIE PENTRU OBȚINEREA BALANȚELOR CU CONTURI (BATCH)
-- Rezolvă: N+1 query în getAllBalancesWithAccounts din useBalante.tsx
-- =============================================================================

/**
 * Funcție care returnează toate balanțele completate cu conturile lor.
 * Un singur query în loc de N+1 queries.
 * 
 * @param _company_id - ID-ul companiei
 * @param _limit - Numărul maxim de balanțe de returnat (pentru paginare)
 * @param _offset - Offset pentru paginare
 * @returns JSON array cu balanțele și conturile lor
 */
CREATE OR REPLACE FUNCTION public.get_balances_with_accounts(
    _company_id UUID,
    _limit INT DEFAULT 10,
    _offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(balance_data ORDER BY period_end DESC), '[]'::JSONB)
    INTO result
    FROM (
        SELECT jsonb_build_object(
            'id', tbi.id,
            'company_id', tbi.company_id,
            'source_file_name', tbi.source_file_name,
            'period_start', tbi.period_start,
            'period_end', tbi.period_end,
            'status', tbi.status,
            'created_at', tbi.created_at,
            'processed_at', tbi.processed_at,
            'accounts', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', tba.id,
                        'import_id', tba.import_id,
                        'account_code', tba.account_code,
                        'account_name', tba.account_name,
                        'opening_debit', tba.opening_debit,
                        'opening_credit', tba.opening_credit,
                        'debit_turnover', tba.debit_turnover,
                        'credit_turnover', tba.credit_turnover,
                        'closing_debit', tba.closing_debit,
                        'closing_credit', tba.closing_credit
                    ) ORDER BY tba.account_code
                )
                FROM public.trial_balance_accounts tba
                WHERE tba.import_id = tbi.id
                ), '[]'::JSONB
            )
        ) as balance_data
        FROM public.trial_balance_imports tbi
        WHERE tbi.company_id = _company_id
          AND tbi.status = 'completed'
          AND tbi.deleted_at IS NULL
        ORDER BY tbi.period_end DESC
        LIMIT _limit
        OFFSET _offset
    ) subquery;
    
    RETURN result;
END;
$$;

ALTER FUNCTION public.get_balances_with_accounts(UUID, INT, INT) OWNER TO postgres;

-- =============================================================================
-- 5. FUNCȚIE PENTRU CONTURI CU PAGINARE
-- Rezolvă: Lipsa paginării la afișarea conturilor
-- =============================================================================

/**
 * Funcție care returnează conturile unui import cu paginare.
 * 
 * @param _import_id - ID-ul importului
 * @param _limit - Numărul de conturi per pagină
 * @param _offset - Offset pentru paginare
 * @returns Table cu conturi și total_count pentru paginare
 */
CREATE OR REPLACE FUNCTION public.get_accounts_paginated(
    _import_id UUID,
    _limit INT DEFAULT 50,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    import_id UUID,
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    opening_debit NUMERIC(15,2),
    opening_credit NUMERIC(15,2),
    debit_turnover NUMERIC(15,2),
    credit_turnover NUMERIC(15,2),
    closing_debit NUMERIC(15,2),
    closing_credit NUMERIC(15,2),
    total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tba.id,
        tba.import_id,
        tba.account_code,
        tba.account_name,
        tba.opening_debit,
        tba.opening_credit,
        tba.debit_turnover,
        tba.credit_turnover,
        tba.closing_debit,
        tba.closing_credit,
        (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = _import_id)::BIGINT as total_count
    FROM public.trial_balance_accounts tba
    WHERE tba.import_id = _import_id
    ORDER BY tba.account_code
    LIMIT _limit
    OFFSET _offset
$$;

ALTER FUNCTION public.get_accounts_paginated(UUID, INT, INT) OWNER TO postgres;

-- =============================================================================
-- 6. ACTUALIZARE RLS PENTRU NOILE FUNCȚII
-- =============================================================================

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.get_import_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_imports_with_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balances_with_accounts(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_paginated(UUID, INT, INT) TO authenticated;

-- =============================================================================
-- 7. ACTUALIZARE POLITICI RLS PENTRU SOFT DELETE
-- =============================================================================

-- Actualizăm politica de SELECT pentru a exclude înregistrările șterse
DROP POLICY IF EXISTS "Company members can view imports" ON public.trial_balance_imports;

CREATE POLICY "Company members can view imports"
    ON public.trial_balance_imports FOR SELECT
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        AND deleted_at IS NULL
    );

-- Politică pentru soft delete în loc de hard delete
DROP POLICY IF EXISTS "Uploader or admin can delete imports" ON public.trial_balance_imports;

CREATE POLICY "Uploader or admin can soft delete imports"
    ON public.trial_balance_imports FOR UPDATE
    TO authenticated
    USING (
        (uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin'))
        AND deleted_at IS NULL
    )
    WITH CHECK (
        (uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin'))
    );

-- =============================================================================
-- 8. INDEX PENTRU PERFORMANȚĂ
-- =============================================================================

-- Index compus pentru query-urile frecvente
CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_company_status_active 
ON public.trial_balance_imports(company_id, status, period_end DESC) 
WHERE deleted_at IS NULL;

-- Index pentru accounts cu import_id și account_code
CREATE INDEX IF NOT EXISTS idx_trial_balance_accounts_import_code 
ON public.trial_balance_accounts(import_id, account_code);

-- =============================================================================
-- 9. FUNCȚIE HELPER PENTRU SOFT DELETE
-- =============================================================================

/**
 * Funcție pentru ștergerea soft a unui import și a fișierului asociat.
 * Marchează importul ca șters fără a elimina datele.
 * 
 * @param _import_id - ID-ul importului de șters
 * @returns Boolean - succes sau eșec
 */
CREATE OR REPLACE FUNCTION public.soft_delete_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _can_delete BOOLEAN;
BEGIN
    -- Get current user
    _user_id := public.get_user_id_from_auth();
    
    -- Check if user can delete
    SELECT EXISTS (
        SELECT 1 FROM public.trial_balance_imports
        WHERE id = _import_id
        AND (uploaded_by = _user_id OR public.has_role(_user_id, 'admin'))
        AND deleted_at IS NULL
    ) INTO _can_delete;
    
    IF NOT _can_delete THEN
        RETURN FALSE;
    END IF;
    
    -- Perform soft delete
    UPDATE public.trial_balance_imports
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = _import_id
    AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$;

ALTER FUNCTION public.soft_delete_import(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.soft_delete_import(UUID) TO authenticated;

-- =============================================================================
-- 10. VIEW PENTRU IMPORTURI ACTIVE (OPTIMIZARE)
-- =============================================================================

CREATE OR REPLACE VIEW public.active_trial_balance_imports AS
SELECT 
    tbi.*,
    (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = tbi.id) as accounts_count
FROM public.trial_balance_imports tbi
WHERE tbi.deleted_at IS NULL;

-- Grant access to view
GRANT SELECT ON public.active_trial_balance_imports TO authenticated;
```

---

### supabase/migrations/20260127000000_plan_v3.3_financial_statements_mappings.sql

```sql
-- ============================================================================
-- MIGRARE COMPLETA (Plan Final v3.3)
-- Data: 2026-01-27
-- ============================================================================
-- Include:
-- - EXTENSION btree_gist (pentru EXCLUDE pe UUID + daterange)
-- - chart_of_accounts
-- - account_mappings (history + split + EXCLUDE non-overlap)
-- - triggers: validate_mapping_allocation (gard prezent), validate_mapping_continuity (warning), block generation on insert FS
-- - assert_mappings_complete_for_import (v3.3: access hardening + filtre conturi relevante)
-- - financial_statements (versionare + is_current)
-- - lines: balance_sheet_lines, income_statement_lines, cash_flow_lines
-- - kpi_definitions, kpi_values
-- - reports, report_statements + trigger cross-tenant
-- - RLS policies pentru toate
--
-- PRESUPUNE că există deja:
-- - public.update_updated_at_column()
-- - public.get_user_id_from_auth()
-- - public.is_company_member(uuid, uuid)
-- - public.has_role(uuid, app_role)
-- - tabelele: companies, users, trial_balance_imports, trial_balance_accounts

-- ============================================================================
-- 0) EXTENSII
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1) HELPER: acces la trial_balance_account (pentru RLS account_mappings)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_trial_balance_account(_user_id UUID, _tb_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.trial_balance_accounts tba
        JOIN public.trial_balance_imports tbi ON tbi.id = tba.import_id
        WHERE tba.id = _tb_account_id
          AND public.is_company_member(_user_id, tbi.company_id)
    )
$$;

ALTER FUNCTION public.can_access_trial_balance_account(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 2) CHART_OF_ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,

    account_type VARCHAR(50) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),

    parent_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    is_postable BOOLEAN NOT NULL DEFAULT TRUE,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_coa_company_code
    ON public.chart_of_accounts(company_id, account_code);

CREATE INDEX IF NOT EXISTS idx_coa_parent_id
    ON public.chart_of_accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_coa_type
    ON public.chart_of_accounts(account_type);

DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON public.chart_of_accounts;

CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coa_select ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_insert ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_update ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_delete ON public.chart_of_accounts;

CREATE POLICY coa_select
ON public.chart_of_accounts
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY coa_insert
ON public.chart_of_accounts
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY coa_update
ON public.chart_of_accounts
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY coa_delete
ON public.chart_of_accounts
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 3) ACCOUNT_MAPPINGS (history + split + non-overlap)
--    - Mapari curente: valid_to IS NULL (editabile)
--    - Mapari active la ref_date: valid_from <= ref_date AND (valid_to IS NULL OR valid_to >= ref_date)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trial_balance_account_id UUID NOT NULL
        REFERENCES public.trial_balance_accounts(id) ON DELETE CASCADE,

    chart_account_id UUID NOT NULL
        REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,

    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to   DATE,

    allocation_pct NUMERIC(9,6) NOT NULL DEFAULT 1.0
        CHECK (allocation_pct > 0 AND allocation_pct <= 1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (valid_to IS NULL OR valid_to >= valid_from),

    -- Non-overlap pe aceeasi pereche (tb_account_id, chart_account_id)
    EXCLUDE USING gist (
        trial_balance_account_id WITH =,
        chart_account_id WITH =,
        daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
    )
);

-- Unicitate pereche + valid_from (utila pentru idempotenta / importuri)
CREATE UNIQUE INDEX IF NOT EXISTS ux_map_pair_validity
ON public.account_mappings(trial_balance_account_id, chart_account_id, valid_from);

CREATE INDEX IF NOT EXISTS idx_account_mappings_tb
    ON public.account_mappings(trial_balance_account_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_chart
    ON public.account_mappings(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_validity
    ON public.account_mappings(valid_from, valid_to);

-- ============================================================================
-- 3a) TRIGGER "GARD" (prezent): validate_mapping_allocation pe mapari curente
--     - controleaza DOAR valid_to IS NULL
--     - blocheaza doar depasirea 100% (nu impune 100% la scriere)
--     - lock pe trial_balance_accounts pentru concurenta
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_mapping_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_allocation NUMERIC(9,6);
BEGIN
    -- Lock explicit pentru concurenta (serialization pe cont)
    PERFORM 1
    FROM public.trial_balance_accounts
    WHERE id = NEW.trial_balance_account_id
    FOR UPDATE;

    -- Suma maparilor CURENTE (valid_to IS NULL), excluzand randul curent la UPDATE
    SELECT COALESCE(SUM(allocation_pct), 0)
      INTO total_allocation
    FROM public.account_mappings
    WHERE trial_balance_account_id = NEW.trial_balance_account_id
      AND valid_to IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    total_allocation := total_allocation + NEW.allocation_pct;

    IF total_allocation > 1.000001 THEN
        RAISE EXCEPTION
            'Suma alocarilor curente pentru contul % depaseste 100%% (actual: %.4f%%)',
            NEW.trial_balance_account_id, (total_allocation * 100);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mapping_allocation ON public.account_mappings;

CREATE TRIGGER trg_validate_mapping_allocation
BEFORE INSERT OR UPDATE ON public.account_mappings
FOR EACH ROW
WHEN (NEW.valid_to IS NULL)
EXECUTE FUNCTION public.validate_mapping_allocation();

-- ============================================================================
-- 3b) WARNING optional: validate_mapping_continuity (valid_to + 1 day)
--     - NU blocheaza; doar semnalizeaza
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_mapping_continuity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_coverage_next_day BOOLEAN;
    check_date DATE;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL THEN
        check_date := (NEW.valid_to + 1);

        SELECT EXISTS (
            SELECT 1
            FROM public.account_mappings am
            WHERE am.trial_balance_account_id = NEW.trial_balance_account_id
              AND am.id != NEW.id
              AND am.valid_from <= check_date
              AND (am.valid_to IS NULL OR am.valid_to >= check_date)
        ) INTO has_coverage_next_day;

        IF NOT has_coverage_next_day THEN
            RAISE WARNING
                '[DETECTARE GAP] Contul %: maparea se inchide la %, dar nu exista acoperire pentru ziua urmatoare (%). Generarea va fi blocata daca ref_date cade in acel gap.',
                NEW.trial_balance_account_id, NEW.valid_to, check_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mapping_continuity ON public.account_mappings;

CREATE TRIGGER trg_validate_mapping_continuity
BEFORE UPDATE ON public.account_mappings
FOR EACH ROW
EXECUTE FUNCTION public.validate_mapping_continuity();

-- ============================================================================
-- 3c) RLS: ACCOUNT_MAPPINGS
-- ============================================================================
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_mappings_select ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_insert ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_update ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_delete ON public.account_mappings;

CREATE POLICY account_mappings_select
ON public.account_mappings
FOR SELECT
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_insert
ON public.account_mappings
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_update
ON public.account_mappings
FOR UPDATE
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
)
WITH CHECK (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_delete
ON public.account_mappings
FOR DELETE
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

-- ============================================================================
-- 4) assert_mappings_complete_for_import (v3.3)
--    - HARDENING: verifica acces la compania importului
--    - Verifica doar conturi RELEVANTE (sold/rulaj nenul)
--    - Valideaza suma alocarilor ACTIVE la ref_date = trial_balance_imports.period_end
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    _user_id := public.get_user_id_from_auth();

    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsa period_end/company_id (import_id=%)', _import_id;
    END IF;

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    WITH account_allocations AS (
        SELECT
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am
          ON am.trial_balance_account_id = tba.id
         AND am.valid_from <= ref_date
         AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;

    IF incomplete_count > 0 THEN
        RAISE EXCEPTION
            'Mapare incompleta pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;

    RETURN TRUE;
END;
$$;

ALTER FUNCTION public.assert_mappings_complete_for_import(UUID) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;

-- ============================================================================
-- 5) FINANCIAL_STATEMENTS (complet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    source_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,

    statement_type VARCHAR(50) NOT NULL
        CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow')),

    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    currency_code CHAR(3) NOT NULL,

    sign_convention VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (sign_convention IN ('normal', 'inverted')),

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES public.users(id),

    CONSTRAINT valid_fs_period CHECK (period_start <= period_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_period_type_version
ON public.financial_statements(company_id, period_start, period_end, statement_type, version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_one_current
ON public.financial_statements(company_id, period_start, period_end, statement_type)
WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_fs_company_period_type
ON public.financial_statements(company_id, period_start, period_end, statement_type);

CREATE INDEX IF NOT EXISTS idx_fs_source_import
ON public.financial_statements(source_import_id);

-- ============================================================================
-- 5a) Trigger: inchidere automata versiune "current" anterioara
-- ============================================================================
CREATE OR REPLACE FUNCTION public.close_previous_current_statement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE public.financial_statements
           SET is_current = FALSE
         WHERE company_id = NEW.company_id
           AND period_start = NEW.period_start
           AND period_end = NEW.period_end
           AND statement_type = NEW.statement_type
           AND is_current = TRUE
           AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_previous_current_statement ON public.financial_statements;

CREATE TRIGGER trg_close_previous_current_statement
BEFORE INSERT OR UPDATE ON public.financial_statements
FOR EACH ROW
WHEN (NEW.is_current = TRUE)
EXECUTE FUNCTION public.close_previous_current_statement();

-- ============================================================================
-- 5b) Trigger OBLIGATORIU: blocare generare fara mapare 100% (la ref_date)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation
BEFORE INSERT ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation();

-- ============================================================================
-- 5c) Trigger UPDATE (FALLBACK) - activeaza doar daca permiti UPDATE pe campurile "imutabile"
--     Recomandare: NU permite UPDATE pe company_id/period_*/statement_type/source_import_id.
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.source_import_id IS DISTINCT FROM OLD.source_import_id)
       OR (NEW.period_start IS DISTINCT FROM OLD.period_start)
       OR (NEW.period_end IS DISTINCT FROM OLD.period_end)
       OR (NEW.statement_type IS DISTINCT FROM OLD.statement_type)
       OR (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN

        PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation_on_update
ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
*/

-- ============================================================================
-- 6) HELPER: acces la financial_statement (pentru RLS lines)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_financial_statement(_user_id UUID, _statement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.financial_statements fs
        WHERE fs.id = _statement_id
          AND public.is_company_member(_user_id, fs.company_id)
    )
$$;

ALTER FUNCTION public.can_access_financial_statement(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 7) RLS: FINANCIAL_STATEMENTS
-- ============================================================================
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fs_select ON public.financial_statements;
DROP POLICY IF EXISTS fs_insert ON public.financial_statements;
DROP POLICY IF EXISTS fs_update ON public.financial_statements;
DROP POLICY IF EXISTS fs_delete ON public.financial_statements;

CREATE POLICY fs_select
ON public.financial_statements
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY fs_insert
ON public.financial_statements
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY fs_update
ON public.financial_statements
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY fs_delete
ON public.financial_statements
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 8) LINES: BALANCE_SHEET_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.balance_sheet_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    category    VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),

    chart_account_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    trial_balance_account_id UUID
        REFERENCES public.trial_balance_accounts(id) ON DELETE SET NULL,

    account_code VARCHAR(20),
    description  VARCHAR(255),

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_bs_lines_statement_order
    ON public.balance_sheet_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_bs_lines_chart_account
    ON public.balance_sheet_lines(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_bs_lines_tb_account
    ON public.balance_sheet_lines(trial_balance_account_id);

ALTER TABLE public.balance_sheet_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bs_lines_select ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_insert ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_update ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_delete ON public.balance_sheet_lines;

CREATE POLICY bs_lines_select
ON public.balance_sheet_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_insert
ON public.balance_sheet_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_update
ON public.balance_sheet_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_delete
ON public.balance_sheet_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 9) LINES: INCOME_STATEMENT_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.income_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    category VARCHAR(100) NOT NULL
        CHECK (category IN ('venituri', 'cheltuieli')),

    subcategory VARCHAR(100),

    chart_account_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    trial_balance_account_id UUID
        REFERENCES public.trial_balance_accounts(id) ON DELETE SET NULL,

    account_code VARCHAR(20),
    description  VARCHAR(255),

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_is_lines_statement_order
    ON public.income_statement_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_is_lines_chart_account
    ON public.income_statement_lines(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_is_lines_tb_account
    ON public.income_statement_lines(trial_balance_account_id);

ALTER TABLE public.income_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS is_lines_select ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_insert ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_update ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_delete ON public.income_statement_lines;

CREATE POLICY is_lines_select
ON public.income_statement_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_insert
ON public.income_statement_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_update
ON public.income_statement_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_delete
ON public.income_statement_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 10) LINES: CASH_FLOW_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_flow_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    section VARCHAR(50) NOT NULL
        CHECK (section IN ('operating', 'investing', 'financing')),

    description VARCHAR(255) NOT NULL,

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_cf_lines_statement_order
    ON public.cash_flow_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_cf_lines_section
    ON public.cash_flow_lines(section);

ALTER TABLE public.cash_flow_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_lines_select ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_insert ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_update ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_delete ON public.cash_flow_lines;

CREATE POLICY cf_lines_select
ON public.cash_flow_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_insert
ON public.cash_flow_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_update
ON public.cash_flow_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_delete
ON public.cash_flow_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 11) KPI_DEFINITIONS (global + custom), indexuri partiale
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NULL = KPI global
    company_id UUID
        REFERENCES public.companies(id) ON DELETE CASCADE,

    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,

    category VARCHAR(100)
        CHECK (category IN ('liquidity', 'profitability', 'leverage', 'efficiency', 'other')),

    formula JSONB NOT NULL,

    unit VARCHAR(50) NOT NULL DEFAULT 'ratio'
        CHECK (unit IN ('ratio', 'percentage', 'days', 'times', 'currency')),

    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_defs_global_code
ON public.kpi_definitions(code)
WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_defs_company_code
ON public.kpi_definitions(company_id, code)
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_defs_category
    ON public.kpi_definitions(category);

CREATE INDEX IF NOT EXISTS idx_kpi_defs_active
    ON public.kpi_definitions(is_active);

DROP TRIGGER IF EXISTS update_kpi_definitions_updated_at ON public.kpi_definitions;

CREATE TRIGGER update_kpi_definitions_updated_at
BEFORE UPDATE ON public.kpi_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_defs_select ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_insert ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_update ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_delete ON public.kpi_definitions;

CREATE POLICY kpi_defs_select
ON public.kpi_definitions
FOR SELECT
TO authenticated
USING (
    company_id IS NULL
    OR public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY kpi_defs_insert
ON public.kpi_definitions
FOR INSERT
TO authenticated
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY kpi_defs_update
ON public.kpi_definitions
FOR UPDATE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
)
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY kpi_defs_delete
ON public.kpi_definitions
FOR DELETE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'super_admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

-- ============================================================================
-- 12) KPI_VALUES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    kpi_definition_id UUID NOT NULL
        REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    value NUMERIC(15,4),

    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    trial_balance_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,

    metadata JSONB,

    CONSTRAINT valid_kpi_period CHECK (period_start <= period_end),

    UNIQUE (kpi_definition_id, company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_kpi_values_company_period
    ON public.kpi_values(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi
    ON public.kpi_values(kpi_definition_id);

CREATE INDEX IF NOT EXISTS idx_kpi_values_import
    ON public.kpi_values(trial_balance_import_id);

ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_values_select ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_insert ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_update ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_delete ON public.kpi_values;

CREATE POLICY kpi_values_select
ON public.kpi_values
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY kpi_values_insert
ON public.kpi_values
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY kpi_values_update
ON public.kpi_values
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY kpi_values_delete
ON public.kpi_values
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 13) REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    report_type VARCHAR(50)
        CHECK (report_type IN ('comprehensive', 'kpi_dashboard', 'comparative', 'custom')),

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    generated_by UUID NOT NULL
        REFERENCES public.users(id),

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    file_url TEXT,

    file_format VARCHAR(10)
        CHECK (file_format IN ('pdf', 'excel', 'json')),

    status VARCHAR(50) NOT NULL DEFAULT 'generating'
        CHECK (status IN ('generating', 'completed', 'error')),

    metadata JSONB,

    CONSTRAINT valid_report_period CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_reports_company_period
    ON public.reports(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_reports_type
    ON public.reports(report_type);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select ON public.reports;
DROP POLICY IF EXISTS reports_insert ON public.reports;
DROP POLICY IF EXISTS reports_update ON public.reports;
DROP POLICY IF EXISTS reports_delete ON public.reports;

CREATE POLICY reports_select
ON public.reports
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY reports_insert
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    AND generated_by = public.get_user_id_from_auth()
);

CREATE POLICY reports_update
ON public.reports
FOR UPDATE
TO authenticated
USING (
    generated_by = public.get_user_id_from_auth()
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
)
WITH CHECK (
    generated_by = public.get_user_id_from_auth()
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY reports_delete
ON public.reports
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 14) HELPER: acces la report (pentru RLS report_statements)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_report(_user_id UUID, _report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.reports r
        WHERE r.id = _report_id
          AND public.is_company_member(_user_id, r.company_id)
    )
$$;

ALTER FUNCTION public.can_access_report(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 15) REPORT_STATEMENTS (junction) + RLS + trigger cross-tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_statements (
    report_id UUID NOT NULL
        REFERENCES public.reports(id) ON DELETE CASCADE,

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    PRIMARY KEY (report_id, statement_id)
);

CREATE INDEX IF NOT EXISTS idx_report_statements_statement
    ON public.report_statements(statement_id);

-- Trigger cross-tenant (recomandat)
CREATE OR REPLACE FUNCTION public.validate_report_statement_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    report_company_id UUID;
    statement_company_id UUID;
BEGIN
    SELECT company_id INTO report_company_id
    FROM public.reports
    WHERE id = NEW.report_id;

    SELECT company_id INTO statement_company_id
    FROM public.financial_statements
    WHERE id = NEW.statement_id;

    IF report_company_id IS NULL OR statement_company_id IS NULL OR report_company_id != statement_company_id THEN
        RAISE EXCEPTION 'Report si Statement trebuie sa apartina aceleiasi companii';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_statement_same_company ON public.report_statements;

CREATE TRIGGER trg_validate_report_statement_same_company
BEFORE INSERT ON public.report_statements
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_statement_same_company();

ALTER TABLE public.report_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_statements_select ON public.report_statements;
DROP POLICY IF EXISTS report_statements_insert ON public.report_statements;
DROP POLICY IF EXISTS report_statements_delete ON public.report_statements;

CREATE POLICY report_statements_select
ON public.report_statements
FOR SELECT
TO authenticated
USING (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

CREATE POLICY report_statements_insert
ON public.report_statements
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

CREATE POLICY report_statements_delete
ON public.report_statements
FOR DELETE
TO authenticated
USING (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

-- ============================================================================
-- FIN MIGRARE v3.3
-- ============================================================================
```

---

### supabase/config.toml

```toml
project_id = "gqxopxbzslwrjgukqbha"

[functions.parse-balanta]
verify_jwt = false
```

---

### supabase/functions/parse-balanta/index.ts

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// =============================================================================
// SECURITY: CORS Configuration
// =============================================================================
// Allowed origins - restrict to your application domains
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:3000",
  "https://finguard.ro",
  "https://www.finguard.ro",
  // Add production domains here
];

/**
 * Generates CORS headers with origin validation.
 * Only allows requests from whitelisted origins.
 * 
 * @param requestOrigin - The origin header from the incoming request
 * @returns CORS headers object with appropriate Access-Control-Allow-Origin
 */
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the request origin is in our allowed list
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0]; // Default to first allowed origin

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };
}

// =============================================================================
// SECURITY: Rate Limiting
// =============================================================================
// Simple in-memory rate limiter (per IP/user)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Checks if a request should be rate limited.
 * Uses a sliding window approach with in-memory storage.
 * 
 * @param identifier - Unique identifier (user ID or IP address)
 * @returns Object with allowed status and remaining requests
 */
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    // New window or expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

// =============================================================================
// Data Types
// =============================================================================
interface ParsedAccount {
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
}

interface ParseResult {
  success: boolean;
  accounts: ParsedAccount[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    debit_turnover: number;
    credit_turnover: number;
    closing_debit: number;
    closing_credit: number;
  };
  accountsCount: number;
  error?: string;
}

// =============================================================================
// SECURITY: Input Validation & Sanitization
// =============================================================================
/** Maximum allowed string length for cell values to prevent memory attacks */
const MAX_CELL_LENGTH = 500;
/** Maximum allowed numeric value to prevent overflow */
const MAX_NUMERIC_VALUE = 999_999_999_999.99;
/** Minimum allowed numeric value */
const MIN_NUMERIC_VALUE = -999_999_999_999.99;
/** Maximum allowed accounts in a single file */
const MAX_ACCOUNTS = 10_000;

/**
 * Sanitizes a string value from Excel cells.
 * Removes potentially dangerous characters and limits length.
 * 
 * @param value - Raw cell value from Excel
 * @returns Sanitized string
 */
function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  
  let strValue = String(value);
  
  // Limit length to prevent memory attacks
  if (strValue.length > MAX_CELL_LENGTH) {
    strValue = strValue.substring(0, MAX_CELL_LENGTH);
  }
  
  // Remove potentially dangerous characters (formula injection prevention)
  // Excel formulas start with =, +, -, @, or tab/carriage return
  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  
  // Remove control characters except common whitespace
  // eslint-disable-next-line no-control-regex
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return strValue.trim();
}

/**
 * Parses and validates a numeric value from Excel cells.
 * Handles Romanian and international number formats with strict validation.
 * 
 * @param value - Raw cell value from Excel
 * @returns Validated numeric value, or 0 if invalid
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // Direct number - validate range
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100; // Round to 2 decimal places
  }
  
  // Handle string values with Romanian or international format
  const strValue = String(value).trim();
  
  // Length check to prevent ReDoS attacks
  if (strValue.length > 50) return 0;
  
  // Only allow digits, spaces, dots, commas, and minus sign
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;
  
  // Remove thousands separators and convert comma to period
  const normalized = strValue
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const num = parseFloat(normalized);
  
  // Validate the result
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  
  return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Parses an Excel file containing trial balance data.
 * Implements strict validation and sanitization to prevent injection attacks.
 * 
 * @param arrayBuffer - The Excel file as an ArrayBuffer
 * @returns ParseResult with accounts, totals, and any errors
 */
function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  try {
    // Parse workbook with security options
    const workbook = XLSX.read(arrayBuffer, { 
      type: "array",
      cellDates: false, // Don't parse dates to avoid issues
      cellNF: false, // Don't parse number formats
      cellFormula: false, // SECURITY: Disable formula parsing
    });
    
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        accounts: [],
        totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
        accountsCount: 0,
        error: "Fișierul Excel nu conține foi de lucru",
      };
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON, skip header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length < 2) {
      return {
        success: false,
        accounts: [],
        totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
        accountsCount: 0,
        error: "Fișierul nu conține date suficiente",
      };
    }

    const accounts: ParsedAccount[] = [];
    const totals = {
      opening_debit: 0,
      opening_credit: 0,
      debit_turnover: 0,
      credit_turnover: 0,
      closing_debit: 0,
      closing_credit: 0,
    };

    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) continue;
      
      // SECURITY: Sanitize account code and validate format
      const accountCode = sanitizeString(row[0]);
      
      // Validate account code (3-6 digits only)
      if (!/^\d{3,6}$/.test(accountCode)) continue;
      
      // SECURITY: Sanitize account name
      const accountName = sanitizeString(row[1]);
      
      // Skip if account name looks suspicious (potential injection)
      if (accountName.length > 200) continue;
      
      const account: ParsedAccount = {
        account_code: accountCode,
        account_name: accountName,
        opening_debit: parseNumber(row[2]),
        opening_credit: parseNumber(row[3]),
        debit_turnover: parseNumber(row[4]),
        credit_turnover: parseNumber(row[5]),
        closing_debit: parseNumber(row[6]),
        closing_credit: parseNumber(row[7]),
      };

      accounts.push(account);
      
      // SECURITY: Check max accounts limit to prevent DoS
      if (accounts.length >= MAX_ACCOUNTS) {
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached, truncating`);
        break;
      }
      
      // Accumulate totals
      totals.opening_debit += account.opening_debit;
      totals.opening_credit += account.opening_credit;
      totals.debit_turnover += account.debit_turnover;
      totals.credit_turnover += account.credit_turnover;
      totals.closing_debit += account.closing_debit;
      totals.closing_credit += account.closing_credit;
    }

    if (accounts.length === 0) {
      return {
        success: false,
        accounts: [],
        totals,
        accountsCount: 0,
        error: "Nu s-au găsit conturi valide în fișier",
      };
    }

    // Round totals to 2 decimal places
    totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
    totals.opening_credit = Math.round(totals.opening_credit * 100) / 100;
    totals.debit_turnover = Math.round(totals.debit_turnover * 100) / 100;
    totals.credit_turnover = Math.round(totals.credit_turnover * 100) / 100;
    totals.closing_debit = Math.round(totals.closing_debit * 100) / 100;
    totals.closing_credit = Math.round(totals.closing_credit * 100) / 100;

    return {
      success: true,
      accounts,
      totals,
      accountsCount: accounts.length,
    };
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return {
      success: false,
      accounts: [],
      totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
      accountsCount: 0,
      error: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Get origin for CORS headers
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // SECURITY: Rate limiting check (per user)
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          } 
        }
      );
    }

    // Get request body
    const { import_id, file_path } = await req.json();

    if (!import_id || !file_path) {
      return new Response(
        JSON.stringify({ error: "Missing import_id or file_path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("balante")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      
      // Update import status to error
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: "Nu s-a putut descărca fișierul" 
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse Excel file
    const arrayBuffer = await fileData.arrayBuffer();
    const parseResult = parseExcelFile(arrayBuffer);

    if (!parseResult.success) {
      // Update import status to error
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: parseResult.error,
          processed_at: new Date().toISOString()
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert accounts into database
    const accountsToInsert = parseResult.accounts.map(acc => ({
      import_id,
      ...acc,
    }));

    const { error: insertError } = await supabase
      .from("trial_balance_accounts")
      .insert(accountsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: "Eroare la salvarea conturilor în baza de date" 
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "Failed to save accounts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update import status to completed
    await supabase
      .from("trial_balance_imports")
      .update({ 
        status: "completed",
        processed_at: new Date().toISOString()
      })
      .eq("id", import_id);

    return new Response(
      JSON.stringify({
        success: true,
        accountsCount: parseResult.accountsCount,
        totals: parseResult.totals,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
```

---

### src/integrations/supabase/client.ts

```ts
/**
 * Supabase client configuration.
 * Uses hardcoded values as per Lovable guidelines.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Supabase project URL */
const SUPABASE_URL = "https://gqxopxbzslwrjgukqbha.supabase.co";

/** Supabase anonymous/publishable key */
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeG9weGJ6c2x3cmpndWtxYmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTczOTUsImV4cCI6MjA4NDMzMzM5NX0.WBnygrdIbFpz7wi68TKrWjc7ELC8rTfR0iXYTWtRO1Q";

/**
 * Supabase client instance for interacting with the database.
 * 
 * @example
 * import { supabase } from "@/integrations/supabase/client";
 * 
 * const { data, error } = await supabase.from('users').select('*');
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});
```

---

### src/integrations/supabase/types.ts

```ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string | null
          cui: string
          currency: string | null
          fiscal_year_start_month: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          country_code?: string | null
          created_at?: string | null
          cui: string
          currency?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string | null
          created_at?: string | null
          cui?: string
          currency?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_accounts: {
        Row: {
          account_code: string
          account_name: string
          closing_credit: number | null
          closing_debit: number | null
          created_at: string | null
          credit_turnover: number | null
          debit_turnover: number | null
          id: string
          import_id: string
          opening_credit: number | null
          opening_debit: number | null
        }
        Insert: {
          account_code: string
          account_name: string
          closing_credit?: number | null
          closing_debit?: number | null
          created_at?: string | null
          credit_turnover?: number | null
          debit_turnover?: number | null
          id?: string
          import_id: string
          opening_credit?: number | null
          opening_debit?: number | null
        }
        Update: {
          account_code?: string
          account_name?: string
          closing_credit?: number | null
          closing_debit?: number | null
          created_at?: string | null
          credit_turnover?: number | null
          debit_turnover?: number | null
          id?: string
          import_id?: string
          opening_credit?: number | null
          opening_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_accounts_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "active_trial_balance_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_accounts_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "trial_balance_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_imports: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          period_end: string
          period_start: string
          processed_at: string | null
          source_file_name: string
          source_file_url: string | null
          status: Database["public"]["Enums"]["import_status"] | null
          updated_at: string | null
          uploaded_by: string
          validation_errors: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          source_file_name: string
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by: string
          validation_errors?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          source_file_name?: string
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_trial_balance_imports: {
        Row: {
          accounts_count: number | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          source_file_name: string | null
          source_file_url: string | null
          status: Database["public"]["Enums"]["import_status"] | null
          updated_at: string | null
          uploaded_by: string | null
          validation_errors: Json | null
        }
        Insert: {
          accounts_count?: never
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Update: {
          accounts_count?: never
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_import: {
        Args: { _import_id: string; _user_id: string }
        Returns: boolean
      }
      create_company_with_member: {
        Args: { p_cui: string; p_name: string; p_user_id: string }
        Returns: string
      }
      get_accounts_paginated: {
        Args: { _import_id: string; _limit?: number; _offset?: number }
        Returns: {
          account_code: string
          account_name: string
          closing_credit: number
          closing_debit: number
          credit_turnover: number
          debit_turnover: number
          id: string
          import_id: string
          opening_credit: number
          opening_debit: number
          total_count: number
        }[]
      }
      get_balances_with_accounts: {
        Args: { _company_id: string; _limit?: number; _offset?: number }
        Returns: Json
      }
      get_company_imports_with_totals: {
        Args: { _company_id: string }
        Returns: {
          accounts_count: number
          created_at: string
          error_message: string
          import_id: string
          period_end: string
          period_start: string
          processed_at: string
          source_file_name: string
          source_file_url: string
          status: Database["public"]["Enums"]["import_status"]
          total_closing_credit: number
          total_closing_debit: number
        }[]
      }
      get_import_totals: {
        Args: { _import_id: string }
        Returns: {
          accounts_count: number
          total_closing_credit: number
          total_closing_debit: number
          total_credit_turnover: number
          total_debit_turnover: number
          total_opening_credit: number
          total_opening_debit: number
        }[]
      }
      get_user_id_from_auth: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      soft_delete_import: { Args: { _import_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
      import_status:
        | "draft"
        | "processing"
        | "validated"
        | "completed"
        | "error"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin"],
      import_status: ["draft", "processing", "validated", "completed", "error"],
    },
  },
} as const
```

---

### src/hooks/useCompany.tsx

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  id: string;
  name: string;
  cui: string;
  currency: string | null;
}

export const useCompany = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        // First get the user's internal ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (userError) throw userError;
        
        if (!userData) {
          // User profile not yet created
          setCompany(null);
          setLoading(false);
          return;
        }

        // Get the user's company membership
        const { data: membership, error: memberError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!membership) {
          // User has no company yet
          setCompany(null);
          setLoading(false);
          return;
        }

        // Get company details
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, cui, currency')
          .eq('id', membership.company_id)
          .maybeSingle();

        if (companyError) throw companyError;

        setCompany(companyData);
      } catch (err) {
        console.error('Error fetching company:', err);
        setError(err instanceof Error ? err.message : 'Error loading company');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [user]);

  const createCompany = async (name: string, cui: string) => {
    if (!user) throw new Error('Not authenticated');

    // Get user's internal ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError) throw userError;

    // Use RPC function to create company and add member atomically
    // This bypasses RLS SELECT restriction
    const { data: companyId, error: rpcError } = await supabase
      .rpc('create_company_with_member', { 
        p_name: name, 
        p_cui: cui, 
        p_user_id: userData.id 
      });
    
    if (rpcError) throw rpcError;
    
    const companyData: Company = {
      id: companyId as string,
      name,
      cui,
      currency: 'RON',
    };
    
    setCompany(companyData);
    return companyData;
  };

  return { company, loading, error, createCompany };
};
```

---

### src/hooks/useTrialBalances.tsx

```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Reprezintă un import de balanță de verificare.
 */
export interface TrialBalanceImport {
  id: string;
  company_id: string;
  source_file_name: string;
  source_file_url: string | null;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processing' | 'validated' | 'completed' | 'error';
  error_message: string | null;
  file_size_bytes: number | null;
  created_at: string;
  processed_at: string | null;
}

/**
 * Reprezintă un import cu totalurile calculate server-side.
 */
export interface TrialBalanceImportWithTotals extends TrialBalanceImport {
  total_closing_debit: number;
  total_closing_credit: number;
  accounts_count: number;
}

/**
 * Reprezintă un cont din balanța de verificare.
 */
export interface TrialBalanceAccount {
  id: string;
  import_id: string;
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
}

/**
 * Totaluri calculate pentru un import.
 */
export interface ImportTotals {
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
  accounts_count: number;
}

/**
 * Opțiuni de paginare.
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Hook pentru gestionarea balanțelor de verificare.
 * Optimizat cu:
 * - Batch queries pentru totals (evită N+1)
 * - Soft delete în loc de hard delete
 * - Paginare server-side
 * 
 * @param companyId - ID-ul companiei pentru care se încarcă datele
 * @returns Obiect cu stări și funcții pentru gestionarea balanțelor
 */
export const useTrialBalances = (companyId: string | null) => {
  const { session } = useAuth();
  const [imports, setImports] = useState<TrialBalanceImport[]>([]);
  const [importsWithTotals, setImportsWithTotals] = useState<TrialBalanceImportWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Încarcă lista de importuri pentru companie.
   * Exclude automat înregistrările șterse (soft delete).
   */
  const fetchImports = useCallback(async () => {
    if (!companyId) {
      setImports([]);
      setImportsWithTotals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Încercăm să folosim funcția optimizată care include totalurile
      const { data: dataWithTotals, error: rpcError } = await supabase.rpc('get_company_imports_with_totals', {
        _company_id: companyId
      });

      const dataArray = dataWithTotals as unknown as Array<Record<string, unknown>> | null;
      if (!rpcError && dataArray) {
        // Funcția RPC disponibilă - folosim datele optimizate
        const mappedData = dataArray.map((row: Record<string, unknown>) => ({
          id: row.import_id as string,
          company_id: companyId,
          source_file_name: row.source_file_name as string,
          source_file_url: row.source_file_url as string | null,
          period_start: row.period_start as string,
          period_end: row.period_end as string,
          status: row.status as TrialBalanceImport['status'],
          error_message: row.error_message as string | null,
          file_size_bytes: null,
          created_at: row.created_at as string,
          processed_at: row.processed_at as string | null,
          total_closing_debit: Number(row.total_closing_debit) || 0,
          total_closing_credit: Number(row.total_closing_credit) || 0,
          accounts_count: Number(row.accounts_count) || 0,
        })) as TrialBalanceImportWithTotals[];

        setImportsWithTotals(mappedData);
        setImports(mappedData);
        console.log('[useTrialBalances] Loaded', mappedData.length, 'imports with totals via RPC');
      } else {
        // Fallback la query simplu (fără totals optimize)
        console.warn('[useTrialBalances] RPC not available, using fallback query');
        const { data, error: fetchError } = await supabase
          .from('trial_balance_imports')
          .select('*')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setImports(data as TrialBalanceImport[]);
        setImportsWithTotals([]);
      }
    } catch (err) {
      console.error('[useTrialBalances] Error fetching imports:', err);
      setError(err instanceof Error ? err.message : 'Error loading imports');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  /**
   * Încarcă o balanță în sistem.
   * Procesul: Upload fișier → Creare import → Apel Edge Function pentru parsare.
   * 
   * @param file - Fișierul Excel de încărcat
   * @param periodStart - Data de început a perioadei
   * @param periodEnd - Data de sfârșit a perioadei
   * @param userId - ID-ul utilizatorului care încarcă
   * @returns Promise cu importul creat
   */
  const uploadBalance = async (
    file: File,
    periodStart: Date,
    periodEnd: Date,
    userId: string
  ): Promise<TrialBalanceImport> => {
    if (!companyId) throw new Error('No company selected');

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${companyId}/${timestamp}_${file.name}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('balante')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create import record
    const { data: importData, error: insertError } = await supabase
      .from('trial_balance_imports')
      .insert({
        company_id: companyId,
        source_file_name: file.name,
        source_file_url: filePath,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        file_size_bytes: file.size,
        uploaded_by: userId,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file
      await supabase.storage.from('balante').remove([filePath]);
      throw insertError;
    }

    // Call edge function to parse the file
    const response = await fetch(
      `https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          import_id: importData.id,
          file_path: filePath,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process file');
    }

    // Refresh imports list
    await fetchImports();

    return importData as TrialBalanceImport;
  };

  /**
   * Șterge un import folosind soft delete.
   * Marchează importul ca șters fără a elimina efectiv datele.
   * Permite restaurarea ulterioară și păstrează istoricul.
   * 
   * @param importId - ID-ul importului de șters
   */
  const deleteImport = async (importId: string) => {
    try {
      // Încercăm să folosim funcția de soft delete
      const { data: softDeleteResult, error: rpcError } = await supabase.rpc('soft_delete_import', {
        _import_id: importId
      });

      if (!rpcError && softDeleteResult) {
        console.log('[useTrialBalances] Soft delete successful for import:', importId);
        // Update local state
        setImports(imports.filter(i => i.id !== importId));
        setImportsWithTotals(importsWithTotals.filter(i => i.id !== importId));
        return;
      }

      // Fallback: hard delete
      console.warn('[useTrialBalances] RPC not available, using fallback delete');
      
      // Get import to find file path
      const importToDelete = imports.find(i => i.id === importId);
      
      if (importToDelete?.source_file_url) {
        // Delete file from storage
        await supabase.storage
          .from('balante')
          .remove([importToDelete.source_file_url]);
      }

      // Delete accounts first (foreign key constraint)
      await supabase
        .from('trial_balance_accounts')
        .delete()
        .eq('import_id', importId);

      // Delete import record
      const { error: deleteError } = await supabase
        .from('trial_balance_imports')
        .delete()
        .eq('id', importId);

      if (deleteError) throw deleteError;

      // Update local state
      setImports(imports.filter(i => i.id !== importId));
      setImportsWithTotals(importsWithTotals.filter(i => i.id !== importId));
    } catch (err) {
      console.error('[useTrialBalances] Error deleting import:', err);
      throw err;
    }
  };

  /**
   * Obține conturile pentru un import specific cu paginare opțională.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de conturi
   */
  const getAccounts = async (
    importId: string,
    options?: PaginationOptions
  ): Promise<TrialBalanceAccount[]> => {
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;

    const { data, error: fetchError } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', importId)
      .order('account_code')
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    return data as TrialBalanceAccount[];
  };

  /**
   * Obține totalurile pentru un import specific.
   * OPTIMIZAT: Folosește funcția SQL get_import_totals pentru calcul server-side.
   * Evită încărcarea tuturor conturilor în client.
   * 
   * @param importId - ID-ul importului
   * @returns Promise cu totalurile calculate
   */
  const getAccountsTotals = async (importId: string): Promise<ImportTotals> => {
    try {
      // Încercăm să folosim funcția SQL optimizată
      const { data, error: rpcError } = await supabase.rpc('get_import_totals', {
        _import_id: importId
      });

      const dataArray = data as unknown as Array<Record<string, unknown>> | null;
      if (!rpcError && dataArray && dataArray.length > 0) {
        const rowData = dataArray[0];
        return {
          opening_debit: Number(rowData.total_opening_debit) || 0,
          opening_credit: Number(rowData.total_opening_credit) || 0,
          debit_turnover: Number(rowData.total_debit_turnover) || 0,
          credit_turnover: Number(rowData.total_credit_turnover) || 0,
          closing_debit: Number(rowData.total_closing_debit) || 0,
          closing_credit: Number(rowData.total_closing_credit) || 0,
          accounts_count: Number(rowData.accounts_count) || 0,
        };
      }
    } catch (err) {
      console.warn('[useTrialBalances] RPC get_import_totals not available, using fallback');
    }

    // Fallback: calculează client-side (mai lent pentru liste mari)
    const accounts = await getAccounts(importId);
    
    return accounts.reduce(
      (acc, account) => ({
        opening_debit: acc.opening_debit + (account.opening_debit || 0),
        opening_credit: acc.opening_credit + (account.opening_credit || 0),
        debit_turnover: acc.debit_turnover + (account.debit_turnover || 0),
        credit_turnover: acc.credit_turnover + (account.credit_turnover || 0),
        closing_debit: acc.closing_debit + (account.closing_debit || 0),
        closing_credit: acc.closing_credit + (account.closing_credit || 0),
        accounts_count: acc.accounts_count + 1,
      }),
      { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0, accounts_count: 0 }
    );
  };

  /**
   * Obține totalurile pentru toate importurile dintr-o dată (batch).
   * OPTIMIZAT: Evită N+1 queries prin folosirea funcției RPC.
   * 
   * @returns Map cu import_id -> totals
   */
  const getAllImportsTotals = useCallback(async (): Promise<Map<string, ImportTotals>> => {
    const totalsMap = new Map<string, ImportTotals>();

    // Dacă avem deja datele cu totaluri din funcția RPC
    if (importsWithTotals.length > 0) {
      importsWithTotals.forEach(imp => {
        totalsMap.set(imp.id, {
          opening_debit: 0, // Nu avem aceste date în RPC-ul curent
          opening_credit: 0,
          debit_turnover: 0,
          credit_turnover: 0,
          closing_debit: imp.total_closing_debit,
          closing_credit: imp.total_closing_credit,
          accounts_count: imp.accounts_count,
        });
      });
      return totalsMap;
    }

    // Fallback: calculează pentru fiecare import
    // NOTĂ: Aceasta face N queries - evitați pe liste mari
    const completedImports = imports.filter(i => i.status === 'completed');
    
    await Promise.all(
      completedImports.map(async (imp) => {
        try {
          const totals = await getAccountsTotals(imp.id);
          totalsMap.set(imp.id, totals);
        } catch (err) {
          console.error('[useTrialBalances] Error getting totals for import:', imp.id, err);
        }
      })
    );

    return totalsMap;
  }, [imports, importsWithTotals]);

  return {
    imports,
    importsWithTotals,
    loading,
    error,
    uploadBalance,
    deleteImport,
    getAccounts,
    getAccountsTotals,
    getAllImportsTotals,
    refetch: fetchImports,
  };
};
```

---

### src/hooks/useBalante.tsx

```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';

/**
 * Reprezintă un import de balanță de verificare.
 */
export interface BalanceImport {
  id: string;
  company_id: string;
  source_file_name: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processing' | 'validated' | 'completed' | 'error';
  created_at: string;
  processed_at: string | null;
}

/**
 * Reprezintă un cont din balanța de verificare.
 */
export interface BalanceAccount {
  id: string;
  import_id: string;
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
}

/**
 * Reprezintă o balanță cu conturile asociate.
 */
export interface BalanceWithAccounts extends BalanceImport {
  accounts: BalanceAccount[];
}

/**
 * Opțiuni de paginare pentru query-uri.
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Rezultat paginat cu metadate.
 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Hook pentru gestionarea balanțelor contabile.
 * Optimizat pentru performanță cu batch queries și paginare server-side.
 * 
 * @returns Obiect cu stări și funcții pentru gestionarea balanțelor
 */
export const useBalante = () => {
  const { activeCompany, loading: companyLoading } = useCompanyContext();
  const [balances, setBalances] = useState<BalanceImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Încarcă lista de balanțe pentru compania activă.
   * Folosește query filtrat pe status 'completed' și deleted_at IS NULL.
   */
  const fetchBalances = useCallback(async () => {
    if (!activeCompany?.id) {
      setBalances([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('trial_balance_imports')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('period_end', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('[useBalante] Fetched balances:', data?.length || 0, 'for company:', activeCompany.id);
      setBalances(data as BalanceImport[]);
    } catch (err) {
      console.error('[useBalante] Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea balanțelor');
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!companyLoading) {
      fetchBalances();
    }
  }, [fetchBalances, companyLoading]);

  /**
   * Obține conturile pentru un import specific cu paginare opțională.
   * Folosește funcția SQL get_accounts_paginated pentru performanță.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de conturi sau rezultat paginat
   */
  const getBalanceAccounts = useCallback(async (
    importId: string,
    options?: PaginationOptions
  ): Promise<BalanceAccount[]> => {
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;

    // Folosim funcția SQL optimizată pentru paginare
    const { data, error } = await supabase.rpc('get_accounts_paginated', {
      _import_id: importId,
      _limit: limit,
      _offset: offset
    });

    if (error) {
      console.error('[useBalante] Error fetching accounts for import:', importId, error);
      // Fallback la query direct dacă funcția RPC nu există încă
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('trial_balance_accounts')
        .select('*')
        .eq('import_id', importId)
        .order('account_code')
        .range(offset, offset + limit - 1);
      
      if (fallbackError) throw fallbackError;
      return fallbackData as BalanceAccount[];
    }

    const dataArray = data as unknown as Array<Record<string, unknown>> | null;
    console.log('[useBalante] Fetched accounts:', dataArray?.length || 0, 'for import:', importId);
    return (dataArray || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      import_id: row.import_id as string,
      account_code: row.account_code as string,
      account_name: row.account_name as string,
      opening_debit: Number(row.opening_debit) || 0,
      opening_credit: Number(row.opening_credit) || 0,
      debit_turnover: Number(row.debit_turnover) || 0,
      credit_turnover: Number(row.credit_turnover) || 0,
      closing_debit: Number(row.closing_debit) || 0,
      closing_credit: Number(row.closing_credit) || 0,
    })) as BalanceAccount[];
  }, []);

  /**
   * Obține cea mai recentă balanță cu toate conturile.
   * OPTIMIZAT: Folosește funcția SQL get_balances_with_accounts pentru un singur query.
   * 
   * @returns Promise cu balanța și conturile sau null dacă nu există
   */
  const getLatestBalance = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    if (!activeCompany?.id) {
      console.log('[useBalante] getLatestBalance: No company');
      return null;
    }

    try {
      // Folosim funcția SQL optimizată care face JOIN în loc de N+1 queries
      const { data, error: fetchError } = await supabase.rpc('get_balances_with_accounts', {
        _company_id: activeCompany.id,
        _limit: 1,
        _offset: 0
      });

      if (fetchError) {
        console.warn('[useBalante] RPC not available, falling back to sequential queries:', fetchError.message);
        // Fallback pentru compatibilitate înapoi
        return await getLatestBalanceFallback();
      }

      const balancesData = data as unknown as BalanceWithAccounts[];
      if (!balancesData || balancesData.length === 0) {
        console.log('[useBalante] getLatestBalance: No completed balances found');
        return null;
      }

      const latestBalance = balancesData[0];
      console.log('[useBalante] getLatestBalance: Found balance with', latestBalance.accounts?.length || 0, 'accounts');
      return latestBalance;
    } catch (err) {
      console.error('[useBalante] Error in getLatestBalance:', err);
      // Fallback la metoda veche
      return await getLatestBalanceFallback();
    }
  }, [activeCompany?.id]);

  /**
   * Fallback pentru getLatestBalance când funcția RPC nu este disponibilă.
   * @private
   */
  const getLatestBalanceFallback = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    if (!activeCompany?.id) return null;

    const { data: latestBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', activeCompany.id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('period_end', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!latestBalances || latestBalances.length === 0) {
      return null;
    }

    const latestBalance = latestBalances[0] as BalanceImport;
    const accounts = await getBalanceAccounts(latestBalance.id);

    return {
      ...latestBalance,
      accounts,
    };
  }, [activeCompany?.id, getBalanceAccounts]);

  /**
   * Obține toate balanțele cu conturile lor.
   * OPTIMIZAT: Folosește funcția SQL get_balances_with_accounts pentru batch query.
   * Rezolvă problema N+1 queries.
   * 
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de balanțe cu conturi
   */
  const getAllBalancesWithAccounts = useCallback(async (
    options?: PaginationOptions
  ): Promise<BalanceWithAccounts[]> => {
    if (!activeCompany?.id) {
      console.log('[useBalante] getAllBalancesWithAccounts: No company');
      return [];
    }

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    try {
      // Folosim funcția SQL optimizată care face JOIN în loc de N+1 queries
      const { data, error: fetchError } = await supabase.rpc('get_balances_with_accounts', {
        _company_id: activeCompany.id,
        _limit: limit,
        _offset: offset
      });

      if (fetchError) {
        console.warn('[useBalante] RPC not available, falling back to sequential queries:', fetchError.message);
        // Fallback pentru compatibilitate înapoi
        return await getAllBalancesWithAccountsFallback(limit, offset);
      }

      const balancesData = data as unknown as BalanceWithAccounts[];
      console.log('[useBalante] getAllBalancesWithAccounts: Loaded', balancesData?.length || 0, 'balances via batch query');
      return balancesData || [];
    } catch (err) {
      console.error('[useBalante] Error in getAllBalancesWithAccounts:', err);
      // Fallback la metoda veche
      return await getAllBalancesWithAccountsFallback(limit, offset);
    }
  }, [activeCompany?.id]);

  /**
   * Fallback pentru getAllBalancesWithAccounts când funcția RPC nu este disponibilă.
   * NOTĂ: Această metodă face N+1 queries și ar trebui evitată când funcția RPC e disponibilă.
   * @private
   */
  const getAllBalancesWithAccountsFallback = useCallback(async (
    limit: number,
    offset: number
  ): Promise<BalanceWithAccounts[]> => {
    if (!activeCompany?.id) return [];

    const { data: allBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', activeCompany.id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('period_end', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    if (!allBalances || allBalances.length === 0) {
      return [];
    }

    // NOTĂ: Acest cod face N+1 queries - folosit doar ca fallback
    // Folosim Promise.all pentru a paraleliza query-urile când funcția RPC nu e disponibilă
    const results = await Promise.all(
      allBalances.map(async (balance) => {
        const accounts = await getBalanceAccounts(balance.id);
        return { ...(balance as BalanceImport), accounts };
      })
    );

    console.log('[useBalante] getAllBalancesWithAccounts (fallback): Loaded', results.length, 'balances');
    return results;
  }, [activeCompany?.id, getBalanceAccounts]);

  /**
   * Obține conturile unui import cu paginare și total count.
   * Util pentru implementarea infinite scroll sau paginare tradițională.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu rezultat paginat
   */
  const getAccountsPaginated = useCallback(async (
    importId: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<PaginatedResult<BalanceAccount>> => {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const { data, error } = await supabase.rpc('get_accounts_paginated', {
      _import_id: importId,
      _limit: limit,
      _offset: offset
    });

    if (error) {
      console.error('[useBalante] Error fetching paginated accounts:', error);
      // Fallback fără totalCount
      const accounts = await getBalanceAccounts(importId, options);
      return {
        data: accounts,
        totalCount: accounts.length,
        hasMore: accounts.length === limit
      };
    }

    const dataArray = data as unknown as Array<Record<string, unknown>> | null;
    const accounts = (dataArray || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      import_id: row.import_id as string,
      account_code: row.account_code as string,
      account_name: row.account_name as string,
      opening_debit: Number(row.opening_debit) || 0,
      opening_credit: Number(row.opening_credit) || 0,
      debit_turnover: Number(row.debit_turnover) || 0,
      credit_turnover: Number(row.credit_turnover) || 0,
      closing_debit: Number(row.closing_debit) || 0,
      closing_credit: Number(row.closing_credit) || 0,
    })) as BalanceAccount[];

    const totalCount = dataArray?.[0]?.total_count || 0;

    return {
      data: accounts,
      totalCount: Number(totalCount),
      hasMore: offset + accounts.length < Number(totalCount)
    };
  }, [getBalanceAccounts]);

  return {
    balances,
    loading: loading || companyLoading,
    error,
    getLatestBalance,
    getBalanceAccounts,
    getAllBalancesWithAccounts,
    getAccountsPaginated,
    refetch: fetchBalances,
    hasData: balances.length > 0,
    companyId: activeCompany?.id || null,
  };
};
```

---

### planning/tabele.md

```md
# FinGuard v2 - Schema Bază de Date

> **Ultima actualizare**: 27 Ianuarie 2026  
> **Versiune Schema**: Plan Final v3.3

---

## Sumar Tabele

| Tabel | Descriere | RLS |
|-------|-----------|-----|
| `users` | Utilizatori aplicație | ✅ |
| `user_roles` | Roluri RBAC | ✅ |
| `companies` | Companii multi-tenant | ✅ |
| `company_users` | Junction users-companies | ✅ |
| `trial_balance_imports` | Importuri balanțe | ✅ |
| `trial_balance_accounts` | Conturi din balanțe | ✅ |
| `chart_of_accounts` | Plan de conturi per companie | ✅ |
| `account_mappings` | Mapări conturi TB → CoA | ✅ |
| `financial_statements` | Situații financiare generate | ✅ |
| `balance_sheet_lines` | Linii bilanț | ✅ |
| `income_statement_lines` | Linii cont profit/pierdere | ✅ |
| `cash_flow_lines` | Linii cash flow | ✅ |
| `kpi_definitions` | Definiții KPI (global + custom) | ✅ |
| `kpi_values` | Valori KPI calculate | ✅ |
| `reports` | Rapoarte generate | ✅ |
| `report_statements` | Junction reports-statements | ✅ |

---

## 1. Users & Authentication

### users
\`\`\`sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
\`\`\`

### user_roles
\`\`\`sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role app_role NOT NULL, -- 'user', 'admin', 'super_admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);
\`\`\`

---

## 2. Companies & Multi-Tenancy

### companies
\`\`\`sql
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cui VARCHAR(50) UNIQUE NOT NULL,
    country_code CHAR(2) DEFAULT 'RO',
    currency CHAR(3) DEFAULT 'RON',
    fiscal_year_start_month INT DEFAULT 1,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
\`\`\`

### company_users
\`\`\`sql
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, user_id)
);
\`\`\`

---

## 3. Trial Balance Data

### trial_balance_imports
\`\`\`sql
CREATE TABLE public.trial_balance_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    source_file_url TEXT,
    file_size_bytes BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    status import_status DEFAULT 'draft', -- draft/processing/validated/completed/error
    error_message TEXT,
    validation_errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ, -- Soft delete
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);
\`\`\`

### trial_balance_accounts
\`\`\`sql
CREATE TABLE public.trial_balance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    opening_debit NUMERIC(15,2) DEFAULT 0,
    opening_credit NUMERIC(15,2) DEFAULT 0,
    debit_turnover NUMERIC(15,2) DEFAULT 0,
    credit_turnover NUMERIC(15,2) DEFAULT 0,
    closing_debit NUMERIC(15,2) DEFAULT 0,
    closing_credit NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (import_id, account_code)
);
\`\`\`

---

## 4. Chart of Accounts (Plan Final v3.3)

### chart_of_accounts
\`\`\`sql
CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
    is_postable BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, account_code)
);
\`\`\`

---

## 5. Account Mappings (Plan Final v3.3)

### account_mappings
Mapări cu suport pentru:
- **Split allocation**: Un cont TB poate fi mapat la mai multe conturi CoA
- **History/Versionare**: Intervale de validitate (valid_from, valid_to)
- **Non-overlap**: EXCLUDE constraint cu btree_gist

\`\`\`sql
CREATE TABLE public.account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_balance_account_id UUID NOT NULL
        REFERENCES public.trial_balance_accounts(id) ON DELETE CASCADE,
    chart_account_id UUID NOT NULL
        REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE, -- NULL = mapare curentă (activă)
    allocation_pct NUMERIC(9,6) NOT NULL DEFAULT 1.0
        CHECK (allocation_pct > 0 AND allocation_pct <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    
    -- Non-overlap pe aceeași pereche (tb_account_id, chart_account_id)
    EXCLUDE USING gist (
        trial_balance_account_id WITH =,
        chart_account_id WITH =,
        daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
    )
);
\`\`\`

**Triggere asociate:**
- `trg_validate_mapping_allocation`: Blochează dacă suma alocărilor curente > 100%
- `trg_validate_mapping_continuity`: WARNING (nu blochează) la închidere mapare dacă există gap

---

## 6. Financial Statements (Plan Final v3.3)

### financial_statements
Situații financiare cu versionare și immutability:

\`\`\`sql
CREATE TABLE public.financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,
    statement_type VARCHAR(50) NOT NULL
        CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow')),
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    currency_code CHAR(3) NOT NULL,
    sign_convention VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (sign_convention IN ('normal', 'inverted')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES public.users(id),
    CONSTRAINT valid_fs_period CHECK (period_start <= period_end)
);
\`\`\`

**Triggere asociate:**
- `trg_close_previous_current_statement`: La INSERT/UPDATE cu is_current=TRUE, închide versiunea anterioară
- `trg_block_incomplete_mapping_generation`: BEFORE INSERT - blochează dacă maparea nu e 100%

**Policy Immutability:**
- Câmpurile `source_import_id`, `period_start`, `period_end`, `statement_type`, `company_id` sunt tratate ca **imutabile**
- Modificări = se creează versiune nouă (INSERT), nu UPDATE

---

## 7. Statement Lines

### balance_sheet_lines
\`\`\`sql
CREATE TABLE public.balance_sheet_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    chart_account_id UUID REFERENCES public.chart_of_accounts(id),
    trial_balance_account_id UUID REFERENCES public.trial_balance_accounts(id),
    account_code VARCHAR(20),
    description VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
\`\`\`

### income_statement_lines
\`\`\`sql
CREATE TABLE public.income_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('venituri', 'cheltuieli')),
    subcategory VARCHAR(100),
    chart_account_id UUID REFERENCES public.chart_of_accounts(id),
    trial_balance_account_id UUID REFERENCES public.trial_balance_accounts(id),
    account_code VARCHAR(20),
    description VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
\`\`\`

### cash_flow_lines
\`\`\`sql
CREATE TABLE public.cash_flow_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    section VARCHAR(50) NOT NULL CHECK (section IN ('operating', 'investing', 'financing')),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
\`\`\`

---

## 8. KPIs

### kpi_definitions
\`\`\`sql
CREATE TABLE public.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id), -- NULL = KPI global
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('liquidity', 'profitability', 'leverage', 'efficiency', 'other')),
    formula JSONB NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'ratio'
        CHECK (unit IN ('ratio', 'percentage', 'days', 'times', 'currency')),
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
\`\`\`

### kpi_values
\`\`\`sql
CREATE TABLE public.kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value NUMERIC(15,4),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_balance_import_id UUID NOT NULL REFERENCES public.trial_balance_imports(id),
    metadata JSONB,
    CONSTRAINT valid_kpi_period CHECK (period_start <= period_end),
    UNIQUE (kpi_definition_id, company_id, period_start, period_end)
);
\`\`\`

---

## 9. Reports

### reports
\`\`\`sql
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) CHECK (report_type IN ('comprehensive', 'kpi_dashboard', 'comparative', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_by UUID NOT NULL REFERENCES public.users(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_url TEXT,
    file_format VARCHAR(10) CHECK (file_format IN ('pdf', 'excel', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'generating'
        CHECK (status IN ('generating', 'completed', 'error')),
    metadata JSONB,
    CONSTRAINT valid_report_period CHECK (period_start <= period_end)
);
\`\`\`

### report_statements
Junction table cu trigger cross-tenant:

\`\`\`sql
CREATE TABLE public.report_statements (
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, statement_id)
);
\`\`\`

---

## Funcții Helper RLS

| Funcție | Descriere |
|---------|-----------|
| `get_user_id_from_auth()` | Returnează users.id pentru auth.uid() curent |
| `is_company_member(user_id, company_id)` | Verifică membership în company_users |
| `has_role(user_id, role)` | Verifică rol în user_roles |
| `can_access_import(user_id, import_id)` | Verifică acces la import via company |
| `can_access_trial_balance_account(user_id, tb_account_id)` | Verifică acces la cont TB |
| `can_access_financial_statement(user_id, statement_id)` | Verifică acces la statement |
| `can_access_report(user_id, report_id)` | Verifică acces la report |
| `assert_mappings_complete_for_import(import_id)` | Validare 100% mapare la ref_date |

---

## Reguli de Validare (Plan v3.3)

| Regulă | Moment | Comportament |
|--------|--------|--------------|
| Suma alocări ≤ 100% | INSERT/UPDATE mapping curent | RAISE EXCEPTION dacă > 1.0 |
| Suma alocări = 100% (conturi relevante) | INSERT financial_statement | RAISE EXCEPTION dacă ≠ 1.0 |
| Non-overlap intervale | INSERT/UPDATE mapping | EXCLUDE constraint |
| Detectare gaps | UPDATE (închidere mapping) | WARNING, fără blocare |
| Verificare acces | Apel RPC assert_mappings | RAISE EXCEPTION dacă nu e membru |
| Cross-tenant report_statements | INSERT | RAISE EXCEPTION dacă company_id diferă |

---

## Migrări

| Fișier | Descriere |
|--------|-----------|
| `20260118224720_*.sql` | Structura inițială (users, companies, trial_balance_*) |
| `20260118224822_*.sql` | Fix search_path + RLS policy |
| `20260119094518_*.sql` | Fix companies SELECT policy |
| `20260119094906_*.sql` | create_company_with_member function |
| `20260119095336_*.sql` | Handle existing CUI în create_company |
| `20260120100000_performance_optimizations.sql` | Soft delete, batch queries, paginare |
| `20260127000000_plan_v3.3_*.sql` | **Plan v3.3**: CoA, mappings, FS, lines, KPIs, reports |
```

---

### .lovable/plan_implementare _db.md

```md


# Plan Final v3.3: Clarificări de Produs, Securitate și Politici

## Rezumat Modificări față de Plan v3.2

| # | Punct | Modificare |
|---|-------|------------|
| 1 | Immutabilitate Financial Statements | Decizie explicită: immutable ca default, trigger UPDATE ca fallback |
| 2 | Conturi relevante vs toate | Verificare 100% doar pentru conturi cu activitate (sold/rulaj nenul) |
| 3 | Hardening securitate | Verificare acces în `assert_mappings_complete_for_import` |

---

## Logica Principală Pragmatică (CONFIRMATĂ - NESCHIMBATĂ)

| Aspect | Comportament |
|--------|--------------|
| Editare mapări curente | Liberă, cu gard "≤ 100%" prin trigger |
| Completitudine "= 100%" | Doar la generare, la ref_date (period_end) |
| Non-overlap intervale | Prin EXCLUDE constraint + btree_gist |
| Gaps la închidere | WARNING opțional, fără blocare la scriere |

---

## (1) Policy: Financial Statements Immutability (DECIZIE)

### Decizie Explicită pentru Plan Final v3.3

**Default (RECOMANDAT)**: Tratează `financial_statements` ca **immutable** pentru câmpurile:
- `source_import_id`
- `period_start`
- `period_end`
- `statement_type`
- `company_id`

### Consecințe

| Acțiune | Cum se implementează |
|---------|---------------------|
| Modificare statement | Se creează o **versiune nouă** (INSERT) cu `is_current = true` |
| Versiune veche | Trigger existent setează automat `is_current = false` |
| UPDATE pe câmpuri imutabile | **Nu se expune** în UI/API |

### Fallback (Dacă proiectul insistă pe UPDATE)

Dacă se decide să se permită UPDATE pe aceste câmpuri, atunci se activează triggerul:

\`\`\`sql
-- Triggerul există deja în v3.2, se activează doar dacă e necesar
CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
\`\`\`

### Tabel Actualizat: Reguli de Validare

| Regulă | Moment | Comportament | Status |
|--------|--------|--------------|--------|
| Suma alocări = 100% la INSERT | INSERT financial_statement | RAISE EXCEPTION | **Obligatoriu** |
| Suma alocări = 100% la UPDATE | UPDATE financial_statement | RAISE EXCEPTION | **Fallback** (doar dacă se permite UPDATE) |

---

## (2) Clarificare Produs: Mapare 100% - Conturi Relevante vs Toate

### Regula de Business (DECIZIE)

**Variantă B (RECOMANDATĂ în Plan Final v3.3)**:

> "Verificarea completitudinii 100% se aplică doar pentru **conturile relevante** - cele cu activitate (sold sau rulaj nenul)."

### Motivație

- Conturile cu sold zero și rulaj zero sunt tehnice sau inactive
- Blocarea generării din cauza conturilor zero creează fricțiune inutilă
- Maparea conturilor zero nu aduce valoare în situațiile financiare

### Definiție "Cont Relevant"

Un cont este relevant dacă **oricare** din următoarele este diferit de zero:

| Coloană | Descriere |
|---------|-----------|
| `closing_debit` | Sold final debitor |
| `closing_credit` | Sold final creditor |
| `debit_turnover` | Rulaj debitor |
| `credit_turnover` | Rulaj creditor |

### Patch SQL pentru `assert_mappings_complete_for_import`

\`\`\`sql
-- Modificare în CTE account_allocations pentru a filtra doar conturile relevante
WITH account_allocations AS (
    SELECT 
        tba.id AS tb_account_id,
        tba.account_code,
        tba.account_name,
        COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
    FROM public.trial_balance_accounts tba
    LEFT JOIN public.account_mappings am 
        ON am.trial_balance_account_id = tba.id
        AND am.valid_from <= ref_date
        AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
    WHERE tba.import_id = _import_id
      -- FILTRU CONTURI RELEVANTE: cel puțin o valoare nenulă
      AND (
        COALESCE(tba.closing_debit, 0) <> 0
        OR COALESCE(tba.closing_credit, 0) <> 0
        OR COALESCE(tba.debit_turnover, 0) <> 0
        OR COALESCE(tba.credit_turnover, 0) <> 0
      )
    GROUP BY tba.id, tba.account_code, tba.account_name
)
\`\`\`

### Alternativă Simplificată (dacă se preferă)

Dacă se dorește o regulă mai simplă (doar sold final):

\`\`\`sql
AND (
    COALESCE(tba.closing_debit, 0) <> 0
    OR COALESCE(tba.closing_credit, 0) <> 0
)
\`\`\`

---

## (3) Hardening Securitate: Verificare Acces în Funcție

### Problemă Identificată

În v3.2, funcția `assert_mappings_complete_for_import` nu verifică dacă utilizatorul curent are acces la importul specificat. Acest lucru permite:
- "Sondare" pentru a afla dacă un import există
- Potențiale scurgeri de informații prin mesaje de eroare

### Soluție pentru Plan Final v3.3

Funcția verifică membership pe compania importului înainte de a procesa validarea.

### SQL Complet: `assert_mappings_complete_for_import` (Versiune Finală)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    -- Obține user_id din context auth
    _user_id := public.get_user_id_from_auth();

    -- Obține company_id și period_end din import
    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    -- Validare existență import
    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsă period_end/company_id (import_id=%)', _import_id;
    END IF;

    -- HARDENING: Verifică accesul userului la compania importului
    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    -- Găsește conturile RELEVANTE cu mapare incompletă la ref_date
    WITH account_allocations AS (
        SELECT 
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am 
            ON am.trial_balance_account_id = tba.id
            AND am.valid_from <= ref_date
            AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          -- FILTRU: doar conturi relevante (cu activitate)
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT 
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;
    
    IF incomplete_count > 0 THEN
        RAISE EXCEPTION 'Mapare incompletă pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Restricții EXECUTE
REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;
\`\`\`

### Notă Securitate

| Aspect | Implementare |
|--------|--------------|
| SECURITY DEFINER | Funcția rulează cu privilegiile owner-ului |
| SET search_path = public | Previne hijacking |
| Verificare membership | Înainte de orice procesare |
| Mesaj eroare generic | Nu expune detalii despre import la acces interzis |
| EXECUTE restricționat | Doar `authenticated`, nu `PUBLIC` sau `anon` |

---

## Secțiune Actualizată: Reguli de Validare

| Regulă | Moment | Comportament | Autoritate |
|--------|--------|--------------|------------|
| Suma alocări ≤ 100% | INSERT/UPDATE mapping curent | RAISE EXCEPTION dacă > 1.0 | Trigger `validate_mapping_allocation` |
| Suma alocări = 100% (conturi relevante) | INSERT financial_statement | RAISE EXCEPTION dacă ≠ 1.0 la ref_date | Funcție `assert_mappings_complete_for_import` |
| Suma alocări = 100% la UPDATE | UPDATE financial_statement | RAISE EXCEPTION (FALLBACK) | Trigger opțional (doar dacă immutability nu e respectată) |
| Non-overlap intervale | INSERT/UPDATE mapping | EXCLUDE constraint | Constraint GIST |
| Detectare gaps | UPDATE (închidere mapping) | WARNING, fără blocare | Trigger `validate_mapping_continuity` |
| Verificare acces | Apel RPC assert_mappings | RAISE EXCEPTION dacă nu e membru | În funcție |

---

## Flux de Lucru (Actualizat pentru v3.3)

\`\`\`text
1. Upload balanță → trial_balance_imports + trial_balance_accounts

2. Creare/Editare mapări curente (valid_to IS NULL)
   └─→ Trigger verifică: suma ≤ 1.0 pe contul curent
   └─→ NU verifică completitudine (poate fi < 1.0)
   └─→ Permite creare treptată a mapărilor

3. Închidere mapare veche (setare valid_to)
   └─→ Trigger emite WARNING dacă nu există acoperire pentru ziua următoare
   └─→ NU blochează - doar semnal pentru operatori

4. [OPȚIONAL] Verificare mapare completă
   └─→ UI: Buton "Verifică maparea pentru import"
   └─→ Apelează assert_mappings_complete_for_import(import_id)
   └─→ Verifică acces + conturi RELEVANTE (nu toate)
   └─→ Afișează succes sau listă conturi incomplete

5. Generare situații financiare (INSERT)
   └─→ Trigger BEFORE INSERT apelează assert_mappings_complete_for_import
   └─→ Verifică acces utilizator
   └─→ Verifică doar conturi RELEVANTE (sold/rulaj nenul)
   └─→ RAISE EXCEPTION dacă mapare incompletă sau gaps la ref_date
   └─→ Succes doar dacă toate conturile relevante au mapare 100%

6. [IMMUTABILITY] Modificare statement existent
   └─→ DEFAULT: Nu se permite UPDATE pe câmpuri imutabile
   └─→ Se creează versiune nouă (INSERT) și se marchează curentă
   └─→ FALLBACK: Dacă UPDATE e permis, trigger validează maparea
\`\`\`

---

## Note Importante (Actualizat pentru v3.3)

1. **Financial statements sunt IMUTABILE** pentru câmpurile: `source_import_id`, `period_*`, `statement_type`, `company_id`. Modificări = versiune nouă.

2. **Verificarea 100% se aplică doar pe CONTURI RELEVANTE** - cele cu sold sau rulaj nenul. Conturile zero/inactive sunt ignorate.

3. **Funcția de validare verifică accesul** - utilizatorul trebuie să fie membru al companiei sau admin pentru a apela funcția.

4. **Triggerul de alocare funcționează corect la UPDATE** - exclude rândul curent din sumă și adaugă noua valoare.

5. **WARNING la închidere verifică ziua următoare** (`valid_to + 1`) - nu blochează, doar semnalează.

6. **SECURITY DEFINER + verificare membership** - funcțiile au owner controlat și verifică accesul intern.

7. **Triggerul UPDATE pe financial_statements este FALLBACK** - se activează doar dacă se decide să se permită UPDATE pe câmpuri imutabile.

---

## Sumar Plan Final v3.3

| # | Aspect | Decizie |
|---|--------|---------|
| 1 | Immutabilitate FS | **Default**: imutabil; **Fallback**: trigger UPDATE |
| 2 | Conturi pentru verificare | Doar **relevante** (sold/rulaj ≠ 0) |
| 3 | Securitate funcție | Verificare **membership** + restricții **EXECUTE** |
| 4 | Logica pragmatică | **CONFIRMATĂ** - neschimbată |

---

## SQL Complet pentru Actualizări v3.3

\`\`\`sql
-- ============================================================================
-- PLAN FINAL v3.3: PATCH-URI
-- ============================================================================

-- (3) Funcție actualizată cu hardening securitate + (2) filtru conturi relevante
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    -- Obține user_id din context auth
    _user_id := public.get_user_id_from_auth();

    -- Obține company_id și period_end din import
    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    -- Validare existență import
    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsă period_end/company_id (import_id=%)', _import_id;
    END IF;

    -- HARDENING: Verifică accesul userului la compania importului
    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    -- Găsește conturile RELEVANTE cu mapare incompletă la ref_date
    WITH account_allocations AS (
        SELECT 
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am 
            ON am.trial_balance_account_id = tba.id
            AND am.valid_from <= ref_date
            AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          -- FILTRU: doar conturi relevante (cu activitate)
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT 
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;
    
    IF incomplete_count > 0 THEN
        RAISE EXCEPTION 'Mapare incompletă pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Restricții EXECUTE pentru securitate
REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;

-- ============================================================================
-- (1) TRIGGER UPDATE pe financial_statements (FALLBACK - activează doar dacă 
--     se decide să se permită UPDATE pe câmpuri imutabile)
-- ============================================================================

-- NOTĂ: Acest trigger este OPȚIONAL și se activează doar dacă proiectul 
-- decide să permită UPDATE pe câmpurile imutabile în loc de versionare.
-- DEFAULT recomandat: NU activa acest trigger, tratează statements ca imutabile.

/*
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Rulează doar dacă se schimbă câmpuri care afectează selecția mapărilor
    IF (NEW.source_import_id IS DISTINCT FROM OLD.source_import_id)
       OR (NEW.period_start IS DISTINCT FROM OLD.period_start)
       OR (NEW.period_end IS DISTINCT FROM OLD.period_end)
       OR (NEW.statement_type IS DISTINCT FROM OLD.statement_type)
       OR (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN

        PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation_on_update
ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
*/
\`\`\`
```

---

## Sfârșit document

Acest fișier conține inventarul complet și conținutul exact al tuturor fișierelor legate de baza de date din proiectul FinGuard v2.
