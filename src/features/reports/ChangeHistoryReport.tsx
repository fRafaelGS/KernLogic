import React, { useState, useCallback, useEffect, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter } from "lucide-react";
import { debounce } from 'lodash';
import { Sheet, SheetContent, SheetTrigger, SheetOverlay } from "@/components/ui/sheet";
import { DateRange } from "react-day-picker";

// Define types
interface ChangeHistoryItem {
  id: number;
  date: string;
  username: string;
  entity_type: string;
  entity_id: number;
  action: string;
  details: string;
}

// Helper to serialize date range
const serializeDateRange = (dateRange: DateRange | undefined) => ({
  from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
  to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
});

// Format entity type for display - moved up to avoid reference error
const formatEntityType = (type: string, action: string, id: number) => {
  let entityType = type;
  if (type === 'attribute_value') entityType = 'Attribute';
  else entityType = type.charAt(0).toUpperCase() + type.slice(1);
  
  // Return the action and ID without hashtag
  return `${action.charAt(0).toUpperCase() + action.slice(1)} ${id}`;
};

// Helper: map action to color class
function getActionColor(action: string) {
  switch (action) {
    case 'create':
      return 'bg-green-500 text-white'
    case 'update':
      return 'bg-blue-500 text-white'
    case 'delete':
      return 'bg-red-500 text-white'
    case 'archive':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-purple-500 text-white'
  }
}

// Memoized FiltersPanel
const FiltersPanel = memo(function FiltersPanel({
  showTitle = true,
  dateRange,
  setDateRange,
  userOptions,
  selectedUsers,
  handleUserToggle,
  entityInput,
  handleEntityInputChange,
  entityOptions,
  setEntityQuery,
  setEntityInput,
  actionTypeOptions,
  selectedActions,
  handleActionToggle,
  resetFilters
}: {
  showTitle?: boolean
  dateRange: any
  setDateRange: any
  userOptions: string[]
  selectedUsers: string[]
  handleUserToggle: (username: string) => void
  entityInput: string
  handleEntityInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  entityOptions: string[]
  setEntityQuery: (v: string) => void
  setEntityInput: (v: string) => void
  actionTypeOptions: { label: string, value: string }[]
  selectedActions: string[]
  handleActionToggle: (action: string) => void
  resetFilters: () => void
}) {
  return (
    <div className='space-y-6'>
      {showTitle && <h3 className='text-md font-medium mb-4'>Filters</h3>}
      <div className='space-y-1'>
        <Label className='block text-sm font-semibold uppercase'>Date Range</Label>
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>
      <div className='space-y-1'>
        <Label className='block text-sm font-semibold uppercase'>User</Label>
        <div className='space-y-2 border p-3 rounded-md max-h-40 overflow-y-auto'>
          {userOptions.length > 0 ? (
            userOptions.map(username => (
              <div key={username} className='flex items-center space-x-2 py-1'>
                <Checkbox
                  id={`user-${username}`}
                  checked={selectedUsers.includes(username)}
                  onCheckedChange={() => handleUserToggle(username)}
                />
                <Label htmlFor={`user-${username}`} className='text-sm font-normal cursor-pointer'>
                  {username}
                </Label>
              </div>
            ))
          ) : (
            <div className='text-sm text-gray-500 py-2'>No users available</div>
          )}
        </div>
      </div>
      <div className='space-y-1'>
        <Label className='block text-sm font-semibold uppercase'>Entity</Label>
        <Input
          placeholder='Search entity...'
          onChange={handleEntityInputChange}
          value={entityInput}
          className='w-full'
        />
        {entityInput && entityOptions.length > 0 && (
          <div className='text-sm mt-1 border p-2 rounded-md max-h-32 overflow-y-auto'>
            {entityOptions
              .filter(option => option.toLowerCase().includes(entityInput.toLowerCase()))
              .slice(0, 5)
              .map((option, index) => (
                <div
                  key={index}
                  className='cursor-pointer hover:bg-gray-100 p-1 rounded'
                  onClick={() => { setEntityQuery(option); setEntityInput(option) }}
                >
                  {option}
                </div>
              ))}
          </div>
        )}
      </div>
      <div className='space-y-1'>
        <Label className='block text-sm font-semibold uppercase'>Action</Label>
        <div className='space-y-2 border p-3 rounded-md'>
          {actionTypeOptions.map(action => (
            <div key={action.value} className='flex items-center space-x-2 py-1'>
              <Checkbox
                id={`action-${action.value}`}
                checked={selectedActions.includes(action.value)}
                onCheckedChange={() => handleActionToggle(action.value)}
              />
              <Label htmlFor={`action-${action.value}`} className='text-sm font-normal cursor-pointer'>
                {action.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className='flex space-x-2 pt-2'>
        <Button variant='outline' onClick={resetFilters}>Reset</Button>
      </div>
    </div>
  )
})

export function ChangeHistoryReport() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [entityQuery, setEntityQuery] = useState<string>('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [entityInput, setEntityInput] = useState('')

  // Query key includes only backend-supported filters
  const queryKey = ['changeHistory', dateRange, selectedUsers];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => axiosInstance.get<ChangeHistoryItem[]>(
      paths.analytics.changeHistory({
        ...serializeDateRange(dateRange),
        users: selectedUsers,
      })
    ).then(res => res.data),
  });

  // User options from data
  const userOptions = data ? Array.from(new Set(data.map(item => item.username))).sort() : [];

  // Entity options from data
  const entityOptions = data ? Array.from(
    new Set(data.map(item => formatEntityType(item.entity_type, item.action, item.entity_id)))
  ).sort() : [];

  // Action counts for summary and checkboxes
  const getActionCounts = () => {
    if (!data || data.length === 0) return {};
    
    const actionCounts: Record<string, number> = {};
    data.forEach(item => {
      actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
    });
    return actionCounts;
  };
  const actionCounts = getActionCounts();
  const actionTypeOptions = Object.keys(actionCounts).length > 0
    ? Object.keys(actionCounts).map(action => ({
        label: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: action
      }))
    : [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Archive', value: 'archive' },
      ];

  // Helper to format date and time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Color-coded action badge
  const getActionBadge = (action: string) => {
    return (
      <Badge className={getActionColor(action)}>
        {action === 'create' && 'Created'}
        {action === 'update' && 'Updated'}
        {action === 'delete' && 'Deleted'}
        {action === 'archive' && 'Archived'}
        {!(action === 'create' || action === 'update' || action === 'delete' || action === 'archive') &&
          action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  };

  // Handle user selection
  const handleUserToggle = (username: string) => {
    setSelectedUsers(current => {
      if (current.includes(username)) {
        return current.filter(u => u !== username);
      } else {
        return [...current, username];
      }
    });
  };

  // Handle action selection
  const handleActionToggle = (action: string) => {
    setSelectedActions(current => {
      if (current.includes(action)) {
        return current.filter(a => a !== action);
      } else {
        return [...current, action];
      }
    });
  };

  // Reset all filters and invalidate query
  const resetFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedUsers([]);
    setEntityQuery('');
    setSelectedActions([]);
    setPage(1);
    
    // Force a data refresh
    queryClient.invalidateQueries({ queryKey: ['changeHistory'] });
  };

  // Debounced update for entityQuery (used in query key)
  const debouncedSetEntityQuery = useCallback(
    debounce((value: string) => {
      setEntityQuery(value)
    }, 400),
    []
  )
  function handleEntityInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEntityInput(e.target.value)
    debouncedSetEntityQuery(e.target.value)
  }
  // Keep entityInput in sync with entityQuery on clear
  useEffect(() => {
    if (!entityQuery) setEntityInput('')
  }, [entityQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [dateRange, selectedUsers, entityQuery, selectedActions]);

  // Pagination settings
  const itemsPerPage = 10;
  // Local filtering for action/entity
  let filteredData = data || [];
  if (selectedActions.length > 0) {
    filteredData = filteredData.filter(item => selectedActions.includes(item.action));
  }
  if (entityQuery) {
    filteredData = filteredData.filter(item =>
      formatEntityType(item.entity_type, item.action, item.entity_id).toLowerCase().includes(entityQuery.toLowerCase())
    );
  }
  const totalPages = filteredData.length ? Math.ceil(filteredData.length / itemsPerPage) : 0;
  const currentItems = filteredData
    ? filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : [];

  // Filter chips
  function FilterChips() {
    if (!dateRange.from && !dateRange.to && selectedUsers.length === 0 && !entityQuery && selectedActions.length === 0) {
      return null
    }
    // Debug: log selectedActions and color
    console.log('selectedActions:', selectedActions)
    selectedActions.forEach(a => console.log('chip color for', a, getActionColor(a)))
    return (
      <div className='flex flex-wrap gap-2 mb-4'>
        {dateRange.from && (
          <Badge variant='outline' className='flex items-center gap-1 border-blue-500 text-blue-700'>
            From: {format(dateRange.from, 'PP')}
            <button onClick={() => setDateRange({ ...dateRange, from: undefined })} className='hover:bg-gray-200 rounded-full ml-1 p-0.5'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        )}
        {dateRange.to && (
          <Badge variant='outline' className='flex items-center gap-1 border-blue-500 text-blue-700'>
            To: {format(dateRange.to, 'PP')}
            <button onClick={() => setDateRange({ ...dateRange, to: undefined })} className='hover:bg-gray-200 rounded-full ml-1 p-0.5'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        )}
        {selectedUsers.map(user => (
          <Badge key={user} variant='outline' className='flex items-center gap-1 border-gray-500 text-gray-700'>
            User: {user}
            <button onClick={() => handleUserToggle(user)} className='hover:bg-gray-200 rounded-full ml-1 p-0.5'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        ))}
        {entityQuery && (
          <Badge variant='outline' className='flex items-center gap-1 border-purple-500 text-purple-700'>
            Entity: {entityQuery}
            <button onClick={() => { setEntityQuery(''); setEntityInput('') }} className='hover:bg-gray-200 rounded-full ml-1 p-0.5'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        )}
        {selectedActions.map(action => (
          <Badge key={action} className={`flex items-center gap-1 ${getActionColor(action)}`}>
            Action: {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            <button onClick={() => handleActionToggle(action)} className='hover:bg-gray-200 rounded-full ml-1 p-0.5 text-inherit'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        ))}
        {(dateRange.from || dateRange.to || selectedUsers.length > 0 || entityQuery || selectedActions.length > 0) && (
          <Button variant='ghost' size='sm' onClick={resetFilters} className='text-gray-500'>
            Clear All
          </Button>
        )}
      </div>
    )
  }

  // Action summary badges
  const ActionSummaryBadges = () => {
    if (Object.keys(actionCounts).length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(actionCounts).map(([action, count]) => (
          <Badge key={action} variant="outline" className="flex items-center gap-1">
            {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {count}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-lg font-medium">Change History / Audit Log</h2>
        <div className="md:hidden">
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetOverlay />
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="pt-6">
                <FiltersPanel
                  showTitle={true}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  userOptions={userOptions}
                  selectedUsers={selectedUsers}
                  handleUserToggle={handleUserToggle}
                  entityInput={entityInput}
                  handleEntityInputChange={handleEntityInputChange}
                  entityOptions={entityOptions}
                  setEntityQuery={setEntityQuery}
                  setEntityInput={setEntityInput}
                  actionTypeOptions={actionTypeOptions}
                  selectedActions={selectedActions}
                  handleActionToggle={handleActionToggle}
                  resetFilters={resetFilters}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main area */}
        <div className="flex-1 space-y-6">
          <ActionSummaryBadges />
          <FilterChips />

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 border rounded">
              Error loading change history data. Please try again later.
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  {dateRange.from && dateRange.to 
                    ? `Changes from ${format(dateRange.from, 'PP')} to ${format(dateRange.to, 'PP')}`
                    : 'Recent changes to products and attributes'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length > 0 ? currentItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(item.date)}</TableCell>
                        <TableCell>{item.username}</TableCell>
                        <TableCell>
                          {formatEntityType(item.entity_type, item.action, item.entity_id)}
                        </TableCell>
                        <TableCell>{getActionBadge(item.action)}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.details}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No change history records found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Show pages around current page
                          const pageNum = page <= 3 
                            ? i + 1 
                            : page >= totalPages - 2 
                              ? totalPages - 4 + i
                              : page - 2 + i;
                              
                          if (pageNum > 0 && pageNum <= totalPages) {
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink 
                                  onClick={() => setPage(pageNum)}
                                  isActive={page === pageNum}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                            className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters panel - desktop only */}
        <aside className="hidden md:block w-64 sticky top-6 h-fit space-y-4 p-4 bg-white border rounded shadow">
          <FiltersPanel
            showTitle={true}
            dateRange={dateRange}
            setDateRange={setDateRange}
            userOptions={userOptions}
            selectedUsers={selectedUsers}
            handleUserToggle={handleUserToggle}
            entityInput={entityInput}
            handleEntityInputChange={handleEntityInputChange}
            entityOptions={entityOptions}
            setEntityQuery={setEntityQuery}
            setEntityInput={setEntityInput}
            actionTypeOptions={actionTypeOptions}
            selectedActions={selectedActions}
            handleActionToggle={handleActionToggle}
            resetFilters={resetFilters}
          />
        </aside>
      </div>
    </div>
  );
}

export default ChangeHistoryReport; 