# KernLogic Products API Client

This directory contains a TypeScript client for the KernLogic Products API, providing a type-safe interface for interacting with product data.

## Usage

```typescript
import { ProductsApi } from '@/services/productsClient';
import { PRODUCTS_API_BASE } from '@/services/productsClient/config';

// Create an instance of the API client
const productsClient = new ProductsApi({ basePath: PRODUCTS_API_BASE });

// Fetch a paginated list of products
const productsPage = await productsClient.productsList({ 
  page: 1, 
  page_size: 20,
  category: 'electronics'
});

// Fetch all products (handles pagination automatically)
const allProducts = await productsClient.fetchAllProducts({ 
  is_active: true 
});

// Get a single product by ID
const product = await productsClient.productsRetrieve(123);

// Create a new product
const newProduct = await productsClient.productsCreate({
  name: 'New Product',
  sku: 'NP001',
  category_id: 5
});

// Update a product
const updatedProduct = await productsClient.productsPartialUpdate(123, {
  name: 'Updated Product Name'
});

// Work with product attributes
const attributes = await productsClient.productAttributesList(123);

// Create an attribute value
const newAttribute = await productsClient.productAttributesCreate(123, {
  attribute: 456,
  value: 'Red',
  locale: 1,
  channel: 'web'
});
```

## Configuration

The client is configured using environment variables:

- `PRODUCTS_API_BASE_URL`: Base URL for the API endpoints (defaults to '/api')
- `SERVICE_JWT_TOKEN`: JWT token for service-to-service authentication

These values can be adjusted in `config.ts`.

## Regenerating the Client

This client was manually created based on the OpenAPI specification in `backend/KernLogic API.yaml`. To regenerate or update the client:

### Option 1: Manual Update

1. Open `backend/KernLogic API.yaml`
2. Update the TypeScript interfaces in `models.ts` based on the schema definitions
3. Update the API methods in `ProductsApi.ts` based on the path operations

### Option 2: Using OpenAPI Generator

To automatically generate the client from the OpenAPI spec:

1. Install the OpenAPI Generator CLI:
   ```bash
   npm install @openapitools/openapi-generator-cli -g
   ```

2. Generate the TypeScript client:
   ```bash
   openapi-generator-cli generate -i backend/KernLogic\ API.yaml -g typescript-axios -o tmp/generated
   ```

3. Copy the relevant parts from the generated code:
   ```bash
   # Copy model definitions
   cp tmp/generated/api.ts src/services/productsClient/generated-models.ts
   
   # Copy API methods
   cp tmp/generated/apis/products-api.ts src/services/productsClient/generated-api.ts
   ```

4. Adapt the generated code to match our current structure

## Included Files

- `config.ts` - Configuration settings and environment variables
- `models.ts` - TypeScript interfaces for API request/response types
- `ProductsApi.ts` - API client with methods for interacting with endpoints
- `index.ts` - Convenience exports from the client library 