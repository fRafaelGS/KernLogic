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
  PanelLeft,
  PanelRight,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define CSS variables for sidebar widths
const SIDEBAR_CSS = {
  "--sidebar-width": "16rem",
  "--sidebar-rail": "4rem"
} as React.CSSProperties;

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string | number;
  requiredPermission?: string;
  collapsed?: boolean;
  isProducts?: boolean;
}

// Cookie utility functions
const setCookie = (name: string, value: string, daysToExpire: number) => {
  const date = new Date();
  date.setTime(date.getTime() + daysToExpire * 24 * 60 * 60 * 1000);
  document.cookie = name + "=" + value + ";expires=" + date.toUTCString() + ";path=/";
};

const getCookie = (name: string) => {
  const cookieValue = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return cookieValue ? decodeURIComponent(cookieValue.pop() || '') : '';
};

const NavItem = ({ icon: Icon, label, href, badge, requiredPermission, collapsed }: NavItemProps) => {
  const { checkPermission } = useAuth();
  
  // If a permission is required but user doesn't have it, don't show the item
  if (requiredPermission && !checkPermission(requiredPermission)) {
    return null;
  }
  
  const navLink = (
    <NavLink 
      to={href} 
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-md transition-colors",
          collapsed 
            ? "p-2.5 mx-auto justify-center" 
            : "px-3 py-2.5 justify-start w-full",
          isActive
            ? collapsed
              ? "bg-primary-50"
              : "bg-primary-50 text-primary-700 font-medium"
            : "text-enterprise-600 hover:bg-enterprise-100"
        )
      }      
    >
      {({ isActive }) => (
        <>
          <div className={cn(
            "flex items-center transition-transform duration-200 hover:scale-110",
            collapsed ? "justify-center p-0.5" : "gap-3"
          )}>
            <Icon 
              size={collapsed ? 24 : 22} 
              className={isActive ? "text-primary-600" : "text-enterprise-500"} 
            />
            {!collapsed && <span>{label}</span>}
          </div>
          {badge && !collapsed && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 ml-auto">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  // Only show tooltip when collapsed AND not on mobile
  return (collapsed && !window.matchMedia('(max-width: 768px)').matches) ? (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {navLink}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          sideOffset={4}
          className="bg-white shadow-md rounded-md p-2 text-sm border border-enterprise-200"
        >
          <p className="font-medium">{label}</p>
          {badge && (
            <span className="ml-1 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : navLink;
};

export function Sidebar({ className, isMobile = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pinState, setPinState] = useState<"open" | "unpinned" | "closed">(() => {
    const savedState = getCookie('sidebar:pin');
    // If value is invalid or missing, default to "open"
    if (savedState === "open" || savedState === "unpinned" || savedState === "closed") {
      return savedState as "open" | "unpinned" | "closed";
    }
    // Set default cookie if no valid value exists
    document.cookie = `sidebar:pin=${encodeURIComponent("open")}; max-age=${7*24*60*60}; path=/`;
    return "open";
  });
  const [hovering, setHovering] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  
  // Cycle through pin states (only on desktop)
  const cyclePinState = () => {
    if (isMobile) return; // No cycling on mobile
    
    setPinState(prev => {
      const next = prev === "open" ? "closed" : prev === "closed" ? "unpinned" : "open";
      document.cookie = `sidebar:pin=${encodeURIComponent(next)}; max-age=${7*24*60*60}; path=/`;
      return next;
    });
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘B / Ctrl+B - only on desktop
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        cyclePinState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);
  
  // Derive collapse state from pinState
  const isCollapsed = pinState === "closed";
  const isExpanded = pinState === "open";
  const isPreview = pinState === "unpinned";
  
  // Always use full sidebar on mobile, and expand on hover for desktop preview mode
  const effectiveCollapsed = isMobile 
    ? false 
    : isCollapsed
      ? true
      : isExpanded
        ? false
        : // unpinned
          !hovering;

  // Define main navigation items
  const mainNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/app",
      requiredPermission: "dashboard.view"
    },
    {
      icon: Package,
      label: "Products",
      href: "/app/products",
      badge: location.pathname.includes('/app/products') ? '' : '24',
      requiredPermission: "product.view",
      isProducts: true
    },
    {
      icon: BarChart2,
      label: "Reports",
      href: "/app/reports",
      requiredPermission: "dashboard.view"
    }
  ];

  // Define management navigation items
  const managementNavItems = [
    {
      icon: Upload,
      label: "Upload Data",
      href: "/app/upload",
      requiredPermission: "product.add"
    },
    {
      icon: FileText,
      label: "Documentation",
      href: "/app/documentation"
    },
    {
      icon: Users,
      label: "Team",
      href: "/app/team",
      requiredPermission: "team.view"
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/app/settings",
      requiredPermission: "team.view"
    }
  ];
  
  return (
    <div 
      className={cn(
        "flex h-screen flex-col bg-white/95 border-r pl-1",
        className
      )}
      style={{
        ...SIDEBAR_CSS,
        width: effectiveCollapsed ? "var(--sidebar-rail)" : "var(--sidebar-width)",
        transition: "width 300ms ease-in-out"
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Dedicated Toggle Header */}
      <div className="h-14 flex items-center justify-center">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                className="h-9 w-9"
                onClick={cyclePinState}
                aria-label={`Sidebar mode: ${pinState}`}
                disabled={isMobile}
              >
                {pinState === "unpinned" && <Pin size={22} />}
                {pinState === "open" && <Pin size={22} className="fill-current" />}
                {pinState === "closed" && <PinOff size={22} className="fill-current" />}
                <span className="sr-only">{`Sidebar mode: ${pinState}`}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-2 text-sm bg-white border border-enterprise-100 rounded-md shadow">
              {pinState === "open"     ? "Locked open"
               : pinState === "closed" ? "Locked closed"
               : "Preview on hover"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {!effectiveCollapsed && (
          <h1 className="flex items-center text-lg font-bold text-enterprise-900 ml-1">
            <BeakerIcon className="mr-2 h-6 w-6 text-primary-600" />
            KernLogic
          </h1>
        )}
      </div>
      
      {/* Icon Rail / Navigation area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-auto",
        effectiveCollapsed 
          ? "items-center py-12 space-y-12" 
          : "px-4 py-6"
      )}>
        {/* Main navigation */}
        {!effectiveCollapsed && (
          <p className="px-3 text-xs font-medium uppercase tracking-wider text-enterprise-400 mb-3">
            Main
          </p>
        )}
        
        <div className={cn(
          'flex flex-col',
          effectiveCollapsed
            ? 'items-center space-y-8 mb-8'
            : 'items-start w-full space-y-1.5 mb-8'
        )}>
          {(() => {
            const navElements = []
            for (const item of mainNavItems) {
              if (item.isProducts && !effectiveCollapsed) {
                navElements.push(
                  <div key={item.href} className="w-full">
                    <button
                      className={cn(
                        'flex items-center w-full px-3 py-2.5 rounded-md transition-colors text-enterprise-600 hover:bg-enterprise-100',
                        location.pathname.startsWith('/app/products') && 'bg-primary-50 text-primary-700 font-medium'
                      )}
                      onClick={() => setProductsOpen(v => !v)}
                      type="button"
                      aria-expanded={productsOpen}
                      aria-controls="products-submenu"
                    >
                      <Package size={22} className="mr-3 text-enterprise-500" />
                      <span>Products</span>
                      <span className="ml-auto flex items-center">
                        {productsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>
                    {productsOpen && (
                      <div id="products-submenu" className="ml-8 mt-1 flex flex-col gap-1">
                        <NavItem
                          icon={Package}
                          label="All Products"
                          href="/app/products"
                          requiredPermission="product.view"
                          collapsed={false}
                        />
                        <NavItem
                          icon={BeakerIcon}
                          label="Families"
                          href="/app/products/families"
                          requiredPermission="product.view"
                          collapsed={false}
                        />
                      </div>
                    )}
                  </div>
                )
              } else {
                navElements.push(
                  <NavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    badge={item.badge}
                    requiredPermission={item.requiredPermission}
                    collapsed={effectiveCollapsed}
                  />
                )
              }
            }
            return navElements
          })()}
        </div>

        {/* Group separator - only shown when collapsed */}
        {isCollapsed && (
          <div className="w-8 h-px bg-enterprise-200 mx-auto my-4" />
        )}

        {/* Management navigation */}
        {!effectiveCollapsed && (
          <p className="px-3 text-xs font-medium uppercase tracking-wider text-enterprise-400 mb-3">
            Management
          </p>
        )}
        
        <div className={cn(
          "flex flex-col",
          effectiveCollapsed 
          ? "items-center space-y-8 mb-8" 
          : "items-start w-full space-y-1.5 mb-8"
        )}>
          {managementNavItems.map(item => (
            <NavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              requiredPermission={item.requiredPermission}
              collapsed={effectiveCollapsed}
            />
          ))}
        </div>

        {/* Help & Support section - hide when collapsed */}
        {!effectiveCollapsed && (
          <div className="mt-auto mb-6">
            <div className="rounded-lg bg-enterprise-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-primary-100 p-1.5">
                  <HelpCircle size={20} className="text-primary-600" />
                </div>
                <h3 className="font-medium text-enterprise-800">Need Help?</h3>
              </div>
              <p className="text-xs text-enterprise-600 mb-3">
                Check our documentation or contact support for assistance.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-enterprise-700 border-enterprise-200 hover:bg-enterprise-100 focus-visible:ring-0 focus-visible:outline-none"
                asChild
              >
                <Link to="/app/documentation">
                  View Documentation
                  <ChevronRight size={18} className="ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* User area */}
      <div className="mt-auto border-t border-enterprise-200 p-4 sticky bottom-0 bg-white">
        {effectiveCollapsed ? (
          <div className="flex justify-center">
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  sideOffset={4}
                  className="bg-white shadow-md rounded-md p-2 text-sm border border-enterprise-100"
                >
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-enterprise-500">{user?.email || 'user@example.com'}</p>
                  {user?.role && (
                    <p className="text-xs bg-enterprise-100 rounded-full px-2 py-0.5 inline-block mt-1 text-enterprise-700">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-enterprise-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-enterprise-500 truncate">{user?.email || 'user@example.com'}</p>
              {user?.role && (
                <p className="text-xs bg-enterprise-100 rounded-full px-2 py-0.5 inline-block mt-1 text-enterprise-700">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              onClick={() => logout()}
            >
              <LogOut size={20} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
