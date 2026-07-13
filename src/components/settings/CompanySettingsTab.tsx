import { useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm';

/**
 * Tab-ul Companie/Companii din pagina Setări.
 */
export const CompanySettingsTab = () => {
  const { companies, activeCompany, loading } = useCompanyContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const hasMultipleCompanies = companies.length > 1;

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedCompanyId(null);
      return;
    }

    if (selectedCompanyId && companies.some(c => c.id === selectedCompanyId)) {
      return;
    }

    const fallbackId = activeCompany?.id ?? companies[0]?.id ?? null;
    setSelectedCompanyId(fallbackId);
  }, [companies, activeCompany, selectedCompanyId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) ?? null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {hasMultipleCompanies ? 'Companii asociate' : 'Informații Companie'}
          </CardTitle>
          <CardDescription>
            {hasMultipleCompanies
              ? 'Selectează și gestionează datele companiilor din contul tău'
              : 'Gestionează datele companiei tale'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedCompany ? (
            <div className="space-y-6">
              {hasMultipleCompanies && (
                <div className="max-w-md space-y-2">
                  <Label htmlFor="settings-company-select">Companie activă în Setări</Label>
                  <Select
                    value={selectedCompanyId ?? undefined}
                    onValueChange={setSelectedCompanyId}
                  >
                    <SelectTrigger id="settings-company-select">
                      <SelectValue placeholder="Selectează compania" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <CompanySettingsForm company={selectedCompany} />
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nu ai nicio companie asociată încă.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Adaugă o companie
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCompanyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};
