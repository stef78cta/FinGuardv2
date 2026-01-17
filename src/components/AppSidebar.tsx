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
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { UserMenuPopover } from '@/components/UserMenuPopover';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Încărcare balanță', url: '/app/incarcare-balanta', icon: Upload },
  { title: 'Rapoarte financiare', url: '/app/rapoarte-financiare', icon: FileText },
  { title: 'Analize financiare', url: '/app/analize-financiare', icon: TrendingUp },
  { title: 'Indicatori cheie', url: '/app/indicatori-cheie', icon: Target },
  { title: 'Analize comparative', url: '/app/analize-comparative', icon: GitCompare },
  { title: 'Alte analize', url: '/app/alte-analize', icon: BarChart3 },
  { title: 'Previziuni bugetare', url: '/app/previziuni-bugetare', icon: Calendar },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="h-14 px-4 flex items-center border-b border-gray-200 bg-gradient-to-r from-white to-indigo-50/30">
        <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {open && (
            <div>
              <h2 className="font-bold text-foreground text-sm tracking-tight">FinGuard</h2>
              <p className="text-xs text-foreground-secondary">Analiză financiară AI</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold border-l-4 border-indigo-600 pl-2.5 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                      {open && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 bg-gradient-to-r from-white to-gray-50/50">
        {/* Upgrade CTA - Only show when sidebar is open */}
        {open && (
          <div className="px-4 py-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Upgrade la Pro</span>
              </div>
              <p className="text-xs text-indigo-100 mb-3">
                Acces la previziuni AI și analize avansate
              </p>
              <button className="w-full bg-white text-indigo-600 rounded-lg py-2 text-xs font-semibold hover:bg-indigo-50 transition-colors">
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
