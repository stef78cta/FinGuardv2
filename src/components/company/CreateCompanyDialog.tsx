import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CuiAlreadyExistsError, useCompanyContext } from '@/contexts/CompanyContext';
import {
  hasFormErrors,
  trimCompanyName,
  trimCui,
  validateCompanyProfileForm,
} from '@/lib/companyValidation';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/** Etapele dialogului: formular de creare vs. fluxul de acces la CUI existent. */
type DialogStep = 'form' | 'cui_exists';

/**
 * Modal reutilizabil pentru crearea rapidă a unei companii (nume + CUI).
 * La un CUI deja înregistrat de altă companie, comută pe fluxul controlat "Solicită acces",
 * fără a expune date despre firma existentă (protecție împotriva enumerării).
 */
export const CreateCompanyDialog = ({
  open,
  onOpenChange,
  onCreated,
}: CreateCompanyDialogProps) => {
  const { createCompany, requestCompanyAccess } = useCompanyContext();
  const [companyName, setCompanyName] = useState('');
  const [companyCui, setCompanyCui] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; cui?: string }>({});
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<DialogStep>('form');
  const [requesting, setRequesting] = useState(false);

  const resetForm = () => {
    setCompanyName('');
    setCompanyCui('');
    setFieldErrors({});
    setStep('form');
    setRequesting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleCreateCompany = async () => {
    const errors = validateCompanyProfileForm(
      {
        name: companyName,
        cui: companyCui,
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
      await createCompany(trimCompanyName(companyName), trimCui(companyCui));
      handleOpenChange(false);
      onCreated?.();
    } catch (error) {
      if (error instanceof CuiAlreadyExistsError) {
        // Caz C: nu acordăm acces automat; oferim fluxul controlat.
        setStep('cui_exists');
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
      const result = await requestCompanyAccess(trimCui(companyCui));
      if (result === 'already_member') {
        toast.info('Ești deja membru al acestei companii.');
      } else {
        toast.success('Cererea de acces a fost trimisă. Vei fi notificat după aprobare.');
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la trimiterea cererii');
    } finally {
      setRequesting(false);
    }
  };

  const handleTryAnotherCui = () => {
    setStep('form');
    setCompanyCui('');
    setFieldErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Creează companie nouă</DialogTitle>
              <DialogDescription>
                Introduceți datele companiei pentru a o adăuga în cont.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-company-name">Nume companie</Label>
                <Input
                  id="create-company-name"
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
                <Label htmlFor="create-company-cui">CUI</Label>
                <Input
                  id="create-company-cui"
                  placeholder="RO12345678"
                  value={companyCui}
                  onChange={(e) => {
                    setCompanyCui(e.target.value);
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Anulează
              </Button>
              <Button onClick={handleCreateCompany} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Creează
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <DialogTitle>Această companie există deja</DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <span className="block">
                  Există deja o companie înregistrată cu acest CUI.
                </span>
                <span className="block">
                  Pentru protejarea datelor, accesul nu poate fi acordat automat.
                  Poți solicita acces administratorului companiei sau poți contacta suportul.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleRequestAccess}
                disabled={requesting}
              >
                {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Solicită acces
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTryAnotherCui}
                disabled={requesting}
              >
                Introdu alt CUI
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
