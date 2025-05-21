/**
 * Configuration for the ProductsApi client
 * Contains environment variables and constants used by the client
 */

// Use API_URL or API_BASE_URL from config.ts for consistency
import { API_URL } from '@/config/config'

// Base URL for the products API endpoints
// export const PRODUCTS_API_BASE = '/api';
export const PRODUCTS_API_BASE = API_URL + '/api'; // Use main API URL from config

// JWT token for service-to-service authentication
export const SERVICE_JWT = '';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Maximum number of retries for failed requests
export const MAX_RETRIES = 3;

// Default page size for paginated requests
export const DEFAULT_PAGE_SIZE = 50; 