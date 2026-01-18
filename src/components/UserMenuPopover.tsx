import { useState, useEffect } from 'react';
import { User, Settings, HelpCircle, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  name: string;
  email: string;
  initials: string;
}

export function UserMenuPopover() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const name = data?.full_name || user.email?.split('@')[0] || 'Utilizator';
        const email = data?.email || user.email || '';
        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        setProfile({ name, email, initials });
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to auth user data
        const name = user.email?.split('@')[0] || 'Utilizator';
        setProfile({
          name,
          email: user.email || '',
          initials: name.slice(0, 2).toUpperCase(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems = [
    { 
      icon: User, 
      label: "Profilul meu", 
      action: () => navigate('/app/settings') 
    },
    { 
      icon: Settings, 
      label: "Setări", 
      action: () => navigate('/app/settings') 
    },
    { 
      icon: HelpCircle, 
      label: "Ajutor", 
      action: () => window.open('mailto:support@finguard.ro', '_blank') 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-3 w-full p-2">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
        {open && (
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
            <div className="h-3 bg-muted rounded animate-pulse w-32" />
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {profile?.initials || 'U'}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" side="right" align="end">
        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-3 border-b">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {profile?.initials || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>

          <Separator />

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-destructive/10 transition-colors text-left text-destructive disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {loggingOut ? 'Se deconectează...' : 'Deconectare'}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
