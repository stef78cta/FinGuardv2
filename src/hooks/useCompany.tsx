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

    // Create company without .select() to avoid RLS SELECT check
    const { error: companyError } = await supabase
      .from('companies')
      .insert({ name, cui });

    if (companyError) throw companyError;

    // Get the company we just created by matching name and cui
    // We need a different approach - use RPC or get by unique constraint
    // For now, query by name+cui which should be unique per user's recent insert
    const { data: newCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, cui, currency')
      .eq('name', name)
      .eq('cui', cui)
      .order('created_at', { ascending: false })
      .limit(1);

    // This will fail too because of RLS... we need a different approach
    // Let's use a database function instead
    
    if (fetchError || !newCompanies || newCompanies.length === 0) {
      // Fallback: create a temporary company object
      // The real solution requires a DB function that returns the inserted row
      const tempId = crypto.randomUUID();
      
      // Add user as member using the RPC approach
      const { data: companyId, error: rpcError } = await supabase
        .rpc('create_company_with_member', { 
          p_name: name, 
          p_cui: cui, 
          p_user_id: userData.id 
        });
      
      if (rpcError) throw rpcError;
      
      const companyData = {
        id: companyId,
        name,
        cui,
        currency: 'RON',
      };
      
      setCompany(companyData);
      return companyData;
    }

    const newCompany = newCompanies[0];

    // Add user as member
    const { error: memberError } = await supabase
      .from('company_users')
      .insert({
        company_id: newCompany.id,
        user_id: userData.id,
      });

    if (memberError) throw memberError;

    setCompany(newCompany);
    return newCompany;
  };

  return { company, loading, error, createCompany };
};
