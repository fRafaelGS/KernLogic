## Analytics ←→ Products Integration

The Analytics service in KernLogic integrates with the Products service to provide real-time analytics based on product data. This integration ensures that analytics metrics are always up-to-date and reflect the current state of product data.

### OpenAPI-Generated TypeScript Client

The integration relies on an OpenAPI-generated TypeScript client for type safety and consistent API access:

1. **Generation Process**: The TypeScript client is auto-generated from the `backend/KernLogic API.yaml` OpenAPI specification
   ```bash
   openapi-generator-cli generate -i backend/KernLogic\ API.yaml -g typescript-axios -o src/services/productsClient
   ```

2. **Client Structure**:
   - `config.ts` - Configuration including base URL and timeout settings
   - `models.ts` - TypeScript interfaces matching the API schema
   - `ProductsApi.ts` - API client with methods for all endpoints
   - `index.ts` - Re-exports the API client for easy consumption

3. **Extension with Product Analytics Service**:
   - `productAnalyticsService.ts` - A higher-level service built on top of the ProductsApi client
   - Provides aggregation functions like `fetchAllAttributeValues`, `calculateAttributeCompleteness`
   - Handles pagination, filtering, and data normalization

### Environment Variable Requirements

For the integration to work in production, the following environment variables must be set:

| Variable | Purpose | Example |
|----------|---------|---------|
| `PRODUCTS_API_BASE_URL` | Base URL for the Products API | `/api` or `https://api.kernlogic.com/api` |
| `SERVICE_JWT_TOKEN` | JWT token for service-to-service authentication | `eyJhbGciOiJIUzI1NiIsInR5...` |

The system performs validation at startup to ensure these variables are set:
- Validation can be skipped with `SKIP_ENV_VALIDATION=true` (useful for testing)
- In debug mode, validation warnings are shown but startup continues
- In production mode, missing variables cause application startup to fail

### Fallback Mechanism

To ensure system resilience:
1. If the Products API is unavailable, the Analytics service falls back to its own database
2. Error logging captures integration failures for monitoring
3. Operations degrade gracefully with appropriate user notifications

### CI Pipeline Contract Enforcement

Continuous Integration enforces the contract between Analytics and Products:

1. **OpenAPI Schema Validation**:
   - The pipeline regenerates the TypeScript client from the OpenAPI spec
   - Compares generated interfaces against the checked-in client code
   - Fails if the client is out of date with the schema

2. **Integration Testing**:
   - `docker-compose.test.yml` runs a complete test environment including:
     - Prism mock server for the Products API (using the OpenAPI spec)
     - Temporary test database
     - The Analytics application
   - Tests verify that Analytics endpoints return valid data using the Products API

3. **Contract Versioning**:
   - API schema is versioned in Git
   - Breaking changes trigger CI failures and require client updates
   - Changes to the schema require corresponding changes to the integration code

### Implementation Best Practices

1. **Isolation**: The integration is isolated to the analytics service layer, making it easy to modify or replace
2. **Caching**: Responses are cached to improve performance and reduce API load
3. **Monitoring**: All service-to-service calls are logged for performance analysis and debugging
4. **Rate Limiting**: The Analytics service respects Products API rate limits and implements backoff strategies

By following this architecture, KernLogic ensures reliable and performant analytics while maintaining a clean separation of concerns between services. 