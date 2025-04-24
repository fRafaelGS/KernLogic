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

export function Header() {
  const { user, logout } = useAuth();
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
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button variant="ghost" size="sm" className="text-xs text-primary-600 hover:text-primary-700">
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-auto">
              {[1, 2, 3].map((n) => (
                <DropdownMenuItem key={n} className="flex flex-col items-start py-2">
                  <div className="flex w-full">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3",
                      n === 1 ? "bg-primary-100 text-primary-600" : 
                      n === 2 ? "bg-success-100 text-success-600" : 
                      "bg-info-100 text-info-600"
                    )}>
                      {n === 1 ? <Bell size={14} /> : 
                       n === 2 ? <Calendar size={14} /> : 
                       <MessageSquare size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-enterprise-800 mb-0.5">
                        {n === 1 ? "New product added" : 
                         n === 2 ? "Team meeting" : 
                         "Message from support"}
                      </p>
                      <p className="text-xs text-enterprise-500">2 hours ago</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary-600 hover:text-primary-700">
              View all notifications
            </DropdownMenuItem>
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