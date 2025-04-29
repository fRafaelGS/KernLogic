// API Configuration
export const API_BASE_URL = ''; // Empty base URL to use the proxy
export const API_URL = ''; // Empty string instead of '/api' since proxy adds this
export const API_AUTH_URL = `/api/auth`; // Relative path, proxy will handle it

// Add debug logging
console.log('API Configuration:', {
    API_BASE_URL,
    API_URL,
    API_AUTH_URL
});

// API endpoints
export const API_ENDPOINTS = {
    auth: {
        login: '/token/', // Updated to match schema
        register: '/auth/register/', // Keep as is, might be custom endpoint
        refresh: '/token/refresh/', // Updated to match schema
        user: '/auth/user/', // Keep as is, might be custom endpoint
        logout: '/auth/logout/' // Keep as is, might be custom endpoint
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