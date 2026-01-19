import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'super_admin';
}

const AdminGuard = ({ children, requiredRole = 'admin' }: AdminGuardProps) => {
  const { isAdmin, isSuperAdmin, loading } = useUserRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Se verifică permisiunile...</p>
        </div>
      </div>
    );
  }

  // Check if user has the required role
  const hasAccess = requiredRole === 'super_admin' ? isSuperAdmin : isAdmin;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Acces Restricționat</CardTitle>
            <CardDescription className="text-base">
              Nu ai permisiunea necesară pentru a accesa această pagină.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Această secțiune este disponibilă doar pentru administratori. 
              Dacă crezi că ar trebui să ai acces, contactează un administrator.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/app/dashboard">Înapoi la Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Pagina principală</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
