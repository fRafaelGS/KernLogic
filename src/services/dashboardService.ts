import axiosInstance from '@/lib/axiosInstance';
import { API_ENDPOINTS } from '@/config';

// Define types for dashboard data
export interface DashboardSummary {
  total_products: number;
  inventory_value: number;
  inactive_product_count: number;
  team_members: number;
  data_completeness: number;
  most_missing_fields: { field: string; count: number }[];
  active_products: number;
  inactive_products: number;
}

export interface InventoryTrend {
  dates: string[];
  values: number[];
}

export interface Activity {
  id: number;
  user_name: string;
  entity: string;
  entity_id: number;
  action: 'create' | 'update' | 'delete';
  message: string;
  created_at: string;
}

export interface IncompleteProduct {
  id: number;
  name: string;
  sku: string;
  completeness: number;
  missing_fields: Array<{field: string, weight: number}>;
}

// Define path to dashboard endpoints - use the path from config
const DASHBOARD_URL = API_ENDPOINTS.dashboard;

// Log the dashboard endpoint configuration
console.log('Dashboard API endpoints configured at:', DASHBOARD_URL);

/**
 * Build URL with organization ID parameter
 * @param endpoint Base endpoint URL
 * @param organizationId Organization ID
 * @returns URL with organization_id parameter
 */
const withOrgParam = (endpoint: string, organizationId?: string): string => {
  if (!organizationId) return endpoint;
  
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}organization_id=${organizationId}`;
};

/**
 * Fetch dashboard summary data
 * @param organizationId Optional organization ID to filter data
 */
export const getDashboardSummary = async (organizationId?: string): Promise<DashboardSummary> => {
  try {
    // Log the request URL and authorization header
    const token = localStorage.getItem('access_token');
    const url = withOrgParam(`${DASHBOARD_URL}/summary/`, organizationId);
    
    console.log('Dashboard Summary API Call:', {
      url,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
      organizationId: organizationId || 'not provided'
    });
    
    const response = await axiosInstance.get(url);
    
    // Debug the response data
    console.log('Dashboard Summary Response:', {
      status: response.status,
      data: response.data,
      dataType: typeof response.data
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
};

/**
 * Fetch inventory trend data
 * @param range Number of days (30, 60, 90)
 * @param organizationId Optional organization ID to filter data
 */
export const getInventoryTrend = async (range: 30 | 60 | 90 = 30, organizationId?: string): Promise<InventoryTrend> => {
  try {
    let url = `${DASHBOARD_URL}/inventory-trend/?range=${range}`;
    url = withOrgParam(url, organizationId);
    
    console.log('Inventory Trend API Call:', {
      url,
      range,
      organizationId: organizationId || 'not provided'
    });
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory trend:', error);
    throw error;
  }
};

/**
 * Fetch recent activity data
 * @param organizationId Optional organization ID to filter data
 */
export const getRecentActivity = async (organizationId?: string): Promise<Activity[]> => {
  try {
    // Log the request URL for debugging
    const token = localStorage.getItem('access_token');
    const url = withOrgParam(`${DASHBOARD_URL}/activity/`, organizationId);
    
    console.log('Recent Activity API Call:', {
      url,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
      organizationId: organizationId || 'not provided'
    });
    
    const response = await axiosInstance.get(url);
    
    // Debug log to check the response structure
    console.log('Activity API response:', {
      status: response.status,
      isArray: Array.isArray(response.data),
      dataType: typeof response.data,
      dataPreview: response.data
    });
    
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * Fetch incomplete products
 * @param organizationId Optional organization ID to filter data
 */
export const getIncompleteProducts = async (organizationId?: string): Promise<IncompleteProduct[]> => {
  try {
    // Log the request URL for debugging
    const token = localStorage.getItem('access_token');
    const url = withOrgParam(`${DASHBOARD_URL}/incomplete-products/`, organizationId);
    
    console.log('Incomplete Products API Call:', {
      url,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
      organizationId: organizationId || 'not provided'
    });
    
    const response = await axiosInstance.get(url);
    
    // Debug log to check the response structure
    console.log('Incomplete Products API response:', {
      status: response.status,
      isArray: Array.isArray(response.data),
      dataType: typeof response.data,
      dataPreview: response.data
    });
    
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching incomplete products:', error);
    throw error;
  }
};

/**
 * Custom hook for fetching all dashboard data with caching
 */
export const dashboardService = {
  getDashboardSummary,
  getInventoryTrend,
  getRecentActivity,
  getIncompleteProducts,
}; 