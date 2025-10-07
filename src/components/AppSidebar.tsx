import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  TrendingUp, 
  Target, 
  GitCompare, 
  BarChart3, 
  Calendar 
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
    <Sidebar className="border-r border-gray-200 bg-surface">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {open && (
            <div>
              <h2 className="font-semibold text-foreground text-sm">FinanceAI</h2>
              <p className="text-xs text-foreground-secondary">Analiză inteligentă</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Meniu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-700 font-semibold border-l-4 border-indigo-600 pl-2'
                            : 'text-foreground-secondary hover:bg-indigo-50 hover:text-indigo-700'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        {open && (
          <div className="text-xs text-foreground-secondary text-center">
            © 2024 FinanceAI
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
