import axiosInstance from '@/lib/axiosInstance';
import { API_ENDPOINTS } from '@/config';

// Define types for dashboard data
export interface DashboardSummary {
  total_products: number;
  inventory_value: number;
  low_stock_count: number;
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
const DASHBOARD_URL = API_ENDPOINTS.dashboard;

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
    const response = await axiosInstance.get(`${DASHBOARD_URL}/activity/`);
    return response.data;
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
    const response = await axiosInstance.get(`${DASHBOARD_URL}/incomplete-products/`);
    return response.data;
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