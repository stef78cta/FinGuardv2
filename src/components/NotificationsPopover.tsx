import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSidebar } from '@/components/ui/sidebar';

const mockNotifications = [
  { 
    id: 1, 
    title: "Raport generat", 
    message: "Raportul financiar pentru Q4 este disponibil", 
    time: "acum 2 ore", 
    unread: true 
  },
  { 
    id: 2, 
    title: "Bilanț încărcat", 
    message: "Balanța pentru decembrie a fost procesată", 
    time: "ieri", 
    unread: true 
  },
  { 
    id: 3, 
    title: "Analiză completă", 
    message: "Analiza comparativă este gata", 
    time: "3 zile", 
    unread: false 
  },
];

export function NotificationsPopover() {
  const { open } = useSidebar();
  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
              <Bell className="w-5 h-5 text-foreground" />
            </div>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
          {open && (
            <span className="text-sm font-medium text-foreground">Notificări</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="right" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-semibold text-sm">Notificări</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} noi
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {mockNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${
                  notification.unread ? 'bg-accent/50' : 'bg-background'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                  </div>
                  {notification.unread && (
                    <div className="w-2 h-2 rounded-full bg-destructive mt-1" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
              </div>
            ))}
          </div>
          
          <button className="w-full pt-2 border-t text-sm text-primary hover:underline">
            Vezi toate notificările
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
