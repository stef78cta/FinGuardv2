import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  /**
   * ⚠️ FIX TAB SWITCH: Afișăm loading screen DOAR dacă:
   * 1. loading = true ȘI
   * 2. NU avem deja un user autentificat
   * 
   * Asta previne demontarea arborelui React când se face refresh token în background
   * (de ex. la revenirea în tab când Supabase emite evenimente de auth).
   * 
   * Dacă avem deja user, afișăm children și lăsăm refresh-ul să se facă în background.
   */
  const shouldShowLoadingScreen = loading && !user;
  
  if (shouldShowLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
