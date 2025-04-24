import { cn } from "@/lib/utils";
import { HomeIcon, DatabaseIcon, UploadIcon, SettingsIcon, BeakerIcon, UsersIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  className?: string;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

const NavItem = ({ icon: Icon, label, href, active }: NavItemProps) => {
  return (
    <NavLink 
      to={href} 
      className={({ isActive }) => 
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
          isActive 
            ? "bg-primary-600 text-white font-medium" 
            : "text-slate-200 hover:bg-white/10"
        )
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
};

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAuth();

  return (
    <div className={cn("flex h-screen w-64 flex-col bg-primary", className)}>
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <h1 className="flex items-center text-lg font-bold text-white">
          <BeakerIcon className="mr-2 h-6 w-6" />
          KernLogic
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto py-4 px-3">
        <nav className="space-y-1">
          <NavItem icon={HomeIcon} label="Dashboard" href="/app" />
          <NavItem icon={DatabaseIcon} label="Products" href="/app/products" />
          <NavItem icon={UploadIcon} label="Upload Data" href="/app/upload" />
          <NavItem icon={UsersIcon} label="Team" href="/app/team" />
          <NavItem icon={SettingsIcon} label="Settings" href="/app/settings" />
        </nav>
      </div>
      
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-300">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
