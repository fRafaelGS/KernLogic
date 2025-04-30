import { APP_VERSION } from './constants';

// API Configuration
export const API_BASE_URL = ''; // Empty base URL to use the proxy
export const API_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_AUTH_URL = `/api/auth`; // Relative path, proxy will handle it
export const API_PREFIX = APP_VERSION.API_VERSION; // Versioned API prefix

// Add debug logging
console.log('API Configuration:', {
    API_BASE_URL,
    API_URL,
    API_AUTH_URL,
    API_PREFIX
});

// Helper function to build API URLs with proper versioning prefix
export const getApiUrl = (path: string): string => {
    // If path starts with a slash, remove it to avoid double slashes
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Use the versioned API prefix
    return `${API_URL}${API_PREFIX}/${normalizedPath}`;
};

// API endpoints
export const API_ENDPOINTS = {
    auth: {
        login: '/token/', // Auth endpoints are not versioned
        register: '/auth/register/', 
        refresh: '/token/refresh/', 
        user: '/auth/user/', 
        logout: '/auth/logout/'
    },
    products: {
        list: '/products/',
        create: '/products/',
        update: (id: number) => `/products/${id}/`,
        delete: (id: number) => `/products/${id}/`,
        categories: '/products/categories/',
        stats: '/products/stats/'
    },
    dashboard: '/dashboard'
}; 