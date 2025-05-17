/**
 * Configuration for the ProductsApi client
 * Contains environment variables and constants used by the client
 */

// Base URL for the products API endpoints
export const PRODUCTS_API_BASE = process.env.PRODUCTS_API_BASE_URL || '/api';

// JWT token for service-to-service authentication
export const SERVICE_JWT = process.env.SERVICE_JWT_TOKEN || '';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Maximum number of retries for failed requests
export const MAX_RETRIES = 3;

// Default page size for paginated requests
export const DEFAULT_PAGE_SIZE = 50; 