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