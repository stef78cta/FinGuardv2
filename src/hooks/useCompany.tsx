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

    /**
     * v1.8: SECURITY PATCH - Elimină p_user_id
     * Funcția create_company_with_member folosește get_user_id_from_auth() intern
     * pentru a preveni impersonare și a simplifica API-ul.
     */
    const { data: companyId, error: rpcError } = await supabase
      .rpc('create_company_with_member', { 
        p_name: name, 
        p_cui: cui
        // p_user_id eliminat - folosește get_user_id_from_auth() intern (v1.8)
      });
    
    /**
     * v1.8: Handle error specific pentru duplicate CUI
     * ERRCODE 23505 = unique_violation (CUI UNIQUE constraint)
     */
    if (rpcError) {
      if (rpcError.code === '23505') {
        throw new Error(
          'O companie cu acest CUI există deja în sistem. ' +
          'Dacă doriți acces, solicitați o invitație de la owner.'
        );
      }
      throw rpcError;
    }
    
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
