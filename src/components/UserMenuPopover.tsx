import { User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';

const mockUser = {
  name: "Ion Popescu",
  email: "ion.popescu@company.ro",
  initials: "IP",
  role: "Manager Financiar"
};

const menuItems = [
  { icon: User, label: "Profilul meu", action: () => console.log("Profile") },
  { icon: Settings, label: "Setări", action: () => console.log("Settings") },
  { icon: HelpCircle, label: "Ajutor", action: () => console.log("Help") },
];

export function UserMenuPopover() {
  const { open } = useSidebar();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {mockUser.initials}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">{mockUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
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
                {mockUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{mockUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mockUser.role}</p>
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
            onClick={() => console.log("Logout")}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-destructive/10 transition-colors text-left text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Deconectare</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
