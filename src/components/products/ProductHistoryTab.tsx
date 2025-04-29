import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import TimelineDot from './TimelineDot';
import { productService, ProductEvent } from '@/services/productService';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-3">
      {Object.entries(changes).map(([key, change]) => (
        <div key={key} className="rounded-md bg-slate-50 dark:bg-slate-900 p-3">
          <div className="font-medium text-sm mb-1">{formatKey(key)}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-md">
              <div className="text-xs text-red-500 dark:text-red-400 mb-1 font-medium">Old value</div>
              <div className="text-sm break-words">{
                typeof change.old === 'boolean' 
                  ? (change.old ? 'Yes' : 'No')
                  : change.old === null 
                    ? <span className="text-slate-400 italic">None</span> 
                    : String(change.old)
              }</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
              <div className="text-xs text-green-500 dark:text-green-400 mb-1 font-medium">New value</div>
              <div className="text-sm break-words">{
                typeof change.new === 'boolean' 
                  ? (change.new ? 'Yes' : 'No')
                  : change.new === null 
                    ? <span className="text-slate-400 italic">None</span> 
                    : String(change.new)
              }</div>
            </div>
          </div>
        </div>
      ))}
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

const ProductHistoryTab: React.FC<ProductHistoryTabProps> = ({ productId }) => {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, next: true });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadEvents = async (page = 1) => {
    if (!productId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching history for product ID: ${productId}, page: ${page}`);
      const data = await productService.getProductHistory(productId, page);
      console.log('Product history API response:', data);
      
      // Check if data and data.results exist before using them
      const results = data && Array.isArray(data.results) ? data.results : [];
      console.log(`Found ${results.length} events`);
      
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

  // Load initial data when component mounts or productId changes
  useEffect(() => {
    if (productId) {
      loadEvents(1);
    }
  }, [productId]);

  // Render details based on event type and payload structure
  const renderDetails = (event: ProductEvent) => {
    if (!event.payload) return null;
    
    // Check if this is a change event with "changes" property
    if (event.payload.changes) {
      return (
        <div className="space-y-3">
          <ChangesView changes={event.payload.changes} />
          {event.payload.old_data && <OldDataView data={event.payload.old_data} />}
        </div>
      );
    }
    
    // For asset events
    if (event.event_type === 'asset_added' || event.event_type === 'asset_removed') {
      return <AssetInfoView data={event.payload} />;
    }
    
    // Default JSON view for other payload types
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-md">
        <pre className="text-xs p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    );
  };
  
  // Get event description badge
  const getEventTypeBadge = (eventType: string) => {
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

  if (events.length === 0 && !loading) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No history events found for this product.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ol role="feed" className="space-y-6">
        {events.map(event => (
          <li key={event.id} role="article">
            <Card className="overflow-hidden border-slate-200">
              <div className="flex items-start gap-4 p-4">
                <TimelineDot type={event.event_type} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium">{event.summary}</p>
                    {getEventTypeBadge(event.event_type)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })} • {event.created_by_name || 'System'}
                  </p>
                </div>
              </div>
              
              {event.payload && Object.keys(event.payload).length > 0 && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="details" className="border-t border-slate-200">
                    <AccordionTrigger className="text-sm px-4 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-900">
                      View Details
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-1">
                      {renderDetails(event)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </Card>
          </li>
        ))}
      </ol>

      {pageInfo.next && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => loadEvents(pageInfo.page + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductHistoryTab; 