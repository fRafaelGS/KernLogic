// API Configuration
export const API_BASE_URL = ''; // Empty base URL to use the proxy
export const API_URL = `/api`; // Revert to relative path for proxy
export const API_AUTH_URL = `${API_URL}/auth`;

// Add debug logging
console.log('API Configuration:', {
    API_BASE_URL,
    API_URL,
    API_AUTH_URL
});

// API endpoints
export const API_ENDPOINTS = {
    auth: {
        login: '/auth/login/',
        register: '/auth/register/',
        refresh: '/auth/refresh/',
        user: '/auth/user/',
        debugLogin: '/auth/debug-login/',
        testLogin: '/auth/test-login/'
    },
    products: {
        list: '/products/',
        create: '/products/',
        update: (id: number) => `/products/${id}/`,
        delete: (id: number) => `/products/${id}/`,
        categories: '/products/categories/',
        stats: '/products/stats/'
    }
}; 