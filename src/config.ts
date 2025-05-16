// API Configuration
export const API_BASE_URL = 'http://localhost:8000'; // Changed to remove /api suffix
export const API_URL = 'http://localhost:8000'; // Changed to remove /api suffix
export const API_AUTH_URL = `http://localhost:8000`; // Changed to remove /api suffix

// Add debug logging
console.log('API Configuration:', {
    API_BASE_URL,
    API_URL,
    API_AUTH_URL
});

// API endpoints - updated to match actual Django URL structure
export const API_ENDPOINTS = {
    auth: {
        login: '/api/token/', // Updated with full /api path
        refresh: '/api/token/refresh/', // Updated with full /api path
        user: '/api/users/me/', // Updated with full /api path
        register: '/api/register/', // Updated to correct path without 'accounts/'
        logout: '/api/auth/logout/' // Updated with full /api path
    },
    orgs: {
        memberships: (orgId: string) => `/api/orgs/${orgId}/memberships/`,
        roles: (orgId: string) => `/api/orgs/${orgId}/roles/`,
        invitations: (orgId: string) => `/api/orgs/${orgId}/invitations/`
    },
    products: {
        list: '/api/products/',
        create: '/api/products/',
        update: (id: number) => `/api/products/${id}/`,
        delete: (id: number) => `/api/products/${id}/`,
        categories: '/api/categories/',
        stats: '/api/products/stats/'
    },
    categories: {
        list: '/api/categories/',
        create: '/api/categories/',
        update: (id: number) => `/api/categories/${id}/`,
        delete: (id: number) => `/api/categories/${id}/`,
        tree: '/api/categories/?as_tree=true',
        move: '/api/categories/move/',
        products: (id: number) => `/api/categories/${id}/products/`
    },
    families: {
        list: '/api/families/',
        create: '/api/families/',
        update: (id: number) => `/api/families/${id}/`,
        delete: (id: number) => `/api/families/${id}/`,
        attributeGroups: (id: number) => `/api/families/${id}/attribute-groups/`
    },
    analytics: {
        locales: '/api/analytics/locales/',
        channels: '/api/analytics/channels/',
        completeness: '/api/analytics/completeness/',
        readiness: '/api/analytics/readiness/',
        enrichmentVelocity: '/api/analytics/enrichment-velocity/',
        localizationQuality: '/api/analytics/localization-quality/',
        changeHistory: '/api/analytics/change-history/',
        families: '/api/analytics/families/'
    },
    dashboard: '/api/dashboard'
}; 