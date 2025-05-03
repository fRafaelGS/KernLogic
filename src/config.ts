// API Configuration
export const API_BASE_URL = 'http://localhost:8000'; // Explicit backend URL
export const API_URL = 'http://localhost:8000/api'; // Base URL with /api prefix
export const API_AUTH_URL = `http://localhost:8000/api`; // Base URL for auth endpoints with /api prefix

// Add debug logging
console.log('API Configuration:', {
    API_BASE_URL,
    API_URL,
    API_AUTH_URL
});

// API endpoints - updated to match actual Django URL structure
export const API_ENDPOINTS = {
    auth: {
        login: '/token/', // Path is relative to API_URL (/api/token/)
        refresh: '/token/refresh/', // Path is relative to API_URL (/api/token/refresh/)
        user: '/users/me/', // Path is relative to API_URL (/api/users/me/)
        register: '/accounts/register/', // If registration endpoint exists
        logout: '/auth/logout/' // If logout endpoint exists
    },
    orgs: {
        memberships: (orgId: string) => `/orgs/${orgId}/memberships/`,
        roles: (orgId: string) => `/orgs/${orgId}/roles/`,
        invitations: (orgId: string) => `/orgs/${orgId}/invitations/`
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