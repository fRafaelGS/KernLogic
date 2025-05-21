import { cn } from "@/domains/core/lib/utils";
import {   LayoutDashboard,   Package,   Upload,   Settings,   BeakerIcon,   Users,   BarChart2,  FileText,  PanelLeft,  PanelRight,  Pin,  PinOff,  ChevronDown,  ChevronUp} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/domains/app/providers/AuthContext";
import { Button } from "@/domains/core/components/ui/button";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/domains/core/components/ui/tooltip";
import { productService } from '@/services/productService'

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
  end?: boolean;
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

const NavItem = ({ icon: Icon, label, href, badge, requiredPermission, collapsed, end }: NavItemProps & { end?: boolean }) => {
  const { checkPermission } = useAuth();
  
  // If a permission is required but user doesn't have it, don't show the item
  if (requiredPermission && !checkPermission(requiredPermission)) {
    return null;
  }
  
  const navLink = (
    <NavLink 
      to={href} 
      {...(end ? { end: true } : {})}
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
  const [productCount, setProductCount] = useState<number | null>(null)
  
  // Fetch product count for sidebar badge
  useEffect(() => {
    let isMounted = true
    productService.getProducts({ page: 1, page_size: 1 }, false, false).then(res => {
      if (isMounted && res && typeof res === 'object' && 'count' in res) {
        setProductCount(res.count)
      }
    }).catch(() => {
      if (isMounted) setProductCount(null)
    })
    return () => { isMounted = false }
  }, [])

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
      requiredPermission: "dashboard.view",
      end: true
    },
    {
      icon: Package,
      label: "Products",
      href: "/app/products",
      badge: !location.pathname.startsWith('/app/products') && productCount !== null ? productCount : '',
      requiredPermission: "product.view"
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
          {mainNavItems.map(item => (
            <NavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              badge={item.badge}
              requiredPermission={item.requiredPermission}
              collapsed={effectiveCollapsed}
              end={item.end}
            />
          ))}
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

        
            </div>    </div>
  );
}
