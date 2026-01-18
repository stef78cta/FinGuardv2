import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  TrendingUp, 
  Target, 
  GitCompare, 
  BarChart3, 
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { UserMenuPopover } from '@/components/UserMenuPopover';
import { cn } from '@/lib/utils';
import { useBalante } from '@/hooks/useBalante';

const menuItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Încărcare balanță', url: '/app/incarcare-balanta', icon: Upload, showBadge: true },
  { title: 'Rapoarte financiare', url: '/app/rapoarte-financiare', icon: FileText },
  { title: 'Analize financiare', url: '/app/analize-financiare', icon: TrendingUp },
  { title: 'Indicatori cheie', url: '/app/indicatori-cheie', icon: Target },
  { title: 'Analize comparative', url: '/app/analize-comparative', icon: GitCompare },
  { title: 'Alte analize', url: '/app/alte-analize', icon: BarChart3 },
  { title: 'Previziuni bugetare', url: '/app/previziuni-bugetare', icon: Calendar },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { balances } = useBalante();
  
  const balanceCount = balances.length;

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="h-14 px-4 flex items-center border-b border-border bg-gradient-to-r from-card to-primary/5">
        <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          {open && (
            <div>
              <h2 className="font-bold text-foreground text-sm tracking-tight">FinGuard</h2>
              <p className="text-xs text-muted-foreground">Analiză financiară AI</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Meniu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                          isActive
                            ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-4 border-primary pl-2.5 shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      <item.icon 
                        className={cn(
                          "w-5 h-5 shrink-0 transition-transform duration-200",
                          "group-hover:scale-110"
                        )} 
                        strokeWidth={2} 
                      />
                      {open && (
                        <span className="text-sm flex-1">{item.title}</span>
                      )}
                      {open && item.showBadge && balanceCount > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="ml-auto bg-accent/20 text-accent text-xs px-1.5 py-0"
                        >
                          {balanceCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-gradient-to-r from-card to-muted/30">
        {/* Upgrade CTA - Only show when sidebar is open */}
        {open && (
          <div className="px-4 py-3">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Upgrade la Pro</span>
              </div>
              <p className="text-xs opacity-90 mb-3">
                Acces la previziuni AI și analize avansate
              </p>
              <button className="w-full bg-card text-primary rounded-lg py-2 text-xs font-semibold hover:bg-card/90 transition-colors">
                Află mai multe
              </button>
            </div>
          </div>
        )}
        
        <div className="px-4 py-3 space-y-2">
          <NotificationsPopover />
          <UserMenuPopover />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
