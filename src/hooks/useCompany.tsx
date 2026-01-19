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

    // Create company - use insert without returning to avoid SELECT RLS issue
    const { data: insertedCompany, error: companyError } = await supabase
      .from('companies')
      .insert({ name, cui })
      .select('id, name, cui, currency')
      .single();

    if (companyError) throw companyError;

    // Add user as member immediately
    const { error: memberError } = await supabase
      .from('company_users')
      .insert({
        company_id: insertedCompany.id,
        user_id: userData.id,
      });

    if (memberError) {
      // If member creation fails, we should ideally delete the company
      // but for now just throw the error
      throw memberError;
    }

    // Now fetch the company data since user is now a member
    const companyData = {
      id: insertedCompany.id,
      name: insertedCompany.name,
      cui: insertedCompany.cui,
      currency: insertedCompany.currency,
    };

    setCompany(companyData);
    return companyData;
  };

  return { company, loading, error, createCompany };
};
