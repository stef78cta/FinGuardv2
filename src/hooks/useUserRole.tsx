import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'user' | 'admin' | 'super_admin';

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  error: Error | null;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // First get the internal user id from auth_user_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (userError) throw userError;

        if (!userData) {
          setRole(null);
          setLoading(false);
          return;
        }

        // Then get the role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (roleError) throw roleError;

        setRole(roleData?.role as AppRole || 'user');
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err as Error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    isUser: role === 'user',
    loading: authLoading || loading,
    error,
  };
};
