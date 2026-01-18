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