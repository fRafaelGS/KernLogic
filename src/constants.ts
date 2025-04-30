// Application versioning
export const APP_VERSION = {
  // API versioning
  API_VERSION: '/api/v1',
  
  // Frontend route versioning
  ROUTE_VERSION: '/v1',
  
  // Full routes with version
  ROUTES: {
    PRODUCTS: '/app/v1/products',
    DASHBOARD: '/app',
    UPLOAD: '/app/upload',
    TEAM: '/app/team',
    SETTINGS: '/app/settings',
    DOCUMENTATION: '/app/documentation',
  }
};

// Legacy routes - for reference, all these should be redirected to versioned routes
export const LEGACY_ROUTES = {
  PRODUCTS: '/app/products',
}; 