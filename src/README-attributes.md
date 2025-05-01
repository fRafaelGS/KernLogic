# Custom Attributes Implementation

This document outlines the implementation of the custom attributes feature for KernLogic.

## Overview

The custom attributes feature allows users to define and manage product attributes. These attributes can be assigned to products with different values based on locale and channel.

## Feature Flag

The feature is controlled by a feature flag:

```typescript
// src/config/featureFlags.ts
export const ENABLE_CUSTOM_ATTRIBUTES = true; // toggle in prod after QA
```

## Components

### 1. AttributesPage

Located at `src/pages/AttributesPage.tsx`, this page allows staff users to:
- View all attributes in a table
- Create new attributes
- Edit existing attributes (except core ones)
- Delete attributes (except core ones or those in use)

The page is accessible at `/app/settings/attributes`.

### 2. AttributesTab

Located at `src/components/products/AttributesTab.tsx`, this component allows users to:
- View all attribute values for a product
- Add new attribute values
- Edit existing attribute values
- Filter values by locale and channel

The component is embedded in the Product Detail page as a tab.

## Data Flow

### Attributes API Endpoints

The application uses these endpoints:

```typescript
// src/lib/apiPaths.ts
export const paths = {
  attributes: {
    root: () => '/api/attributes/',
    byId: (id: number) => `/api/attributes/${id}/`,
  },
  products: {
    attributes: (id: number) => `/api/products/${id}/attributes/`,
    attributeValue: (id: number, avId: number) => `/api/products/${id}/attributes/${avId}/`,
  }
};
```

### Data Types

- **Attribute**: Defines a type of information that can be assigned to products (e.g., "Color", "Weight", "Material")
- **AttributeValue**: Associates a specific value for an attribute with a product, locale, and channel

## User Experience Flow

1. **Settings > Attributes**:
   - Staff users manage attribute definitions
   - They can define data types, localization options, and scoping options

2. **Product Detail > Attributes Tab**:
   - Users with appropriate permissions can add attributes to products
   - Users can set and update attribute values
   - Values can be filtered by locale and channel

## Implementation Details

### Debounced Saves

Attribute values are saved automatically with debounce to avoid excessive API calls:

```typescript
const debouncedHandleChange = debounce((
  attributeId: number, 
  value: any, 
  isNewValue: boolean,
  valueId?: number
) => {
  // Save logic
}, 800);
```

### Render Logic by Data Type

Attribute inputs are rendered according to their data type:

- **text**: Simple text input
- **number**: Numeric input
- **boolean**: Switch component
- **date**: Date picker with ISO-8601 validation
- **select**: Dropdown with options

## Testing

- Unit tests: Test attribute validation logic
- Integration tests: Test attribute creation and assignment flows
- E2E tests: Test complete user flow for attribute management and usage

## Future Improvements

- Support for more attribute types (rich text, multi-select, file)
- Advanced validation rules
- Attribute groups and categorization
- Bulk attribute value management
- Import/export attribute definitions 