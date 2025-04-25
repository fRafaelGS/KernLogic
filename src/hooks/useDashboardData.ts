import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardSummary, InventoryTrend, Activity, IncompleteProduct } from '@/services/dashboardService';
import { toast } from 'sonner';

// Define cache types
interface DashboardCache {
  summary?: {
    data: DashboardSummary;
    timestamp: number;
  };
  inventoryTrend?: {
    data: InventoryTrend;
    timestamp: number;
    range: number;
  };
  activity?: {
    data: Activity[];
    timestamp: number;
  };
  incompleteProducts?: {
    data: IncompleteProduct[];
    timestamp: number;
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
   * Check if cache is valid
   * @param cacheEntry Cache entry with timestamp
   * @returns Whether cache is valid
   */
  const isCacheValid = <T extends {}>(cacheEntry?: { data: T; timestamp: number }): boolean => {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < CACHE_TTL;
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
      ...params
    } as any;
  };

  /**
   * Fetch dashboard summary
   */
  const fetchSummary = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(cache.summary)) {
      setSummary(cache.summary!.data);
      return;
    }

    setLoading(prev => ({ ...prev, summary: true }));
    setError(prev => ({ ...prev, summary: null }));

    try {
      const data = await dashboardService.getDashboardSummary();
      setSummary(data);
      updateCache('summary', data);
    } catch (err: any) {
      console.error('Dashboard summary error:', err);
      // Don't logout on dashboard API failures
      if (err.response?.status === 401) {
        console.log('Authentication issue with dashboard summary. Using empty data.');
        // Use empty data instead of failing completely
        const emptyData = {
          total_products: 0,
          inventory_value: 0,
          low_stock_count: 0, 
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
  }, []);

  /**
   * Fetch inventory trend
   */
  const fetchInventoryTrend = useCallback(async (range: 30 | 60 | 90 = 30, force = false) => {
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
      const data = await dashboardService.getInventoryTrend(range);
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
  }, []);

  /**
   * Fetch recent activity
   */
  const fetchActivity = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(cache.activity)) {
      setActivity(cache.activity!.data);
      return;
    }

    setLoading(prev => ({ ...prev, activity: true }));
    setError(prev => ({ ...prev, activity: null }));

    try {
      const data = await dashboardService.getRecentActivity();
      setActivity(data);
      updateCache('activity', data);
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
  }, []);

  /**
   * Fetch incomplete products
   */
  const fetchIncompleteProducts = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(cache.incompleteProducts)) {
      setIncompleteProducts(cache.incompleteProducts!.data);
      return;
    }

    setLoading(prev => ({ ...prev, incompleteProducts: true }));
    setError(prev => ({ ...prev, incompleteProducts: null }));

    try {
      const data = await dashboardService.getIncompleteProducts();

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
  }, []);

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