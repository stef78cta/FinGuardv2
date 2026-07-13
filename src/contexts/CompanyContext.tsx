import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { COMPANY_SELECT_FIELDS, formValuesToCompanyUpdate, mergeCompanyUpdate } from '@/lib/companyForm';
import type { CompanyFormValues } from '@/lib/companyValidation';

export interface Company {
  id: string;
  name: string;
  cui: string;
  currency: string | null;
  fiscal_year_start_month: number | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country_code: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  trade_register_number: string | null;
  legal_form: string | null;
}

interface CompanyContextType {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  error: string | null;
  switchCompany: (companyId: string) => void;
  createCompany: (name: string, cui: string) => Promise<Company>;
  updateCompany: (companyId: string, values: CompanyFormValues) => Promise<Company>;
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
  
  const initialFetchDoneRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      setLoading(false);
      initialFetchDoneRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    const userChanged = lastUserIdRef.current !== user.id;
    lastUserIdRef.current = user.id;

    try {
      const shouldShowLoading = !initialFetchDoneRef.current || userChanged;
      if (shouldShowLoading) {
        setLoading(true);
      }
      setError(null);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        setCompanies([]);
        setActiveCompany(null);
        setLoading(false);
        return;
      }

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

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(COMPANY_SELECT_FIELDS)
        .in('id', companyIds);

      if (companyError) throw companyError;

      const companiesList = (companyData || []) as Company[];
      setCompanies(companiesList);

      if (companiesList.length === 1) {
        setActiveCompany(companiesList[0]);
        localStorage.setItem(LAST_COMPANY_KEY, companiesList[0].id);
      } else if (companiesList.length > 1) {
        const lastCompanyId = localStorage.getItem(LAST_COMPANY_KEY);
        const lastCompany = companiesList.find(c => c.id === lastCompanyId);
        
        if (lastCompany) {
          setActiveCompany(lastCompany);
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea companiilor');
    } finally {
      setLoading(false);
      initialFetchDoneRef.current = true;
    }
  }, [user?.id]);

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

    const { data: companyId, error: rpcError } = await supabase
      .rpc('create_company_with_member', {
        p_name: name,
        p_cui: cui,
      });

    if (rpcError) {
      if (rpcError.code === '23505') {
        throw new Error(
          'O companie cu acest CUI există deja în sistem. ' +
          'Dacă doriți acces, solicitați o invitație de la owner.'
        );
      }
      throw rpcError;
    }

    const newCompany: Company = {
      id: companyId as string,
      name,
      cui,
      currency: 'RON',
      fiscal_year_start_month: 1,
      address: null,
      city: null,
      county: null,
      country_code: 'RO',
      postal_code: null,
      phone: null,
      email: null,
      website: null,
      trade_register_number: null,
      legal_form: null,
    };

    setCompanies(prev => [...prev, newCompany]);
    setActiveCompany(newCompany);
    localStorage.setItem(LAST_COMPANY_KEY, newCompany.id);

    toast.success(`Compania "${name}" a fost creată cu succes!`);
    return newCompany;
  }, [user]);

  const updateCompany = useCallback(async (
    companyId: string,
    values: CompanyFormValues
  ): Promise<Company> => {
    const payload = formValuesToCompanyUpdate(values);

    const { error: updateError } = await supabase
      .from('companies')
      .update(payload)
      .eq('id', companyId);

    if (updateError) throw updateError;

    let updatedCompany: Company | null = null;

    setCompanies(prev =>
      prev.map(company => {
        if (company.id !== companyId) return company;
        updatedCompany = mergeCompanyUpdate(company, values);
        return updatedCompany;
      })
    );

    setActiveCompany(prev => {
      if (!prev || prev.id !== companyId) return prev;
      return mergeCompanyUpdate(prev, values);
    });

    if (!updatedCompany) {
      throw new Error('Compania nu a fost găsită în context.');
    }

    return updatedCompany;
  }, []);

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
        updateCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
