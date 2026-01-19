import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Building2, 
  FileSpreadsheet, 
  Shield,
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'user' | 'admin' | 'super_admin';
}

interface Company {
  id: string;
  name: string;
  cui: string;
  created_at: string;
  member_count: number;
}

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  totalImports: number;
  recentActivity: number;
}

const Admin = () => {
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCompanies: 0,
    totalImports: 0,
    recentActivity: 0,
  });
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with roles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at');

      if (usersError) throw usersError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRole[] = [];
      for (const user of usersData || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        usersWithRoles.push({
          ...user,
          role: (roleData?.role as 'user' | 'admin' | 'super_admin') || 'user',
        });
      }
      setUsers(usersWithRoles);

      // Fetch companies with member counts
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, cui, created_at');

      if (companiesError) throw companiesError;

      const companiesWithCounts: Company[] = [];
      for (const company of companiesData || []) {
        const { count } = await supabase
          .from('company_users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);
        
        companiesWithCounts.push({
          ...company,
          member_count: count || 0,
        });
      }
      setCompanies(companiesWithCounts);

      // Fetch stats
      const { count: importsCount } = await supabase
        .from('trial_balance_imports')
        .select('*', { count: 'exact', head: true });

      // Recent activity (imports in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentCount } = await supabase
        .from('trial_balance_imports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      setStats({
        totalUsers: usersData?.length || 0,
        totalCompanies: companiesData?.length || 0,
        totalImports: importsCount || 0,
        recentActivity: recentCount || 0,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    if (!isSuperAdmin) {
      toast({
        title: 'Acces interzis',
        description: 'Doar super administratorii pot schimba rolurile.',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingRole(userId);
    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Succes',
        description: 'Rolul a fost actualizat.',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza rolul.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Utilizator';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panou Administrare"
        description="Gestionează utilizatorii, companiile și monitorizează activitatea"
        actions={
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Reîmprospătează
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilizatori</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companii</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importuri</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalImports}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activitate Recentă</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <p className="text-xs text-muted-foreground">importuri în ultimele 7 zile</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Users and Companies */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilizatori
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            Companii
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestionare Utilizatori</CardTitle>
              <CardDescription>
                Vizualizează și gestionează toți utilizatorii platformei
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există utilizatori înregistrați.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Data înregistrării</TableHead>
                      {isSuperAdmin && <TableHead>Acțiuni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => 
                                handleRoleChange(user.id, value as 'user' | 'admin' | 'super_admin')
                              }
                              disabled={updatingRole === user.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Utilizator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Companii Înregistrate</CardTitle>
              <CardDescription>
                Lista tuturor companiilor din platformă
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există companii înregistrate.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Denumire</TableHead>
                      <TableHead>CUI</TableHead>
                      <TableHead>Membri</TableHead>
                      <TableHead>Data creării</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.cui}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {company.member_count}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(company.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
