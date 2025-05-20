import axiosInstance from '@/lib/axiosInstance';
import { API_ENDPOINTS } from '@/config';
import { config } from '@/config/config';

// Define types for dashboard data
export interface DashboardSummary {
  total_products: number;
  inactive_product_count: number;
  data_completeness: number;
  most_missing_fields: { field: string; count: number }[];
  active_products: number;
  inactive_products: number;
  attributes_missing_count: number;
  mandatory_attributes: string[];
  recent_products: { id: number; name: string; sku: string; family: { name: string } }[];
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

// Detail for a single missing field
export interface FieldDetail {
  field: string; // e.g., "Name", "SKU", "Attribute: Color"
  weight: number;
  attribute_id?: number;
  attribute_code?: string;
  attribute_type?: string; // e.g., 'text', 'number', 'boolean', 'select', 'date'
}

// Entry for the field_completeness array
export interface FieldCompletenessEntry extends FieldDetail {
  complete: boolean;
}

export interface IncompleteProduct {
  id: number;
  name: string;
  sku: string;
  completeness: number;
  family?: { name: string };
  missing_fields: FieldDetail[];
  missing_fields_count: number; // New field for counting missing fields
  field_completeness: FieldCompletenessEntry[]; // Comprehensive list of all tracked fields and their status
}

// Define interface for incomplete products parameters
export interface IncompleteProductsParams {
  organization_id: number;
  limit?: number;
  product_id?: number;
}

// Define path to dashboard endpoints - use the path from config
const DASHBOARD_URL = API_ENDPOINTS.dashboard;

// Log the dashboard endpoint configuration if debugging is enabled
if (config.debug.enableLogs) {
  console.log('Dashboard API endpoints configured at:', DASHBOARD_URL);
}

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
    const token = localStorage.getItem('access_token');
    const url = withOrgParam(`${DASHBOARD_URL}/summary/`, organizationId);
    
    // Only log if debug logging is enabled
    if (config.debug.enableLogs) {
      console.log('Dashboard Summary API Call:', {
        url,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
        organizationId: organizationId || 'not provided'
      });
    }
    
    const response = await axiosInstance.get(url);
    
    // Debug the response data if logging is enabled
    if (config.debug.enableLogs) {
      console.log('Dashboard Summary Response:', {
        status: response.status,
        data: response.data,
        dataType: typeof response.data
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
};

/**
 * Fetch recent activity data
 * @param organizationId Optional organization ID to filter data
 */
export const getRecentActivity = async (organizationId?: string): Promise<Activity[]> => {
  try {
    const token = localStorage.getItem('access_token');
    const url = withOrgParam(`${DASHBOARD_URL}/activity/`, organizationId);
    
    // Only log if debug logging is enabled
    if (config.debug.enableLogs) {
      console.log('Recent Activity API Call:', {
        url,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
        organizationId: organizationId || 'not provided'
      });
    }
    
    const response = await axiosInstance.get(url);
    
    // Debug log to check the response structure if logging is enabled
    if (config.debug.enableLogs) {
      console.log('Activity API response:', {
        status: response.status,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data,
        dataPreview: response.data
      });
    }
    
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * Fetch incomplete products with optional filtering parameters
 * @param params Object containing organization_id (required), limit (optional), and product_id (optional)
 * @returns Array of incomplete products or a single product when product_id is provided
 */
export const getIncompleteProducts = async (
  params: IncompleteProductsParams | string
): Promise<IncompleteProduct[]> => {
  try {
    let url = `${DASHBOARD_URL}/incomplete-products/`;
    
    // Handle both legacy string parameter and new params object
    if (typeof params === 'string') {
      // Legacy support - organizationId as string parameter
      url = withOrgParam(url, params);
      
      if (config.debug.enableLogs) {
        console.log('Incomplete Products API Call (legacy):', {
          url,
          organizationId: params || 'not provided'
        });
      }
    } else {
      // New parameter object format
      const { organization_id, limit, product_id } = params;
      
      // Build URL with query parameters
      url = `${url}?organization_id=${organization_id}`;
      
      if (limit !== undefined) {
        url += `&limit=${limit}`;
      }
      
      if (product_id !== undefined) {
        url += `&product_id=${product_id}`;
      }
      
      if (config.debug.enableLogs) {
        console.log('Incomplete Products API Call:', {
          url,
          params
        });
      }
    }
    
    const response = await axiosInstance.get(url);
    
    // Debug log to check the response structure if logging is enabled
    if (config.debug.enableLogs) {
      console.log('Incomplete Products API response:', {
        status: response.status,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data,
        dataPreview: response.data
      });
    }
    
    // If product_id is provided, the response might be a single object
    // Convert it to an array for consistent return type
    if (!Array.isArray(response.data) && typeof response.data === 'object') {
      return [response.data];
    }
    
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching incomplete products:', error);
    throw error;
  }
};

/**
 * Dashboard service module
 */
export const dashboardService = {
  getDashboardSummary,
  getRecentActivity,
  getIncompleteProducts,
}; 