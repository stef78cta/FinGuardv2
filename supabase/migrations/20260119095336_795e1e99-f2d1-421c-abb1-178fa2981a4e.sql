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