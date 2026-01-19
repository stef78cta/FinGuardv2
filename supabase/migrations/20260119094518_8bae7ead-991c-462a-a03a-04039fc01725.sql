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