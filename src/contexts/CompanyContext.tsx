import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Company {
  id: string;
  name: string;
  cui: string;
  currency: string | null;
}

interface CompanyContextType {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  error: string | null;
  switchCompany: (companyId: string) => void;
  createCompany: (name: string, cui: string) => Promise<Company>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const LAST_COMPANY_KEY = 'finguard_last_company_id';

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const { user } = useAuth();
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's internal ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        // User profile not yet created
        setCompanies([]);
        setActiveCompany(null);
        setLoading(false);
        return;
      }

      // Get all user's company memberships
      const { data: memberships, error: memberError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setCompanies([]);
        setActiveCompany(null);
        setLoading(false);
        return;
      }

      const companyIds = memberships.map(m => m.company_id);

      // Get company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, cui, currency')
        .in('id', companyIds);

      if (companyError) throw companyError;

      const companiesList = companyData || [];
      setCompanies(companiesList);

      // Determine active company
      if (companiesList.length === 1) {
        // Auto-select single company
        setActiveCompany(companiesList[0]);
        localStorage.setItem(LAST_COMPANY_KEY, companiesList[0].id);
      } else if (companiesList.length > 1) {
        // Try to restore last selected company
        const lastCompanyId = localStorage.getItem(LAST_COMPANY_KEY);
        const lastCompany = companiesList.find(c => c.id === lastCompanyId);
        
        if (lastCompany) {
          setActiveCompany(lastCompany);
        }
        // If no valid last company, activeCompany remains null (will show selector)
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea companiilor');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const switchCompany = useCallback((companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setActiveCompany(company);
      localStorage.setItem(LAST_COMPANY_KEY, companyId);
      toast.success(`Companie schimbată: ${company.name}`);
    }
  }, [companies]);

  const createCompany = useCallback(async (name: string, cui: string): Promise<Company> => {
    if (!user) throw new Error('Nu ești autentificat');

    // Get user's internal ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError) throw userError;

    // Use RPC function to create company and add member atomically
    const { data: companyId, error: rpcError } = await supabase
      .rpc('create_company_with_member', {
        p_name: name,
        p_cui: cui,
        p_user_id: userData.id
      });

    if (rpcError) throw rpcError;

    const newCompany: Company = {
      id: companyId as string,
      name,
      cui,
      currency: 'RON',
    };

    // Update local state
    setCompanies(prev => [...prev, newCompany]);
    setActiveCompany(newCompany);
    localStorage.setItem(LAST_COMPANY_KEY, newCompany.id);

    toast.success(`Compania "${name}" a fost creată cu succes!`);
    return newCompany;
  }, [user]);

  const refreshCompanies = useCallback(async () => {
    await fetchCompanies();
  }, [fetchCompanies]);

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        companies,
        loading,
        error,
        switchCompany,
        createCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
