import { useState } from 'react';
import { User, Building2, Lock, CreditCard, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Settings = () => {
  const { user } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  
  // Profile form state
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Company form state
  const [companyName, setCompanyName] = useState('');
  const [companyCui, setCompanyCui] = useState('');
  const [companyLoading2, setCompanyLoading2] = useState(false);

  // Load initial data
  useState(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (data?.full_name) {
        setFullName(data.full_name);
      }
    };
    
    loadProfile();
  });

  useState(() => {
    if (company) {
      setCompanyName(company.name);
      setCompanyCui(company.cui);
    }
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setProfileLoading(true);
    try {
      // Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (authError) throw authError;

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('auth_user_id', user.id);
      
      if (dbError) throw dbError;

      toast.success('Profilul a fost actualizat cu succes!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Eroare la actualizarea profilului');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Parolele nu coincid');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Parola trebuie să aibă cel puțin 6 caractere');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;

      toast.success('Parola a fost schimbată cu succes!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Eroare la schimbarea parolei');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setCompanyLoading2(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyName, cui: companyCui })
        .eq('id', company.id);
      
      if (error) throw error;

      toast.success('Datele companiei au fost actualizate!');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Eroare la actualizarea companiei');
    } finally {
      setCompanyLoading2(false);
    }
  };

  const plans = [
    {
      name: 'Starter',
      price: 'Gratuit',
      features: ['1 companie', '5 balanțe/lună', 'Rapoarte de bază'],
      current: true,
    },
    {
      name: 'Professional',
      price: '99 RON/lună',
      features: ['3 companii', 'Balanțe nelimitate', 'Toate rapoartele', 'Export PDF/Excel'],
      current: false,
    },
    {
      name: 'Enterprise',
      price: '299 RON/lună',
      features: ['Companii nelimitate', 'Previziuni AI', 'API Access', 'Suport prioritar'],
      current: false,
    },
  ];

  return (
    <div className="container-app">
      <PageHeader
        title="Setări"
        description="Gestionează profilul, compania și abonamentul tău"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Companie</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Securitate</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Abonament</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informații Profil</CardTitle>
              <CardDescription>
                Actualizează informațiile tale personale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email-ul nu poate fi schimbat
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nume complet</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ion Popescu"
                  />
                </div>

                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvează modificările
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Informații Companie</CardTitle>
              <CardDescription>
                Gestionează datele companiei tale
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : company ? (
                <form onSubmit={handleUpdateCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nume companie</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="SC Exemplu SRL"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyCui">CUI</Label>
                    <Input
                      id="companyCui"
                      value={companyCui}
                      onChange={(e) => setCompanyCui(e.target.value)}
                      placeholder="RO12345678"
                    />
                  </div>

                  <Button type="submit" disabled={companyLoading2}>
                    {companyLoading2 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Actualizează compania
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nu ai nicio companie asociată încă.
                  </p>
                  <Button asChild>
                    <a href="/app/incarcare-balanta">Adaugă o companie</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Schimbă Parola</CardTitle>
              <CardDescription>
                Actualizează parola contului tău
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Parola nouă</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmă parola</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Schimbă parola
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planul tău actual</CardTitle>
                <CardDescription>
                  Gestionează abonamentul și facturarea
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Plan Starter</h3>
                      <Badge variant="secondary">Activ</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gratuit pentru totdeauna
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">0 RON</p>
                    <p className="text-sm text-muted-foreground">/lună</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upgrade Plan</CardTitle>
                <CardDescription>
                  Alege un plan care se potrivește nevoilor tale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`relative p-4 rounded-lg border-2 transition-colors ${
                        plan.current
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {plan.current && (
                        <Badge className="absolute -top-2 right-4">
                          Actual
                        </Badge>
                      )}
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <p className="text-2xl font-bold mt-2">{plan.price}</p>
                      
                      <Separator className="my-4" />
                      
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-accent" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full mt-4"
                        variant={plan.current ? 'outline' : 'default'}
                        disabled={plan.current}
                      >
                        {plan.current ? 'Plan actual' : 'Upgrade'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
