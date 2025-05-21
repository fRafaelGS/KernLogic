import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { fetchAuditLogs, AuditLogEntry } from '@/services/teamService';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { 
  ArrowLeft, Clock, UserPlus, UserCog, UserMinus, 
  Search, SlidersHorizontal, ChevronUp, ChevronDown,
  DownloadCloud, RefreshCw, AlertCircle, Trash,
  ChevronLeft, ChevronRight, X, Info, User, Calendar, FileText
} from 'lucide-react';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { Badge } from '@/domains/core/components/ui/badge';
import { Button } from '@/domains/core/components/ui/button';
import { Input } from '@/domains/core/components/ui/input';
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/domains/core/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/domains/core/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/domains/core/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/domains/core/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/domains/core/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/domains/core/components/ui/sheet';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/domains/core/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/domains/core/components/ui/accordion";
import { ROUTES } from '@/config/routes';

// Development only logging helper
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

// Type definitions
type SortField = 'timestamp' | 'action' | 'user';
type SortOrder = 'asc' | 'desc';
type FilterOptions = {
  action: string;
  dateRange: string;
  search: string;
};

// Helper functions
const getActionIcon = (action: string) => {
  switch (action) {
    case 'invite':
      return <UserPlus className="h-4 w-4 mr-1" />;
    case 'role_change':
      return <UserCog className="h-4 w-4 mr-1" />;
    case 'remove':
      return <UserMinus className="h-4 w-4 mr-1" />;
    default:
      return <AlertCircle className="h-4 w-4 mr-1" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'invite':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'role_change':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'remove':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatActionText = (action: string) => {
  return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const renderActionDescription = (log: AuditLogEntry) => {
  switch (log.action) {
    case 'invite':
      return `invited ${log.details.email || 'a user'} as ${log.details.role || 'member'}`;
    case 'role_change':
      return `changed role for ${log.details.email || 'a user'} from ${log.details.from || 'previous role'} to ${log.details.to || 'new role'}`;
    case 'remove':
      return `removed ${log.details.email || 'a user'} (${log.details.role || 'member'})`;
    default:
      return `performed ${log.action} action`;
  }
};

// Helper function to render details
const renderDetails = (details: Record<string, any>, action: string) => {
  return (
    <pre className="overflow-auto whitespace-pre-wrap text-xs">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
};

// Loading Skeleton Component
const AuditLogSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start">
          <div className="w-full">
            <div className="flex items-center">
              <Skeleton className="h-6 w-24 rounded mr-2" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-4 w-full rounded mt-2" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State Component
const EmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <Card className="w-full bg-white">
    <CardHeader className="pb-4">
      <CardTitle className="text-center text-xl">No audit records found</CardTitle>
      <CardDescription className="text-center">
        Team management activities will be recorded here when your team members perform actions.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col items-center pb-6">
      <div className="mb-4 p-6 bg-gray-50 rounded-full">
        <Clock className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 max-w-md text-center">
        When team members invite users, change roles, or remove members, those actions will appear in this audit log.
      </p>
    </CardContent>
    <CardFooter className="flex justify-center pb-8">
      <Button variant="outline" onClick={onRefresh} className="flex items-center">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </CardFooter>
  </Card>
);

// Filter Sheet Component
const FilterSheet: React.FC<{
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}> = ({ filters, onFiltersChange }) => {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      action: 'all',
      dateRange: 'all',
      search: '',
    };
    setTempFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Audit Logs</SheetTitle>
          <SheetDescription>
            Narrow down audit logs by specific criteria
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Action Type</h4>
            <Select
              value={tempFilters.action}
              onValueChange={(value) => setTempFilters({ ...tempFilters, action: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="invite">Invite</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="remove">Remove</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Date Range</h4>
            <Select
              value={tempFilters.dateRange}
              onValueChange={(value) => setTempFilters({ ...tempFilters, dateRange: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// Custom pagination component that accepts the props we need
const PaginationControl: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | React.SetStateAction<number>) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  // Generate an array of page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // If we have fewer pages than our maximum, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of pages to show
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        end = 4;
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      // Add ellipsis if needed at the beginning
      if (start > 2) {
        pageNumbers.push('ellipsis-start');
      }
      
      // Add the pages
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis if needed at the end
      if (end < totalPages - 1) {
        pageNumbers.push('ellipsis-end');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          />
        </PaginationItem>
        
        {pageNumbers.map((pageNumber, i) => {
          if (pageNumber === 'ellipsis-start' || pageNumber === 'ellipsis-end') {
            return (
              <PaginationItem key={`ellipsis-${i}`}>
                <span className="flex h-9 w-9 items-center justify-center">...</span>
              </PaginationItem>
            );
          }
          
          return (
            <PaginationItem key={pageNumber}>
              <PaginationLink 
                isActive={currentPage === pageNumber}
                onClick={() => onPageChange(pageNumber as number)}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

// Helper function to group logs by date
const groupLogsByDate = (logs: AuditLogEntry[]) => {
  const groups: { [key: string]: AuditLogEntry[] } = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    let dateKey: string;
    
    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(log);
  });
  
  // Convert to array of [date, logs] pairs and sort by date (newest first)
  return Object.entries(groups).sort((a, b) => {
    if (a[0] === 'Today') return -1;
    if (b[0] === 'Today') return 1;
    if (a[0] === 'Yesterday') return -1;
    if (b[0] === 'Yesterday') return 1;
    
    // For other dates, sort by newest first
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    return dateB.getTime() - dateA.getTime();
  });
};

// New rich badge component
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const getActionBorderColor = (action: string) => {
    switch (action) {
      case 'invite':
        return 'border-green-500';
      case 'role_change':
        return 'border-blue-500';
      case 'remove':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div 
      className={`flex items-center px-3 py-1.5 bg-white border-l-4 rounded-sm 
                 ${getActionBorderColor(action)} hover:bg-gray-50 transition-colors duration-200 group`}
    >
      <span className="mr-1.5">{getActionIcon(action)}</span>
      <span className="text-sm font-medium">{formatActionText(action)}</span>
    </div>
  );
};

// DetailDrawer component for rich detail display
const DetailDrawer: React.FC<{
  log: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}> = ({ log, open, onClose }) => {
  if (!log) return null;

  const formatDetailValue = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  const renderHumanReadableDetails = () => {
    if (!log.details) return null;
    
    // Format based on action type
    switch (log.action) {
      case 'invite':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-md">
              <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                <UserPlus className="h-4 w-4 mr-1" /> 
                Invitation Details
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-green-700">Email</div>
                  <div className="col-span-2 text-xs">{log.details.email || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-green-700">Role</div>
                  <div className="col-span-2 text-xs">{log.details.role || '—'}</div>
                </div>
                {log.details.message && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-xs font-medium text-green-700">Message</div>
                    <div className="col-span-2 text-xs">{log.details.message}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'role_change':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <UserCog className="h-4 w-4 mr-1" />
                Role Change Details
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-blue-700">User</div>
                  <div className="col-span-2 text-xs">{log.details.email || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-blue-700">From</div>
                  <div className="col-span-2 text-xs bg-red-50 line-through px-1 py-0.5 rounded">
                    {log.details.from || '—'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-blue-700">To</div>
                  <div className="col-span-2 text-xs bg-green-50 px-1 py-0.5 rounded">
                    {log.details.to || '—'}
                  </div>
                </div>
                {log.details.reason && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-xs font-medium text-blue-700">Reason</div>
                    <div className="col-span-2 text-xs">{log.details.reason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'remove':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                <UserMinus className="h-4 w-4 mr-1" />
                Removal Details
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-red-700">User</div>
                  <div className="col-span-2 text-xs">{log.details.email || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-medium text-red-700">Role</div>
                  <div className="col-span-2 text-xs">{log.details.role || '—'}</div>
                </div>
                {log.details.reason && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-xs font-medium text-red-700">Reason</div>
                    <div className="col-span-2 text-xs">{log.details.reason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      default:
        // For any other action type, display a generic format
        return (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Event Details
              </h4>
              <div className="space-y-2">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2">
                    <div className="text-xs font-medium text-gray-700 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="col-span-2 text-xs font-mono">
                      {formatDetailValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Audit Log Details</SheetTitle>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Meta information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Event Information</h3>
            
            <div className="grid grid-cols-[20px_1fr] gap-y-3 gap-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="text-sm space-y-1">
                <div className="font-medium">Timestamp</div>
                <div className="text-gray-600">{format(new Date(log.timestamp), 'PPpp')}</div>
              </div>
              
              <User className="h-5 w-5 text-gray-400" />
              <div className="text-sm space-y-1">
                <div className="font-medium">Performed By</div>
                <div className="text-gray-600">
                  {log.user ? (
                    <>
                      <div>{log.user.name || 'Unnamed User'}</div>
                      <div className="text-xs text-gray-500">{log.user.email}</div>
                    </>
                  ) : (
                    'System'
                  )}
                </div>
              </div>
              
              <FileText className="h-5 w-5 text-gray-400" />
              <div className="text-sm space-y-1">
                <div className="font-medium">Target</div>
                <div className="text-gray-600 capitalize">
                  {log.target_type.replace(/_/g, ' ')} #{log.target_id}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-gray-500">Action Details</h3>
            {renderHumanReadableDetails()}
          </div>
          
          {/* Raw JSON for developers */}
          <Accordion type="single" collapsible className="pt-2">
            <AccordionItem value="raw-json" className="border-0">
              <AccordionTrigger className="py-2 text-xs text-gray-500 hover:text-gray-700 hover:no-underline">
                Show Raw JSON
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Main Component
export const TeamHistoryPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();

  // Use the non-null assertion as needed
  const orgID = orgId ?? user?.organization_id ?? '1';

  // State for pagination, sorting and filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    action: 'all',
    dateRange: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  
  // State for detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };
  
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Function to handle search input changes with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Debounce search to avoid too many re-renders
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: value
      }));
      setPage(1); // Reset to first page on new search
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  // Query to fetch audit logs
  const { 
    data: allLogs = [], 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['auditLogs', orgID, filters],
    queryFn: async () => {
      try {
        // In a real implementation, these filters would be passed to the API
        const data = await fetchAuditLogs(orgID);
        devLog(`Fetched ${data.length} audit logs for organization: ${orgID}`);
        return data;
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    retry: 2
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load audit logs', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        action: {
          label: 'Retry',
          onClick: () => refetch()
        }
      });
    }
  }, [error, refetch]);

  // Filter, sort and paginate logs
  const filteredLogs = React.useMemo(() => {
    let result = [...allLogs];

    // Apply filters
    if (filters.action && filters.action !== 'all') {
      result = result.filter(log => log.action === filters.action);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log => 
        (log.user?.name?.toLowerCase().includes(searchLower) || false) ||
        (log.user?.email?.toLowerCase().includes(searchLower) || false) ||
        log.action.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (filters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now);
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate = new Date(now);
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          cutoffDate = new Date(0); // Beginning of time
      }

      result = result.filter(log => new Date(log.timestamp) >= cutoffDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortField) {
        case 'timestamp':
          valueA = new Date(a.timestamp).getTime();
          valueB = new Date(b.timestamp).getTime();
          break;
        case 'action':
          valueA = a.action;
          valueB = b.action;
          break;
        case 'user':
          valueA = a.user?.name || a.user?.email || '';
          valueB = b.user?.name || b.user?.email || '';
          break;
        default:
          valueA = new Date(a.timestamp).getTime();
          valueB = new Date(b.timestamp).getTime();
      }

      const comparison = typeof valueA === 'string' 
        ? valueA.localeCompare(valueB as string) 
        : (valueA as number) - (valueB as number);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allLogs, filters, sortField, sortOrder]);

  // Calculate pagination
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // Function to handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if already sorting by this field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Function for refreshing data
  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing audit logs');
  };

  // Function for downloading logs (mock implementation)
  const handleDownload = () => {
    // In a real implementation, this would call an API endpoint
    // that returns a CSV or Excel file
    toast.success('Downloading audit logs', {
      description: 'Your download will begin shortly'
    });
    
    // Create a CSV from the filtered logs
    const headers = "ID,User,Action,Target,Date,Details\n";
    const csvContent = filteredLogs.map(log => {
      const user = log.user ? `${log.user.name || log.user.email}` : 'System';
      const date = new Date(log.timestamp).toISOString();
      const details = JSON.stringify(log.details).replace(/"/g, '""'); // Escape quotes for CSV
      
      return `${log.id},"${user}",${log.action},${log.target_type}-${log.target_id},"${date}","${details}"`;
    }).join('\n');
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">Team History</h1>
          <p className="text-enterprise-600 mt-1">
            Audit log of all team management activities
          </p>
        </div>
        <Link to={ROUTES.APP.TEAM.ROOT}>
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            type="search"
            placeholder="Search logs..."
            className="pl-8 bg-white"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <FilterSheet 
            filters={filters} 
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1); // Reset to first page on filter change
            }} 
          />
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            aria-label="Refresh audit logs"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownload}
            aria-label="Download audit logs"
            className="flex items-center gap-2"
          >
            <DownloadCloud className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Sorting Header */}
      {!isLoading && !isError && filteredLogs.length > 0 && (
        <div className="sticky top-0 z-10 grid grid-cols-4 gap-4 px-4 py-3 bg-white rounded-t-lg border-b text-sm font-medium text-gray-700 shadow-sm">
          <button 
            className="flex items-center justify-start hover:text-enterprise-700 transition-colors col-span-1"
            onClick={() => handleSort('timestamp')}
            aria-label="Sort by date"
          >
            Date/Time
            <span className={`ml-1 transition-opacity duration-200 ${sortField === 'timestamp' ? 'opacity-100' : 'opacity-30'}`}>
              {sortField === 'timestamp' && sortOrder === 'asc' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </span>
          </button>
          
          <button 
            className="flex items-center justify-start hover:text-enterprise-700 transition-colors col-span-1"
            onClick={() => handleSort('action')}
            aria-label="Sort by action"
          >
            Action
            <span className={`ml-1 transition-opacity duration-200 ${sortField === 'action' ? 'opacity-100' : 'opacity-30'}`}>
              {sortField === 'action' && sortOrder === 'asc' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </span>
          </button>
          
          <button 
            className="flex items-center justify-start hover:text-enterprise-700 transition-colors col-span-2"
            onClick={() => handleSort('user')}
            aria-label="Sort by user"
          >
            User
            <span className={`ml-1 transition-opacity duration-200 ${sortField === 'user' ? 'opacity-100' : 'opacity-30'}`}>
              {sortField === 'user' && sortOrder === 'asc' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <AuditLogSkeleton />}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="p-8 bg-white rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to load audit logs</h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mx-auto"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredLogs.length === 0 && (
        <EmptyState onRefresh={handleRefresh} />
      )}

      {/* Logs list */}
      {!isLoading && !isError && filteredLogs.length > 0 && (
        <div className="space-y-6 bg-gray-50 rounded-b-lg shadow">
          {groupLogsByDate(paginatedLogs).map(([dateGroup, logsInGroup]) => (
            <div key={dateGroup} className="space-y-2">
              <Accordion type="single" collapsible defaultValue={dateGroup}>
                <AccordionItem value={dateGroup} className="border-0">
                  <AccordionTrigger className="px-4 py-2 text-sm font-semibold text-gray-700 hover:no-underline bg-gray-100">
                    {dateGroup} ({logsInGroup.length} {logsInGroup.length === 1 ? 'entry' : 'entries'})
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0 px-0">
                    <div className="space-y-2">
                      {logsInGroup.map((log: AuditLogEntry) => (
                        <div 
                          key={log.id} 
                          className="mx-2 p-4 bg-white rounded-lg border border-gray-100 
                                   hover:border-gray-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 flex items-center text-sm text-gray-600">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span title={new Date(log.timestamp).toLocaleString()}>
                                {format(new Date(log.timestamp), 'h:mm a')}
                              </span>
                            </div>
                            
                            <div className="col-span-1">
                              <ActionBadge action={log.action} />
                            </div>
                            
                            <div className="col-span-2">
                              <div className="text-sm">
                                <span className="font-medium">
                                  {log.user ? (log.user.name || log.user.email) : 'System'}
                                </span>{' '}
                                {renderActionDescription(log)}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="mt-2 h-7 text-xs text-gray-500 hover:text-gray-700"
                          >
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 flex items-center justify-between border-t bg-white rounded-b-lg">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} entries
              </div>
              <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Details Drawer */}
      <DetailDrawer 
        log={selectedLog} 
        open={detailsOpen} 
        onClose={handleCloseDetails} 
      />
    </div>
  );
};

export default TeamHistoryPage; 