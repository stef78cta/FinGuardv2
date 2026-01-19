import { ReactNode, useState } from 'react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Loader2, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompanyGuardProps {
  children: ReactNode;
}

export const CompanyGuard = ({ children }: CompanyGuardProps) => {
  const { activeCompany, companies, loading, createCompany, switchCompany } = useCompanyContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyCUI, setCompanyCUI] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateCompany = async () => {
    if (!companyName.trim() || !companyCUI.trim()) {
      toast.error('Toate câmpurile sunt obligatorii');
      return;
    }

    setCreating(true);
    try {
      await createCompany(companyName.trim(), companyCUI.trim());
      setShowCreateDialog(false);
      setCompanyName('');
      setCompanyCUI('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la crearea companiei');
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă companiile...</p>
        </div>
      </div>
    );
  }

  // No companies - show create company screen
  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Creează prima ta companie</CardTitle>
            <CardDescription>
              Pentru a utiliza FinGuard, trebuie să creezi sau să te asociezi unei companii.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nume companie</Label>
              <Input
                id="company-name"
                placeholder="SC Exemplu SRL"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-cui">CUI</Label>
              <Input
                id="company-cui"
                placeholder="RO12345678"
                value={companyCUI}
                onChange={(e) => setCompanyCUI(e.target.value)}
              />
            </div>
            <Button 
              className="w-full btn-primary" 
              onClick={handleCreateCompany}
              disabled={creating}
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Creează companie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multiple companies but none selected - show selection modal
  if (companies.length > 1 && !activeCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Selectează o companie</CardTitle>
            <CardDescription>
              Alege compania cu care dorești să lucrezi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => switchCompany(company.id)}
                className="w-full p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold text-sm">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {company.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CUI: {company.cui}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            
            <div className="pt-2 border-t border-border mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adaugă companie nouă
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Company Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Creează companie nouă</DialogTitle>
              <DialogDescription>
                Introduceți datele companiei pentru a o adăuga în cont.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-company-name">Nume companie</Label>
                <Input
                  id="new-company-name"
                  placeholder="SC Exemplu SRL"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-company-cui">CUI</Label>
                <Input
                  id="new-company-cui"
                  placeholder="RO12345678"
                  value={companyCUI}
                  onChange={(e) => setCompanyCUI(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Anulează
              </Button>
              <Button onClick={handleCreateCompany} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Creează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Has active company - render children
  return <>{children}</>;
};
