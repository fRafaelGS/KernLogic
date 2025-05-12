import React, { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import TimelineDot from './TimelineDot';
import { productService, ProductEvent } from '@/services/productService';
import { Badge } from '@/components/ui/badge';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ProductHistoryTabProps {
  productId: number;
}

// Helper function to format change keys for display
const formatKey = (key: string): string => {
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

// Helper to render changes
const ChangesView = ({ changes }: { changes: Record<string, { old: any; new: any }> }) => {
  return (
    <div className='space-y-2'>
      {Object.entries(changes).map(([name, change]) => {
        if (name === 'attributes' || name === 'primary_image' || !change) return null
        // Format attribute keys for display
        let label = name
        if (name.startsWith('attribute:')) {
          label = name.replace('attribute:', '')
        }
        return (
          <div key={name} className='flex items-center gap-2'>
            <span className='font-medium'>{label}</span>
            <span className='text-gray-500 line-through'>{change.old !== null && change.old !== undefined ? String(change.old) : 'None'}</span>
            <span className='text-green-600'>{change.new !== null && change.new !== undefined ? String(change.new) : 'None'}</span>
          </div>
        )
      })}
    </div>
  );
};

// Helper to render old data
const OldDataView = ({ data }: { data: Record<string, any> }) => {
  return (
    <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 mt-3">
      <div className="font-medium text-sm mb-2">Previous state</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <span className="text-xs text-slate-500">{formatKey(key)}</span>
            <div className="text-sm">{
              typeof value === 'boolean' 
                ? (value ? 'Yes' : 'No')
                : value === null || value === undefined || value === ''
                  ? <span className="text-slate-400 italic">None</span> 
                  : String(value)
            }</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper to render asset information
const AssetInfoView = ({ data }: { data: Record<string, any> }) => {
  return (
    <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <span className="text-xs text-slate-500">{formatKey(key)}</span>
            <div className="text-sm break-words">{
              typeof value === 'boolean' 
                ? (value ? 'Yes' : 'No')
                : value === null 
                  ? <span className="text-slate-400 italic">None</span> 
                  : String(value)
            }</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CHANGE_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'updated', label: 'Updated' },
  { value: 'created', label: 'Created' },
  { value: 'asset_added', label: 'Asset Added' }
]

function getEventTypeBadge(eventType: string) {
  const typeMap: Record<string, { color: string; label: string }> = {
    created: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Created' },
    updated: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Updated' },
    price_changed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Price Changed' },
    stock_changed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Stock Changed' },
    category_changed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Category Changed' },
    description_changed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Description Changed' },
    asset_added: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Asset Added' },
    asset_removed: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Asset Removed' },
    activated: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Activated' },
    deactivated: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', label: 'Deactivated' },
    deleted: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Deleted' },
  };
  
  const style = typeMap[eventType.toLowerCase()] || { color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', label: formatKey(eventType) };
  
  return (
    <Badge className={`font-normal ${style.color}`} variant="outline">
      {style.label}
    </Badge>
  );
}

// Render details based on event type and payload structure
function renderDetails(event: ProductEvent) {
  if (!event.payload) return null;
  
  // Check if this is a change event with "changes" property
  if ((event.payload as any).changes) {
    return (
      <div className="space-y-3">
        <ChangesView changes={(event.payload as any).changes} />
        {(event.payload as any).old_data && <OldDataView data={(event.payload as any).old_data} />}
      </div>
    );
  }
  
  // For asset events
  if (event.event_type === 'asset_added' || event.event_type === 'asset_removed') {
    return <AssetInfoView data={event.payload as any} />;
  }
  
  // Default JSON view for other payload types
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-md">
      <pre className="text-xs p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
        {JSON.stringify(event.payload, null, 2)}
      </pre>
    </div>
  );
}

function HistoryEventCard({ event }: { event: ProductEvent }) {
  return (
    <Card className='p-4 flex flex-col gap-2'>
      <div className='flex items-center gap-2 mb-1'>
        {getEventTypeBadge(event.event_type)}
        <span className='text-xs text-slate-500'>
          {event.created_by_name || 'System'}
        </span>
        <span className='text-xs text-slate-400 ml-auto'>
          {formatDistanceToNow(parseISO(event.created_at), { addSuffix: true })}
        </span>
      </div>
      {renderDetails(event)}
    </Card>
  )
}

// Add a debugging function to log the complete request details
const debugAPICall = (productId: number, page: number, filters: Record<string, any>) => {
  // Construct a sample URL to show what the API call will look like
  const baseUrl = `/api/products/${productId}/history/`;
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });
  
  const sampleUrl = `${baseUrl}?${queryParams.toString()}`;
  console.log('🔍 DEBUG - API Call URL would be:', sampleUrl);
  console.log('🔍 DEBUG - Full filters object:', filters);
}

const ProductHistoryTab: React.FC<ProductHistoryTabProps> = ({ productId }) => {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, next: true });
  const [loading, setLoading] = useState(true);
  const [changeType, setChangeType] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date, to: Date }>({ from: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), to: new Date() });
  const [tempDateRange, setTempDateRange] = useState<{from: Date, to: Date}>(dateRange);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [changedBy, setChangedBy] = useState('all');
  const [showAllAttributes, setShowAllAttributes] = useState<Record<string, boolean>>({});
  const [displayLimit, setDisplayLimit] = useState(10);
  const { toast } = useToast();

  // Remove hardcoded options and fetch event types from the backend
  // We'll track available event types from the API data
  const [eventTypeOptions, setEventTypeOptions] = useState<{value: string, label: string}[]>([
    { value: 'all', label: 'All' } // Only include "all" initially as it's not from the backend
  ]);

  const loadEvents = async (page = 1) => {
    if (!productId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching history for product ID: ${productId}, page: ${page}`);
      
      // Use parameter names exactly as expected by Django backend
      const filters: Record<string, any> = {
        page,
        page_size: 20
      };
      
      // Match event_type parameter in backend
      if (changeType !== 'all') {
        filters.event_type = changeType;
        console.log(`Filtering by event_type=${changeType}`);
      }
      
      // Match date_from parameter in backend
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().slice(0, 10);
        filters.date_from = fromDate; // This is what the backend expects
        console.log(`Filtering by date_from=${fromDate}`);
      }
      
      // Match date_to parameter in backend
      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().slice(0, 10);
        filters.date_to = toDate; // This is what the backend expects
        console.log(`Filtering by date_to=${toDate}`);
      }
      
      // Match created_by parameter in backend - handle ID 0 special case
      if (changedBy !== 'all') {
        if (changedBy === '0') {
          // For System user (ID 0), send null or undefined as created_by 
          // depending on what your backend expects
          filters.created_by = null;
          console.log(`Filtering by created_by=null (System user)`);
        } else {
          // For regular users, send their ID as before
          filters.created_by = Number(changedBy);
          console.log(`Filtering by created_by=${changedBy} (user)`);
        }
      }
      
      // Log the full params object for debugging
      console.log('Params for API call:', JSON.stringify(filters, null, 2));
      
      // Call the service with the filters
      const data = await productService.getProductHistory(productId, page, filters);
      console.log('Product history API response:', data);
      
      // Process the results
      const results = data && Array.isArray(data.results) ? data.results : [];
      console.log(`Found ${results.length} events`);
      
      // Update event type options if needed
      if (results.length > 0) {
        const eventTypes = results.map(r => r.event_type);
        const uniqueTypes = [...new Set(eventTypes)];
        console.log('Available event types from database:', uniqueTypes);
        
        // Update dropdown options based on actual event types
        const newOptions = [
          { value: 'all', label: 'All' },
          ...uniqueTypes.map(type => ({
            value: type,
            label: formatEventTypeLabel(type)
          }))
        ];
        
        if (newOptions.length > 1) {
          setEventTypeOptions(prev => {
            // Merge without duplicates
            const existing = new Set(prev.map(o => o.value));
            const toAdd = newOptions.filter(o => !existing.has(o.value));
            return [...prev, ...toAdd];
          });
        }
      }
      
      // Update state with new events
      setEvents(prev => page === 1 ? results : [...prev, ...results]);
      setPageInfo({ page, next: !!(data && data.next) });
    } catch (error) {
      console.error('Error loading product history:', error);
      toast({ 
        variant: "destructive", 
        title: "Could not load history",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to format event type labels from database values
  const formatEventTypeLabel = (eventType: string): string => {
    // Convert snake_case to Title Case
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Ensure filter changes trigger reload by separating the effect from initial load
  useEffect(() => {
    if (productId) {
      loadEvents(1);
    }
  }, [productId]); // Only run on productId changes

  // Add a separate effect specifically for filter changes
  useEffect(() => {
    if (productId) {
      console.log('Filter changed, reloading from page 1');
      // Reset to page 1 and clear existing events when filters change
      setPageInfo({ page: 1, next: true });
      setEvents([]);
      loadEvents(1);
    }
  }, [
    changeType, 
    changedBy, 
    // Use stringified versions of dates to ensure dependencies change properly
    dateRange.from?.toISOString().slice(0, 10), 
    dateRange.to?.toISOString().slice(0, 10)
  ]); // Explicit dependencies for all filters

  // Extract unique users for filter
  const users = useMemo(() => {
    const map = new Map<string, string>()
    
    // Debug the user data we're receiving
    console.log('Processing user data from events:', events.map(ev => ({
      id: ev.created_by,
      name: ev.created_by_name
    })));
    
    events.forEach(ev => {
      // Store as string keys for consistency
      // Skip if created_by is null/undefined, use special '0' key for System
      const userId = ev.created_by !== null && ev.created_by !== undefined 
        ? String(ev.created_by) 
        : '0';
        
      map.set(userId, ev.created_by_name || 'System')
    })
    
    const userOptions = Array.from(map.entries()).map(([id, name]) => ({
      value: id,
      label: name
    }));
    
    console.log('Extracted user options:', userOptions);
    return userOptions;
  }, [events]);

  // Group events by day
  const grouped = useMemo(() => {
    const groups: Record<string, ProductEvent[]> = {};
    events.forEach(ev => {
      const date = format(parseISO(ev.created_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(ev);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  const handleFilterChange = (filter: string, value: any) => {
    console.log(`Filter changed: ${filter} = `, value);
    // Reset page to 1 when filters change
    if (filter === 'changeType') {
      setChangeType(value);
      console.log(`Set event_type filter to: ${value}`);
    } else if (filter === 'changedBy') {
      setChangedBy(value);
      console.log(`Set created_by filter to: ${value} (${typeof value})`);
      
      // If we get a user ID of 0, we need to handle it specially as some backends
      // might need null or a special value for "System" actions
      if (value === '0') {
        console.log('This is a System user (ID 0), may need special backend handling');
      }
    } else if (filter === 'dateRange') {
      setDateRange({ 
        from: value?.from || dateRange.from, 
        to: value?.to || dateRange.to 
      });
      console.log(`Set date range filters to:`, {
        date_from: value?.from?.toISOString().slice(0, 10),
        date_to: value?.to?.toISOString().slice(0, 10)
      });
    }
    // Filters have changed, so we should reset page info
    setPageInfo({ page: 1, next: true });
    setEvents([]);
  };

  // Improve the resetAllFilters function to work on first click
  const resetAllFilters = () => {
    console.log('Resetting all filters to defaults');
    
    // Define default date range
    const defaultDateRange = { 
      from: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 
      to: new Date() 
    };
    
    // Update all the filter states
    setChangeType('all');
    setDateRange(defaultDateRange);
    setTempDateRange(defaultDateRange);
    setChangedBy('all');
    
    // Show loading state
    setLoading(true);
    
    // Reset the events list and pagination
    setEvents([]);
    setPageInfo({ page: 1, next: true });
    
    // Call the API directly with default filters instead of waiting for state updates
    console.log('Calling API with default filters');
    
    // Build minimal default filters
    const defaultFilters = {
      page: 1,
      page_size: 20
    };
    
    // Call the API immediately with default filters
    productService.getProductHistory(productId, 1, defaultFilters)
      .then(data => {
        console.log('Reset filters API response:', data);
        const results = data && Array.isArray(data.results) ? data.results : [];
        console.log(`Reset found ${results.length} events`);
        setEvents(results);
        setPageInfo({ page: 1, next: !!(data && data.next) });
        setLoading(false);
      })
      .catch(error => {
        console.error('Error resetting filters:', error);
        toast({ 
          variant: "destructive", 
          title: "Could not reset filters",
          description: "Please try again later."
        });
        setLoading(false);
      });
  };

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar - Always visible */}
      <div className="flex flex-wrap gap-4 items-end mb-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-medium mb-1">Change Type</label>
          <Select value={changeType} onValueChange={(value) => handleFilterChange('changeType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select change type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Date Range</label>
          <Popover open={pickerOpen} onOpenChange={open => {
            // Just manage the popover open state
            setPickerOpen(open);
          }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] text-left justify-start">
                {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-auto p-0">
              <DatePickerWithRange
                date={{ from: tempDateRange.from, to: tempDateRange.to }}
                setDate={(d) => setTempDateRange({ 
                  from: d?.from || tempDateRange.from, 
                  to: d?.to || tempDateRange.to 
                })}
              />
              <div className="flex justify-end p-2">
                <Button size="sm" onClick={() => {
                  console.log('Apply button clicked!');
                  console.log('Setting date range from temp:', tempDateRange);
                  
                  // Update the date range state
                  setDateRange(tempDateRange);
                  
                  // Close the popover
                  setPickerOpen(false);
                  
                  // Force a reload with the explicitly built filters
                  console.log('Building filters for API call...');
                  
                  const filters: Record<string, any> = { 
                    page: 1, 
                    page_size: 20 
                  };
                  
                  // Add all filters
                  if (changeType !== 'all') {
                    filters.event_type = changeType;
                  }
                  
                  if (tempDateRange.from) {
                    const fromDate = tempDateRange.from.toISOString().slice(0, 10);
                    filters.date_from = fromDate;
                    console.log(`Setting date_from filter: ${fromDate}`);
                  }
                  
                  if (tempDateRange.to) {
                    const toDate = tempDateRange.to.toISOString().slice(0, 10);
                    filters.date_to = toDate;
                    console.log(`Setting date_to filter: ${toDate}`);
                  }
                  
                  // Use the same user handling logic as in loadEvents
                  if (changedBy !== 'all') {
                    if (changedBy === '0') {
                      // For System user (ID 0), send null
                      filters.created_by = null;
                      console.log(`Filtering by created_by=null (System user)`);
                    } else {
                      // For regular users, send their numeric ID
                      filters.created_by = Number(changedBy);
                      console.log(`Filtering by created_by=${changedBy} (user)`);
                    }
                  }
                  
                  // Reset the view
                  setEvents([]);
                  setPageInfo({ page: 1, next: true });
                  
                  // Call the API with explicit filters
                  console.log('Calling API with filters:', filters);
                  productService.getProductHistory(productId, 1, filters)
                    .then(data => {
                      console.log('Product history API response:', data);
                      const results = data && Array.isArray(data.results) ? data.results : [];
                      console.log(`Found ${results.length} events with date filters`);
                      setEvents(results);
                      setPageInfo({ page: 1, next: !!(data && data.next) });
                      setLoading(false);
                    })
                    .catch(error => {
                      console.error('Error loading product history:', error);
                      toast({ 
                        variant: "destructive", 
                        title: "Could not load history",
                        description: "Please try again later."
                      });
                      setLoading(false);
                    });
                }}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Changed by</label>
          <Select value={changedBy} onValueChange={(value) => handleFilterChange('changedBy', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">All</SelectItem>
              {users.map(u => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto self-end flex gap-2">
          <Button 
            variant="outline" 
            onClick={resetAllFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading && events.length === 0 ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-slate-100 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-1">No matching events found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filter criteria or 
                <Button onClick={resetAllFilters} variant="link" className="px-1 h-auto">
                  reset all filters
                </Button>
                to see more results.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <ol role="feed" className="space-y-10">
          {grouped.slice(0, displayLimit).map(([date, groupEvents]) => {
            // Group attribute_updated events
            const attrEvents = groupEvents.filter(ev => ev.event_type === 'attribute_updated');
            const otherEvents = groupEvents.filter(ev => ev.event_type !== 'attribute_updated');
            const showAll = showAllAttributes[date];
            const attrToShow = showAll ? attrEvents : attrEvents.slice(0, 10);
            return (
              <li key={date}>
                <div className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-200">
                  {isToday(parseISO(date)) ? 'Today' : isYesterday(parseISO(date)) ? 'Yesterday' : format(parseISO(date), 'MMMM d, yyyy')}
                </div>
                <ol className="space-y-6">
                  {otherEvents.map(ev => <HistoryEventCard key={ev.id} event={ev} />)}
                  {attrToShow.map(ev => <HistoryEventCard key={ev.id} event={ev} />)}
                  {attrEvents.length > 10 && !showAll && (
                    <Button variant="ghost" className="mt-2" onClick={() => setShowAllAttributes(s => ({ ...s, [date]: true }))}>
                      Show more attributes ({attrEvents.length - 10} more)
                    </Button>
                  )}
                </ol>
              </li>
            );
          })}
        </ol>
      )}

      {/* View More Button and Pagination - Only show when there are events */}
      {events.length > 0 && (
        <div className="flex justify-center gap-4">
          {grouped.length > displayLimit && (
            <Button 
              variant="outline" 
              onClick={() => setDisplayLimit(prev => prev + 10)}
            >
              View more days
            </Button>
          )}
          
          {pageInfo.next && (
            <Button 
              variant="outline" 
              onClick={() => loadEvents(pageInfo.page + 1)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more from server'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductHistoryTab; 