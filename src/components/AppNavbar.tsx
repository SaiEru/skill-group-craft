import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Users, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppNavbar() {
  const { displayName, user } = useAuth();
  const name = displayName || user?.email?.split("@")[0] || "User";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shadow-card">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-foreground" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground hidden sm:inline">PeerIQ</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">{name}</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
