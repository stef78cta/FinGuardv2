import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const routeTitles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/incarcare-balanta': 'Încărcare Balanță',
  '/app/rapoarte-financiare': 'Rapoarte Financiare',
  '/app/analize-financiare': 'Analize Financiare',
  '/app/indicatori-cheie': 'Indicatori Cheie',
  '/app/analize-comparative': 'Analize Comparative',
  '/app/alte-analize': 'Alte Analize',
  '/app/previziuni-bugetare': 'Previziuni Bugetare',
};

const AppLayout = () => {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'FinGuard';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Enhanced Header */}
          <header className="app-header">
            <SidebarTrigger className="mr-4" />
            
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground hidden sm:block">
                  {currentTitle}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar - Hidden on mobile */}
                <div className="hidden md:flex relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Caută în aplicație..." 
                    className="w-64 pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content - Full width utilization */}
          <main className="flex-1 overflow-auto w-full">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
