import { useState } from 'react';
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
  ChevronDown,
  Bell,
  User,
  Settings,
  LogOut,
  Shield
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const menuItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Încărcare balanță', url: '/app/incarcare-balanta', icon: Upload },
  { 
    title: 'Rapoarte', 
    icon: FileText,
    subItems: [
      { title: 'Rapoarte financiare', url: '/app/rapoarte-financiare' },
    ]
  },
  { 
    title: 'Analize', 
    icon: TrendingUp,
    subItems: [
      { title: 'Analize financiare', url: '/app/analize-financiare' },
      { title: 'Analize comparative', url: '/app/analize-comparative' },
      { title: 'Alte analize', url: '/app/alte-analize' },
    ]
  },
  { title: 'Indicatori cheie', url: '/app/indicatori-cheie', icon: Target },
  { title: 'Previziuni bugetare', url: '/app/previziuni-bugetare', icon: Calendar },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const toggleSubMenu = (title: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <Sidebar className="border-r border-gray-200 bg-surface transition-all duration-300 ease-in-out">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="font-semibold text-foreground text-sm">FinGuard</h2>
              <p className="text-xs text-foreground-secondary">Protejează-ți finanțele</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={open ? "px-4" : "px-2"}>
            {open ? "Meniu Principal" : "•"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const hasSubItems = 'subItems' in item;
                
                if (hasSubItems) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={openSubMenus[item.title]}
                      onOpenChange={() => toggleSubMenu(item.title)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-foreground-secondary hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <item.icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                            {open && (
                              <>
                                <span className="flex-1 text-left">{item.title}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openSubMenus[item.title] ? 'rotate-180' : ''}`} />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="transition-all duration-300 ease-in-out">
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={subItem.url}
                                    className={({ isActive }) =>
                                      `flex items-center gap-3 px-3 py-2 ml-6 rounded-lg transition-all duration-200 ${
                                        isActive
                                          ? 'bg-indigo-100 text-indigo-700 font-semibold border-l-4 border-indigo-600 pl-2'
                                          : 'text-foreground-secondary hover:bg-indigo-50 hover:text-indigo-700'
                                      }`
                                    }
                                  >
                                    {open && <span>{subItem.title}</span>}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
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
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notificări</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <p className="font-medium text-sm">Balanță nouă încărcată</p>
                <p className="text-xs text-muted-foreground">Acum 2 ore</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <p className="font-medium text-sm">Raport gata</p>
                <p className="text-xs text-muted-foreground">Ieri la 15:30</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <p className="font-medium text-sm">Analiză completă</p>
                <p className="text-xs text-muted-foreground">Acum 3 zile</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`${open ? 'w-full justify-start' : 'w-9 p-0'} h-9`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  {open && (
                    <div className="flex-1 text-left animate-fade-in">
                      <p className="text-sm font-medium text-foreground">Ion Popescu</p>
                      <p className="text-xs text-foreground-secondary">Administrator</p>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Contul meu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Setări</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Deconectare</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
