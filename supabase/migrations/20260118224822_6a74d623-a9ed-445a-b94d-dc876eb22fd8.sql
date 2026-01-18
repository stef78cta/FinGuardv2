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