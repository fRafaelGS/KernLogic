import axiosInstance from '@/lib/axiosInstance';
import { API_ENDPOINTS, API_URL } from '@/config';

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
  missing_fields: string[];
}

// Define path to dashboard endpoints
const DASHBOARD_URL = `/api/dashboard`;

// This is the correct URL construction - the proxy in vite.config.ts will add /api
console.log('Dashboard API endpoints configured at:', DASHBOARD_URL);

/**
 * Fetch dashboard summary data
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  try {
    // Log the request URL and authorization header
    const token = localStorage.getItem('access_token');
    console.log('Dashboard Summary API Call:', {
      url: `${DASHBOARD_URL}/summary/`,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none'
    });
    
    const response = await axiosInstance.get(`${DASHBOARD_URL}/summary/`);
    
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
 */
export const getInventoryTrend = async (range: 30 | 60 | 90 = 30): Promise<InventoryTrend> => {
  try {
    const response = await axiosInstance.get(`${DASHBOARD_URL}/inventory-trend/?range=${range}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory trend:', error);
    throw error;
  }
};

/**
 * Fetch recent activity data
 */
export const getRecentActivity = async (): Promise<Activity[]> => {
  try {
    // Log the request URL for debugging
    const token = localStorage.getItem('access_token');
    console.log('Recent Activity API Call:', {
      url: `${DASHBOARD_URL}/activity/`,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none'
    });
    
    const response = await axiosInstance.get(`${DASHBOARD_URL}/activity/`);
    
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
 */
export const getIncompleteProducts = async (): Promise<IncompleteProduct[]> => {
  try {
    // Log the request URL for debugging
    const token = localStorage.getItem('access_token');
    console.log('Incomplete Products API Call:', {
      url: `${DASHBOARD_URL}/incomplete-products/`,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 15) + '...' : 'none'
    });
    
    const response = await axiosInstance.get(`${DASHBOARD_URL}/incomplete-products/`);
    
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