# Data Alchemy Suite: API and Route Versioning Guide

This document explains how API endpoints and frontend routes are versioned in the Data Alchemy Suite application.

## Version Management

All version information is centralized in `src/constants.ts`:

```typescript
// Application versioning
export const APP_VERSION = '1.0.0';
export const API_VERSION = 'v1';
export const ROUTE_VERSION = 'v1';

// Legacy routes that should be redirected to versioned routes
export const LEGACY_ROUTES = [
  '/dashboard',
  '/products',
  '/import',
  '/settings',
  // Add other legacy routes here
];
```

## API Endpoints

API endpoints follow the pattern `/api/{version}/{resource}`. For example:

- `/api/v1/products/`
- `/api/v1/products/:id/`
- `/api/v1/products/bulk-actions/`
- `/api/v1/categories/`
- `/api/v1/dashboard/stats/`

The version prefix is automatically applied by the `getApiUrl` helper function in `src/config.ts`:

```typescript
import { API_VERSION } from './constants';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function getApiUrl(path: string): string {
  // Authentication endpoints are not versioned
  if (path.startsWith('/auth/')) {
    return `${API_BASE_URL}/api${path}`;
  }
  
  // All other endpoints include the version
  return `${API_BASE_URL}/api/${API_VERSION}${path}`;
}
```

### Authentication Endpoints

Authentication endpoints are an exception and do not include the version prefix:

- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/register/`

## Frontend Routes

Frontend routes follow a similar pattern: `/{version}/{resource}`. For example:

- `/v1/dashboard`
- `/v1/products`
- `/v1/products/:id`
- `/v1/import`
- `/v1/settings`

Legacy routes (without version prefix) are automatically redirected to their versioned counterparts using route configuration in `src/App.tsx`:

```tsx
import { LEGACY_ROUTES, ROUTE_VERSION } from './constants';

// In the route configuration
{LEGACY_ROUTES.map(route => (
  <Route 
    key={`legacy-${route}`}
    path={route} 
    element={<Navigate to={`/${ROUTE_VERSION}${route}`} replace />} 
  />
))}
```

## Version Upgrade Process

When upgrading the API or route version:

1. Update the version constants in `src/constants.ts`:
   ```typescript
   export const API_VERSION = 'v2';
   export const ROUTE_VERSION = 'v2';
   ```

2. Ensure the backend API endpoints support the new version.

3. Update the `LEGACY_ROUTES` array to include any routes from the previous version that should be redirected.

4. For backward compatibility, the backend should continue to support previous API versions for a transition period.

## Best Practices

1. **Never hardcode version numbers** in API calls or route definitions. Always use the constants from `constants.ts`.

2. **Document breaking changes** between versions in the changelog.

3. **Incremental version changes** should be made for backward-compatible updates (e.g., adding new fields).

4. **Major version changes** should be reserved for breaking changes (e.g., changing field types, removing fields).

5. When implementing a new version, **maintain support for the previous version** for a transition period.

## Deployment Considerations

1. When upgrading versions, deploy the backend first to ensure it supports the new API version before the frontend starts using it.

2. Consider implementing feature flags to gradually roll out new versions to users.

3. Monitor API usage after version changes to identify any issues with client applications not adapting to the new version.

## Version History

| Version | Release Date | Major Changes |
|---------|--------------|---------------|
| v1      | 2023-12-01   | Initial stable API with product management features |
| (future versions will be listed here) | | |

## References

- [RESTful API Versioning Best Practices](https://restfulapi.net/versioning/)
- [Django REST Framework Versioning](https://www.django-rest-framework.org/api-guide/versioning/) 