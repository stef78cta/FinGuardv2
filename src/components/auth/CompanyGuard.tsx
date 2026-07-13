import { ReactNode, useState } from 'react';
import { CuiAlreadyExistsError, useCompanyContext } from '@/contexts/CompanyContext';
import { Loader2, Building2, Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';
import {
  hasFormErrors,
  trimCompanyName,
  trimCui,
  validateCompanyProfileForm,
} from '@/lib/companyValidation';
import { toast } from 'sonner';

interface CompanyGuardProps {
  children: ReactNode;
}

export const CompanyGuard = ({ children }: CompanyGuardProps) => {
  const { activeCompany, companies, loading, createCompany, requestCompanyAccess, switchCompany } =
    useCompanyContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyCUI, setCompanyCUI] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; cui?: string }>({});
  const [creating, setCreating] = useState(false);
  const [cuiExists, setCuiExists] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleCreateCompany = async () => {
    const errors = validateCompanyProfileForm(
      {
        name: companyName,
        cui: companyCUI,
        tradeRegisterNumber: '',
        legalForm: '',
        address: '',
        city: '',
        county: '',
        country: '',
        postalCode: '',
        email: '',
        phone: '',
        website: '',
      },
      { requireFullProfile: false }
    );

    const nextFieldErrors = {
      name: errors.name,
      cui: errors.cui,
    };
    setFieldErrors(nextFieldErrors);

    if (hasFormErrors(nextFieldErrors)) {
      return;
    }

    setCreating(true);
    try {
      await createCompany(trimCompanyName(companyName), trimCui(companyCUI));
      setCompanyName('');
      setCompanyCUI('');
      setFieldErrors({});
    } catch (error) {
      if (error instanceof CuiAlreadyExistsError) {
        setCuiExists(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Eroare la crearea companiei');
    } finally {
      setCreating(false);
    }
  };

  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      const result = await requestCompanyAccess(trimCui(companyCUI));
      if (result === 'already_member') {
        toast.info('Ești deja membru al acestei companii.');
      } else {
        toast.success('Cererea de acces a fost trimisă. Vei fi notificat după aprobare.');
      }
      setCuiExists(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la trimiterea cererii');
    } finally {
      setRequesting(false);
    }
  };

  const handleTryAnotherCui = () => {
    setCuiExists(false);
    setCompanyCUI('');
    setFieldErrors({});
  };

  const shouldShowLoadingScreen = loading && companies.length === 0 && !activeCompany;
  
  if (shouldShowLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă companiile...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0 && cuiExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Această companie există deja</CardTitle>
            <CardDescription>
              Există deja o companie înregistrată cu acest CUI. Pentru protejarea datelor,
              accesul nu poate fi acordat automat. Solicită acces administratorului companiei
              sau contactează suportul.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full btn-primary" onClick={handleRequestAccess} disabled={requesting}>
              {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Solicită acces
            </Button>
            <Button variant="outline" className="w-full" onClick={handleTryAnotherCui} disabled={requesting}>
              Introdu alt CUI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                }}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-cui">CUI</Label>
              <Input
                id="company-cui"
                placeholder="RO12345678"
                value={companyCUI}
                onChange={(e) => {
                  setCompanyCUI(e.target.value);
                  if (fieldErrors.cui) setFieldErrors(prev => ({ ...prev, cui: undefined }));
                }}
                aria-invalid={!!fieldErrors.cui}
              />
              {fieldErrors.cui && (
                <p className="text-sm text-destructive">{fieldErrors.cui}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Poți completa ulterior toate datele companiei din Setări → Companie.
            </p>
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

        <CreateCompanyDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    );
  }

  return <>{children}</>;
};
