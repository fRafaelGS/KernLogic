import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Search, 
  LogOut, 
  HelpCircle, 
  Settings,
  User,
  MessageSquare,
  Calendar,
  Menu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';

export function Header() {
  const { user, logout, notifications, unreadCount, markAllAsRead } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-enterprise-200 bg-white px-4 md:px-6 shadow-sm">
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden text-enterprise-500"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 md:w-72">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-enterprise-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-enterprise-50 border-enterprise-200 pl-9 focus-visible:ring-primary-500 focus-visible:border-primary-500 text-sm"
          />
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="flex items-center gap-1 md:gap-3">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-50"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                 <span className="absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary-500 text-white text-[9px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                 </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary-600 hover:text-primary-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={markAllAsRead} 
                disabled={unreadCount === 0} 
              >
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-auto p-1">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={cn(
                      "flex flex-col items-start py-2.5 px-3 rounded-md transition-colors mb-1",
                      notification.read ? "bg-white hover:bg-enterprise-50" : "bg-primary-50 hover:bg-primary-100"
                    )}
                  >
                    <div className="flex w-full items-start">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5",
                        notification.type === 'success' ? "bg-success-100 text-success-600" :
                        notification.type === 'error' ? "bg-danger-100 text-danger-600" :
                        notification.type === 'warning' ? "bg-warning-100 text-warning-600" :
                        "bg-info-100 text-info-600"
                      )}>
                        <Bell size={14} /> 
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-enterprise-800 mb-0.5">
                          {notification.message}
                        </p>
                        {notification.description && (
                           <p className="text-xs text-enterprise-500 mb-1">
                            {notification.description}
                           </p>
                        )}
                        <p className="text-xs text-enterprise-500">
                           {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                       {!notification.read && (
                         <div className="h-2 w-2 rounded-full bg-primary-500 ml-2 mt-1 flex-shrink-0"></div>
                       )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                 <div className="p-4 text-center text-sm text-enterprise-500">
                   No new notifications
                 </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-50"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        
        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden md:flex text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-50"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-enterprise-700 hover:bg-enterprise-50 px-2 md:px-3"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-enterprise-800">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-enterprise-500">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center">
              <User className="h-4 w-4 mr-2 text-enterprise-500" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center">
              <Settings className="h-4 w-4 mr-2 text-enterprise-500" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger-600" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 