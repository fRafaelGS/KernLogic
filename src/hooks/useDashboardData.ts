import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardSummary, InventoryTrend, Activity, IncompleteProduct } from '@/services/dashboardService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Define cache types
interface DashboardCache {
  summary?: {
    data: DashboardSummary;
    timestamp: number;
    organizationId?: string; // Add organization ID to cache key
  };
  inventoryTrend?: {
    data: InventoryTrend;
    timestamp: number;
    range: number;
    organizationId?: string; // Add organization ID to cache key
  };
  activity?: {
    data: Activity[];
    timestamp: number;
    organizationId?: string; // Add organization ID to cache key
  };
  incompleteProducts?: {
    data: IncompleteProduct[];
    timestamp: number;
    organizationId?: string; // Add organization ID to cache key
  };
}

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30 * 1000;

// Initialize cache
const cache: DashboardCache = {};

/**
 * Custom hook for fetching dashboard data with caching
 */
export function useDashboardData() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [inventoryTrend, setInventoryTrend] = useState<InventoryTrend | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [incompleteProducts, setIncompleteProducts] = useState<IncompleteProduct[] | null>(null);
  const [loading, setLoading] = useState({
    summary: false,
    inventoryTrend: false,
    activity: false,
    incompleteProducts: false
  });
  const [error, setError] = useState({
    summary: null as Error | null,
    inventoryTrend: null as Error | null,
    activity: null as Error | null,
    incompleteProducts: null as Error | null
  });

  /**
   * Check if cache is valid with organization ID match
   * @param cacheEntry Cache entry with timestamp and organizationId
   * @returns Whether cache is valid
   */
  const isCacheValid = <T extends {}>(
    cacheEntry?: { data: T; timestamp: number; organizationId?: string }
  ): boolean => {
    if (!cacheEntry) return false;
    
    // Check if cache is still fresh
    const isFresh = Date.now() - cacheEntry.timestamp < CACHE_TTL;
    
    // Check if organization ID matches (or there's no organization ID in both cases)
    const isOrgMatch = cacheEntry.organizationId === organizationId;
    
    return isFresh && isOrgMatch;
  };

  /**
   * Update cache
   * @param key Cache key
   * @param data Data to cache
   * @param params Additional parameters
   */
  const updateCache = <T extends {}>(
    key: keyof DashboardCache, 
    data: T, 
    params?: Record<string, any>
  ) => {
    cache[key] = {
      data,
      timestamp: Date.now(),
      organizationId, // Store current organization ID with cache
      ...params
    } as any;
  };

  /**
   * Fetch dashboard summary
   */
  const fetchSummary = useCallback(async (force = false) => {
    // Skip if no organization ID is available
    if (!organizationId) {
      console.log('Cannot fetch dashboard summary: No organization ID available');
      const emptyData = {
        total_products: 0,
        inventory_value: 0,
        inactive_product_count: 0, 
        team_members: 0,
        data_completeness: 0,
        most_missing_fields: [],
        active_products: 0,
        inactive_products: 0
      };
      setSummary(emptyData);
      return;
    }
    
    // Return cached data if valid
    if (!force && isCacheValid(cache.summary)) {
      console.log('Using cached dashboard summary data:', cache.summary!.data);
      setSummary(cache.summary!.data);
      return;
    }

    setLoading(prev => ({ ...prev, summary: true }));
    setError(prev => ({ ...prev, summary: null }));

    try {
      console.log('Fetching dashboard summary data for organization:', organizationId);
      const data = await dashboardService.getDashboardSummary(organizationId);
      console.log('Dashboard summary data received:', data);
      
      // Check that data meets expected structure
      if (data && typeof data === 'object') {
        console.log('Dashboard data structure looks valid, setting state');
        setSummary(data);
        updateCache('summary', data);
      } else {
        console.error('Invalid dashboard data format received:', data);
        throw new Error('Invalid data format received from API');
      }
    } catch (err: any) {
      console.error('Dashboard summary error:', err);
      // Don't logout on dashboard API failures
      if (err.response?.status === 401) {
        console.log('Authentication issue with dashboard summary. Using empty data.');
        // Use empty data instead of failing completely
        const emptyData = {
          total_products: 0,
          inventory_value: 0,
          inactive_product_count: 0, 
          team_members: 0,
          data_completeness: 0,
          most_missing_fields: [],
          active_products: 0,
          inactive_products: 0
        };
        setSummary(emptyData);
      } else {
        setError(prev => ({ ...prev, summary: err }));
        toast.error('Failed to load dashboard summary');
      }
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [organizationId]);

  /**
   * Fetch inventory trend
   */
  const fetchInventoryTrend = useCallback(async (range: 30 | 60 | 90 = 30, force = false) => {
    // Skip if no organization ID is available
    if (!organizationId) {
      console.log('Cannot fetch inventory trend: No organization ID available');
      const emptyData = {
        dates: [],
        values: []
      };
      setInventoryTrend(emptyData);
      return;
    }
    
    // Return cached data if valid and range matches
    if (
      !force && 
      isCacheValid(cache.inventoryTrend) && 
      cache.inventoryTrend!.range === range
    ) {
      setInventoryTrend(cache.inventoryTrend!.data);
      return;
    }

    setLoading(prev => ({ ...prev, inventoryTrend: true }));
    setError(prev => ({ ...prev, inventoryTrend: null }));

    try {
      const data = await dashboardService.getInventoryTrend(range, organizationId);
      setInventoryTrend(data);
      updateCache('inventoryTrend', data, { range });
    } catch (err: any) {
      console.error('Inventory trend error:', err);
      // Don't logout on dashboard API failures
      if (err.response?.status === 401) {
        console.log('Authentication issue with inventory trend. Using empty data.');
        // Use empty data instead of failing
        const emptyData = {
          dates: [],
          values: []
        };
        setInventoryTrend(emptyData);
      } else {
        setError(prev => ({ ...prev, inventoryTrend: err }));
        toast.error('Failed to load inventory trend');
      }
    } finally {
      setLoading(prev => ({ ...prev, inventoryTrend: false }));
    }
  }, [organizationId]);

  /**
   * Fetch recent activity
   */
  const fetchActivity = useCallback(async (force = false) => {
    // Skip if no organization ID is available
    if (!organizationId) {
      console.log('Cannot fetch activity: No organization ID available');
      setActivity([]);
      return;
    }
    
    // Return cached data if valid
    if (!force && isCacheValid(cache.activity)) {
      setActivity(cache.activity!.data);
      return;
    }

    setLoading(prev => ({ ...prev, activity: true }));
    setError(prev => ({ ...prev, activity: null }));

    try {
      const data = await dashboardService.getRecentActivity(organizationId);
      
      // Add validation check for activity data
      if (!Array.isArray(data)) {
        console.error('API Error: getRecentActivity did not return an array. Received:', typeof data, data);
        setActivity([]); // Set to empty array to prevent crash
      } else {
        setActivity(data);
        updateCache('activity', data);
      }
    } catch (err: any) {
      console.error('Activity error:', err);
      // Don't logout on dashboard API failures
      if (err.response?.status === 401) {
        console.log('Authentication issue with activity. Using empty data.');
        setActivity([]);
      } else {
        setError(prev => ({ ...prev, activity: err }));
        toast.error('Failed to load recent activity');
      }
    } finally {
      setLoading(prev => ({ ...prev, activity: false }));
    }
  }, [organizationId]);

  /**
   * Fetch incomplete products
   */
  const fetchIncompleteProducts = useCallback(async (force = false) => {
    // Skip if no organization ID is available
    if (!organizationId) {
      console.log('Cannot fetch incomplete products: No organization ID available');
      setIncompleteProducts([]);
      return;
    }
    
    // Return cached data if valid
    if (!force && isCacheValid(cache.incompleteProducts)) {
      setIncompleteProducts(cache.incompleteProducts!.data);
      return;
    }

    setLoading(prev => ({ ...prev, incompleteProducts: true }));
    setError(prev => ({ ...prev, incompleteProducts: null }));

    try {
      const data = await dashboardService.getIncompleteProducts(organizationId);

      // Add validation check here
      if (!Array.isArray(data)) {
        console.error('API Error: getIncompleteProducts did not return an array. Received:', typeof data, data);
        setIncompleteProducts([]); // Set to empty array to prevent crash
      } else {
        setIncompleteProducts(data);
        updateCache('incompleteProducts', data);
      }

    } catch (err: any) {
      console.error('Incomplete products error:', err);
      // Don't logout on dashboard API failures
      if (err.response?.status === 401) {
        console.log('Authentication issue with incomplete products. Using empty data.');
        setIncompleteProducts([]);
      } else {
        setError(prev => ({ ...prev, incompleteProducts: err }));
        toast.error('Failed to load incomplete products');
      }
    } finally {
      setLoading(prev => ({ ...prev, incompleteProducts: false }));
    }
  }, [organizationId]);

  /**
   * Fetch all dashboard data
   */
  const fetchAll = useCallback(async (force = false) => {
    await Promise.all([
      fetchSummary(force),
      fetchInventoryTrend(30, force),
      fetchActivity(force),
      fetchIncompleteProducts(force)
    ]);
  }, [fetchSummary, fetchInventoryTrend, fetchActivity, fetchIncompleteProducts]);

  /**
   * Invalidate all cache
   */
  const invalidateCache = useCallback(() => {
    // Clear cache
    Object.keys(cache).forEach(key => {
      delete cache[key as keyof DashboardCache];
    });
  }, []);

  // Set up message listener for cache invalidation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'dashboard-invalidate') {
        invalidateCache();
        fetchAll(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [invalidateCache, fetchAll]);

  // Return hook data and functions
  return {
    data: {
      summary,
      inventoryTrend,
      activity,
      incompleteProducts
    },
    loading,
    error,
    fetchSummary,
    fetchInventoryTrend,
    fetchActivity,
    fetchIncompleteProducts,
    fetchAll,
    invalidateCache
  };
} 