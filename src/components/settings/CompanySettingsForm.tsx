import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Company } from '@/contexts/CompanyContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { companyToFormValues } from '@/lib/companyForm';
import {
  type CompanyFormErrors,
  type CompanyFormValues,
  formatCapitalizedLowercase,
  hasFormErrors,
  trimCompanyName,
  trimCui,
  validateCompanyProfileForm,
} from '@/lib/companyValidation';

interface CompanySettingsFormProps {
  company: Company;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null;

/**
 * Formular complet de administrare a datelor unei companii din Setări.
 */
export const CompanySettingsForm = ({ company }: CompanySettingsFormProps) => {
  const { updateCompany } = useCompanyContext();
  const initialValues = useMemo(() => companyToFormValues(company), [company]);

  const [values, setValues] = useState<CompanyFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<CompanyFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<CompanyFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setSavedValues(initialValues);
    setFieldErrors({});
    setSaveError(null);
  }, [initialValues]);

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedValues),
    [values, savedValues]
  );

  const updateField = <K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const formatLocationField = (field: 'city' | 'county') => {
    const formatted = formatCapitalizedLowercase(values[field]);
    if (formatted !== values[field]) {
      updateField(field, formatted);
    }
  };

  const handleCancel = () => {
    setValues(savedValues);
    setFieldErrors({});
    setSaveError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedValues: CompanyFormValues = {
      ...values,
      name: trimCompanyName(values.name),
      cui: trimCui(values.cui),
      city: formatCapitalizedLowercase(values.city),
      county: formatCapitalizedLowercase(values.county),
    };

    const errors = validateCompanyProfileForm(normalizedValues, { requireFullProfile: true });
    setFieldErrors(errors);

    if (hasFormErrors(errors)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateCompany(company.id, normalizedValues);
      const nextValues = companyToFormValues(updated);
      setValues(nextValues);
      setSavedValues(nextValues);
      toast.success('Datele companiei au fost actualizate.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare la actualizarea companiei';
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Informații generale</h3>
          <p className="text-sm text-muted-foreground">Date de identificare ale companiei</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Denumire companie</Label>
            <Input
              id="company-name"
              value={values.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="SC Exemplu SRL"
              aria-invalid={!!fieldErrors.name}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-cui">CUI</Label>
            <Input
              id="company-cui"
              value={values.cui}
              onChange={(e) => updateField('cui', e.target.value)}
              placeholder="RO12345678"
              aria-invalid={!!fieldErrors.cui}
            />
            <FieldError message={fieldErrors.cui} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-trade-register">Nr. Registrul Comerțului</Label>
            <Input
              id="company-trade-register"
              value={values.tradeRegisterNumber}
              onChange={(e) => updateField('tradeRegisterNumber', e.target.value)}
              placeholder="J40/1234/2020"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-legal-form">Formă juridică</Label>
            <Input
              id="company-legal-form"
              value={values.legalForm}
              onChange={(e) => updateField('legalForm', e.target.value)}
              placeholder="SRL"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Adresă sediu</h3>
          <p className="text-sm text-muted-foreground">Locația sediului social</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company-address">Adresă</Label>
            <Input
              id="company-address"
              value={values.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Str. Exemplu nr. 10"
              aria-invalid={!!fieldErrors.address}
            />
            <FieldError message={fieldErrors.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-city">Localitate</Label>
            <Input
              id="company-city"
              value={values.city}
              onChange={(e) => updateField('city', e.target.value)}
              onBlur={() => formatLocationField('city')}
              placeholder="București"
              aria-invalid={!!fieldErrors.city}
            />
            <FieldError message={fieldErrors.city} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-county">Județ / sector</Label>
            <Input
              id="company-county"
              value={values.county}
              onChange={(e) => updateField('county', e.target.value)}
              onBlur={() => formatLocationField('county')}
              placeholder="Sector 1"
              aria-invalid={!!fieldErrors.county}
            />
            <FieldError message={fieldErrors.county} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-country">Țară</Label>
            <Input
              id="company-country"
              value={values.country}
              onChange={(e) => updateField('country', e.target.value)}
              placeholder="România"
              aria-invalid={!!fieldErrors.country}
            />
            <FieldError message={fieldErrors.country} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-postal-code">Cod poștal</Label>
            <Input
              id="company-postal-code"
              value={values.postalCode}
              onChange={(e) => updateField('postalCode', e.target.value)}
              placeholder="010101"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Date de contact</h3>
          <p className="text-sm text-muted-foreground">Informații de contact ale companiei</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-email">E-mail companie</Label>
            <Input
              id="company-email"
              type="email"
              value={values.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contact@exemplu.ro"
              aria-invalid={!!fieldErrors.email}
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Telefon</Label>
            <Input
              id="company-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+40 721 123 456"
              aria-invalid={!!fieldErrors.phone}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company-website">Website</Label>
            <Input
              id="company-website"
              type="url"
              value={values.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://www.exemplu.ro"
            />
          </div>
        </div>
      </section>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={!isDirty || saving}
        >
          Anulează
        </Button>
        <Button type="submit" disabled={saving || !isDirty}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvează modificările
        </Button>
      </div>
    </form>
  );
};
