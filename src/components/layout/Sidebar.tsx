
import { cn } from "@/lib/utils";
import { HomeIcon, DatabaseIcon, UploadIcon, SettingsIcon, BeakerIcon, UsersIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

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
  return (
    <div className={cn("flex h-screen w-64 flex-col bg-primary", className)}>
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <h1 className="flex items-center text-lg font-bold text-white">
          <BeakerIcon className="mr-2 h-6 w-6" />
          Data Alchemy
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto py-4 px-3">
        <nav className="space-y-1">
          <NavItem icon={HomeIcon} label="Dashboard" href="/" />
          <NavItem icon={DatabaseIcon} label="Products" href="/products" />
          <NavItem icon={UploadIcon} label="Upload Data" href="/upload" />
          <NavItem icon={UsersIcon} label="Team" href="/team" />
          <NavItem icon={SettingsIcon} label="Settings" href="/settings" />
        </nav>
      </div>
      
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20" />
          <div>
            <p className="text-sm font-medium text-white">User Name</p>
            <p className="text-xs text-slate-300">user@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
