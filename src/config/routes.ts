/**
 * KernLogic Routes Configuration
 * Centralized configuration for all front-end routes
 */

// Base paths
export const ROUTES = {
  // Root/Marketing routes
  ROOT: '/',
  MARKETING: {
    HOME: '/marketing',
    PRODUCT: '/marketing/product',
    PRICING: '/marketing/pricing'
  },

  // Authentication routes
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    REGISTER_ORG: '/register/:orgId',
    FORGOT_PASSWORD: '/forgot-password',
    SET_PASSWORD: '/set-password/:orgId',
    ACCEPT_INVITE: '/accept-invite/:membershipId',
    TERMS: '/terms',
    PRIVACY: '/privacy'
  },

  // App routes
  APP: {
    ROOT: '/app',
    DASHBOARD: '/app',
    
    // Product routes
    PRODUCTS: '/products',
    NEW: '/app/products/new',
    DETAIL: '/app/products/:id',
    EDIT: '/app/products/:id/edit',
    FAMILIES: {
      ROOT: '/app/products/families',
      NEW: '/app/products/families/new',
      DETAIL: '/app/products/families/:id',
      EDIT: '/app/products/families/:id/edit'
    },
    
    // Report routes
    REPORTS: '/app/reports',
    
    // Import routes
    UPLOAD: '/app/upload',
    
    // Documentation routes
    DOCUMENTATION: '/app/documentation',
    
    // Team routes
    TEAM: {
      ROOT: '/app/team',
      HISTORY: '/app/team/history'
    },
    
    // Settings routes
    SETTINGS: {
      ROOT: '/app/settings',
      ATTRIBUTES: '/app/settings/attributes',
      ATTRIBUTE_GROUPS: '/app/settings/attribute-groups'
    }
  },
  
  // Helper functions to build dynamic routes
  buildProductDetailUrl: (id: number | string) => `/app/products/${id}`,
  buildProductEditUrl: (id: number | string) => `/app/products/${id}/edit`,
  buildFamilyDetailUrl: (id: number | string) => `/app/products/families/${id}`,
  buildFamilyEditUrl: (id: number | string) => `/app/products/families/${id}/edit`,
  buildOrgRegisterUrl: (orgId: string) => `/register/${orgId}`,
  buildSetPasswordUrl: (orgId: string) => `/set-password/${orgId}`,
  buildAcceptInviteUrl: (membershipId: string) => `/accept-invite/${membershipId}`,
  
  // Query parameter helper methods
  getProductsWithLowCompleteness: () => `/app/products?completeness_lt=100`,
  getProductsByStatus: (status: 'active' | 'inactive') => `/app/products?status=${status}`
}; 