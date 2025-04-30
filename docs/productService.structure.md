# productService.ts Structure Documentation

This document provides a breakdown of the `productService.ts` file, which serves as the core service for managing product data in the application. The service handles all product-related API calls, data transformations, and state management.

## File Location
`/src/services/productService.ts`

## Overview
The `productService` module provides a comprehensive set of functions for interacting with the product API endpoints. It handles CRUD operations for products, as well as specialized operations like bulk updates, asset management, related products, and product history.

## Structure Breakdown

### 1. Imports and Constants (Lines 1-50)
- Imports Axios and related utilities
- Defines API URL constants like `PRODUCTS_PATH` and `PRODUCTS_API_URL`
- Helper functions for response validation (`isHtmlResponse`)

### 2. Interfaces (Lines 55-244)
- `ProductImage` (Line 55): Structure for product images with fields like id, url, order, is_primary
- `Product` (Line 62): Core product data structure with required and optional fields
- `ProductAttribute` (Line 89): Structure for product attributes/specifications
- `ProductAsset` (Line 99): Structure for product assets (images, files)
- `ProductActivity` (Line 116): Structure for tracking product changes
- `ProductVersion` (Line 124): Structure for product versioning
- `PriceHistory` (Line 132): Structure for tracking price changes
- `ProductRelation` (Line 140): Structure for related products
- `Category` and `CategoryOption` (Lines 223-230): Structures for category data
- `ProductEvent` (Line 235): Structure for product events/history
- `PaginatedResponse<T>` (Line 244): Generic interface for paginated API responses

### 3. Attribute Management Functions (Lines 150-222)
- `getAttributeSet`: Fetches attribute definitions
- `getAttributeValues`: Retrieves attribute values for a product
- `updateAttributeValue`: Updates existing attribute values
- `createAttributeValue`: Creates new attribute values
- `logAttributeActivity`: Tracks changes to attributes
- `createAttribute`: Creates new attribute definitions

### 4. Core Product Functions (Lines 250-499)
- `getProducts`: Fetches products with filtering and pagination
- `getProduct`: Retrieves a single product by ID
- `createProduct`: Creates a new product
- `updateProduct`: Updates an existing product
- `deleteProduct`: Soft-deletes a product
- `getProductAttributes`: Fetches product attributes

### 5. Category and Tag Management (Lines 500-600)
- Functions for creating, updating, and retrieving categories and tags
- Category and tag autocomplete functionality

### 6. Product Statistics and Metrics (Lines 600-650)
- `getProductStats`: Retrieves aggregated product statistics
- Functions for analyzing product data

### 7. Asset Management (Lines 650-750)
- `uploadAsset`: Handles file uploads for products
- `deleteAsset`: Removes product assets
- `setAssetPrimary`: Sets an asset as the primary image
- Asset transformation and processing functions

### 8. Activity and History Tracking (Lines 750-850)
- `getProductHistory`: Retrieves the history of changes
- `getPriceHistory`: Gets historical price changes
- Functions for logging and retrieving product activities

### 9. Related Products Management (Lines 850-950)
- `getRelatedProducts`: Fetches products related to a given product
- `toggleRelatedProduct`: Adds/updates product relationships
- `removeRelatedProduct`: Removes product relationships
- `getExplicitRelations`: Gets explicitly defined relationships

### 10. Search and Suggestions (Lines 950-1000)
- `searchProducts`: Searches products by various criteria
- Functions for product filtering and sorting

### 11. Bulk Operations (Lines 1000-1100)
- `bulkSetStatus`: Updates status for multiple products
- `bulkDelete`: Deletes multiple products
- `bulkAssignCategory`: Assigns category to multiple products
- `bulkUpdateCategory`: Alias for backward compatibility
- `bulkAddTags`: Adds tags to multiple products

### 12. Product Suggestions (Lines 1100-1125)
- `suggestProducts`: Provides autocomplete suggestions for products

## Key Features
- Comprehensive error handling throughout the service
- Support for paginated responses with proper typing
- Debouncing for search operations
- Fallback mechanisms for unexpected response formats
- Consistent logging for debugging purposes
- Support for both singular and bulk operations
- Type safety through extensive interface definitions

## Integration Points
- Uses the global Axios instance for API calls
- Integrates with the app's authentication system
- Supports file uploads with FormData
- Handles various response formats from the backend API

This service acts as the central point for all product-related operations in the application, providing a clean and consistent interface for components to interact with product data. 