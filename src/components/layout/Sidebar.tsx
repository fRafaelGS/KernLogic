import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  Upload, 
  Settings, 
  BeakerIcon, 
  Users, 
  BarChart2,
  LogOut,
  ChevronRight,
  HelpCircle,
  FileText,
  HomeIcon,
  ShoppingCartIcon,
  BarChart4Icon,
  BookOpenIcon,
  UploadIcon,
  UsersIcon
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string | number;
}

const NavItem = ({ icon: Icon, label, href, badge }: NavItemProps) => {
  return (
    <NavLink 
      to={href} 
      className={({ isActive }) => 
        cn(
          "flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-all",
          isActive 
            ? "bg-primary-50 text-primary-700 font-medium" 
            : "text-enterprise-600 hover:bg-enterprise-50 hover:text-enterprise-800"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <Icon 
              size={18} 
              className={isActive ? "text-primary-600" : "text-enterprise-500"} 
            />
            <span>{label}</span>
          </div>
          {badge && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export function Sidebar({ className }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { name: 'Dashboard', href: '/app', icon: HomeIcon },
    { name: 'Products', href: '/app/v1/products', icon: ShoppingCartIcon, badge: '24' },
    { name: 'Reports', href: '/app/reports', icon: BarChart4Icon },
    { name: 'Import', href: '/app/upload', icon: UploadIcon },
    { name: 'Docs', href: '/app/documentation', icon: BookOpenIcon },
    { name: 'Team', href: '/app/team', icon: UsersIcon },
  ];

  return (
    <div className={cn("flex h-screen w-64 flex-col bg-white border-r border-enterprise-200 shadow-sm", className)}>
      {/* Logo area */}
      <div className="flex h-16 items-center border-b border-enterprise-200 px-6">
        <h1 className="flex items-center text-lg font-bold text-enterprise-900">
          <BeakerIcon className="mr-2 h-6 w-6 text-primary-600" />
          KernLogic
        </h1>
      </div>
      
      {/* Navigation area */}
      <div className="flex-1 overflow-auto py-6 px-4">
        <div className="mb-8">
          <p className="px-3 text-xs font-medium uppercase tracking-wider text-enterprise-400 mb-3">Main</p>
          <nav className="space-y-1.5">
            <NavItem icon={LayoutDashboard} label="Dashboard" href="/app" />
            <NavItem 
              icon={Package} 
              label="Products" 
              href="/app/v1/products" 
              badge={location.pathname.includes('/app/v1/products') ? '' : '24'} 
            />
            <NavItem icon={BarChart2} label="Reports" href="/app/reports" />
          </nav>
        </div>
        
        <div className="mb-8">
          <p className="px-3 text-xs font-medium uppercase tracking-wider text-enterprise-400 mb-3">Management</p>
          <nav className="space-y-1.5">
            <NavItem icon={Upload} label="Upload Data" href="/app/upload" />
            <NavItem icon={FileText} label="Documentation" href="/app/documentation" />
            <NavItem icon={Users} label="Team" href="/app/team" />
            <NavItem icon={Settings} label="Settings" href="/app/settings" />
          </nav>
        </div>

        {/* Help & Support section */}
        <div className="mt-auto mb-6">
          <div className="rounded-lg bg-enterprise-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-primary-100 p-1.5">
                <HelpCircle size={16} className="text-primary-600" />
              </div>
              <h3 className="font-medium text-enterprise-800">Need Help?</h3>
            </div>
            <p className="text-xs text-enterprise-600 mb-3">
              Check our documentation or contact support for assistance.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-enterprise-700 border-enterprise-200 hover:bg-enterprise-100"
              asChild
            >
              <Link to="/app/documentation">
                View Documentation
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* User area */}
      <div className="border-t border-enterprise-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-enterprise-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-enterprise-500 truncate">{user?.email || 'user@example.com'}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-50"
            onClick={() => logout()}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
