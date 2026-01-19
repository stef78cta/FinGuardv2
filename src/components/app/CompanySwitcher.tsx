import { useState } from 'react';
import { Building2, ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';

export const CompanySwitcher = () => {
  const { activeCompany, companies, switchCompany, createCompany, loading } = useCompanyContext();
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

  if (loading || !activeCompany) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const hasMultipleCompanies = companies.length > 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 px-3 gap-2 bg-background border-border hover:bg-muted/50",
              "max-w-[200px] sm:max-w-[280px]"
            )}
          >
            <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center text-primary font-semibold text-xs shrink-0">
              {getInitials(activeCompany.name)}
            </div>
            <span className="truncate text-sm font-medium text-foreground">
              {activeCompany.name}
            </span>
            {hasMultipleCompanies && (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Compania activă
          </DropdownMenuLabel>
          
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => {
                if (company.id !== activeCompany.id) {
                  switchCompany(company.id);
                }
              }}
              className={cn(
                "cursor-pointer py-2.5",
                company.id === activeCompany.id && "bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {getInitials(company.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{company.name}</p>
                  <p className="text-xs text-muted-foreground">CUI: {company.cui}</p>
                </div>
                {company.id === activeCompany.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă companie nouă
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
              <Label htmlFor="switcher-company-name">Nume companie</Label>
              <Input
                id="switcher-company-name"
                placeholder="SC Exemplu SRL"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="switcher-company-cui">CUI</Label>
              <Input
                id="switcher-company-cui"
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
    </>
  );
};
