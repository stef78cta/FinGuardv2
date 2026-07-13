import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useCompanyContext } from '@/contexts/CompanyContext';
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

/**
 * Modal reutilizabil pentru crearea rapidă a unei companii (nume + CUI).
 */
export const CreateCompanyDialog = ({
  open,
  onOpenChange,
  onCreated,
}: CreateCompanyDialogProps) => {
  const { createCompany } = useCompanyContext();
  const [companyName, setCompanyName] = useState('');
  const [companyCui, setCompanyCui] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; cui?: string }>({});
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setCompanyName('');
    setCompanyCui('');
    setFieldErrors({});
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
      toast.error(error instanceof Error ? error.message : 'Eroare la crearea companiei');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
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
      </DialogContent>
    </Dialog>
  );
};
