# KernLogic PIM: Attribute Management System

This document provides a comprehensive overview of the attribute management system built for the KernLogic PIM platform. The system provides a robust way to handle product attributes, attribute groups, and attribute values across different locales and channels.

## System Architecture

The attribute management system consists of:

1. **Core Components**
   - `AttributeService`: A centralized service for all attribute-related API operations
   - `useAttributes`: A React hook that provides a clean interface for components
   - `attributeUtils`: Helper functions for attribute manipulation and normalization
   - `attributePreferences`: Utilities for persisting user preferences

2. **UI Components**
   - `AttributeValueRow`: Renders a single attribute value with editing capabilities
   - `AttributeGroupTabs`: Organizes attributes into tabbed groups
   - `LocaleChannelSelector`: Controls for selecting locale and channel
   - `AddAttributeModal`: Modal for adding new attributes

3. **Pages**
   - `EnhancedAttributesTab`: A product-level view for managing attributes
   - `AttributeSettingsPage`: A global settings page for attribute configuration

## Key Improvements

The enhanced attribute management system addresses several critical issues:

1. **Separation of Concerns**
   - Clear distinction between product attribute values and global attribute definitions
   - Separate handlers for product-specific vs. group-specific operations
   - Improved context awareness with `isSettingsContext` flag

2. **User Experience**
   - Tooltips for all key operations
   - Clear confirmation dialogs with context-specific messaging
   - Visual indicators for saving states and validation errors
   - Persistence of user preferences (locale/channel) across sessions

3. **Performance & Reliability**
   - Direct API calls for critical operations instead of React Query mutations
   - Proper type validation based on attribute data types
   - Optimistic UI updates with error handling and rollback
   - Batched state updates to prevent UI flicker

4. **Type Safety**
   - Comprehensive TypeScript interfaces for all attribute-related data
   - Runtime validation of attribute values based on data type

## Feature: Locale and Channel Support

The system allows attributes to be:
- **Locale-specific**: Different values per language (e.g., product name in English vs. French)
- **Channel-specific**: Different values per sales channel (e.g., descriptions for e-commerce vs. mobile app)

### Implementation

1. Each attribute can be configured with:
   - `is_localisable`: Boolean flag indicating locale support
   - `is_scopable`: Boolean flag indicating channel support

2. Attribute values are stored with:
   - `locale`: The language code (e.g., 'en_US', 'fr_FR')
   - `channel`: The channel code (e.g., 'ecommerce', 'mobile')

3. The UI provides:
   - Selectors for changing locale/channel context
   - Visual indicators showing which attributes have locale/channel specific values
   - Persistence of locale/channel preferences in localStorage

## Feature: Attribute Groups

Attributes can be organized into logical groups for better organization:

1. Groups have:
   - Name and description
   - List of assigned attributes

2. The group management system:
   - Allows adding/removing attributes from groups
   - Provides clear UI distinction between removing from a group vs. deleting a value
   - Renders attributes in tabbed interfaces for easy navigation

## Code Example: Using useAttributes Hook

```tsx
const ProductAttributesPanel = ({ productId }) => {
  const {
    // Data
    attributes,
    attributeValues,
    attributeGroups,
    
    // State
    selectedLocale,
    selectedChannel,
    setSelectedLocale,
    setSelectedChannel,
    
    // Operations
    handleAddAttribute,
    handleEditAttribute,
    handleSaveNewValue,
    handleUpdateValue,
    handleRemoveAttributeValue,
    
    // Utility
    isLoading,
    hasError
  } = useAttributes(productId, {
    enableGroups: true,
    isStaff: true
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (hasError) return <ErrorMessage />;
  
  return (
    <div>
      <LocaleChannelSelector
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
        onLocaleChange={setSelectedLocale}
        onChannelChange={setSelectedChannel}
        availableLocales={locales}
        availableChannels={channels}
      />
      
      {attributes.map(attr => (
        <AttributeValueRow
          key={attr.id}
          attribute={attr}
          value={attributeValues[attr.id]}
          onUpdate={handleUpdateValue}
          onRemove={handleRemoveAttributeValue}
          isStaff={true}
        />
      ))}
    </div>
  );
};
```

## API Endpoints

The attribute system interacts with these API endpoints:

### Attributes

- `GET /api/attributes/`: List all attributes
- `POST /api/attributes/`: Create a new attribute
- `GET /api/attributes/{id}/`: Get attribute details
- `PATCH /api/attributes/{id}/`: Update attribute properties
- `DELETE /api/attributes/{id}/`: Delete an attribute

### Attribute Values

- `GET /api/products/{product_pk}/attributes/`: List attribute values for a product
- `POST /api/products/{product_pk}/attributes/`: Create attribute value for a product
- `PATCH /api/products/{product_pk}/attributes/{id}/`: Update attribute value
- `DELETE /api/products/{product_pk}/attributes/{id}/`: Delete attribute value

### Attribute Groups

- `GET /api/attribute-groups/`: List all attribute groups
- `POST /api/attribute-groups/`: Create a new group
- `PATCH /api/attribute-groups/{id}/`: Update a group
- `DELETE /api/attribute-groups/{id}/`: Delete a group
- `POST /api/attribute-groups/{id}/items/`: Add attribute to group
- `DELETE /api/attribute-groups/{id}/items/{item_id}/`: Remove attribute from group

## Future Improvements

Planned enhancements for the attribute system:

1. **Validation Rules**
   - Min/max constraints for numeric values
   - Pattern matching for text values
   - Required field validation

2. **Attribute Inheritance**
   - Value inheritance from parent products
   - Variant-specific attribute overrides

3. **AI Integration**
   - Automated attribute value suggestions
   - Auto-completion for complex attributes
   - Multi-lingual content generation

4. **Performance Optimization**
   - Virtualized lists for large attribute sets
   - Attribute caching strategies
   - Lazy loading of attribute groups

5. **Enhanced Collaboration**
   - Attribute value change history
   - Approval workflows for attribute changes
   - User-specific attribute value assignments

## Troubleshooting

Common issues and solutions:

1. **Attribute values not saving**
   - Ensure the direct API call is being used instead of React Query mutations
   - Check for uniqueness constraints in the backend
   - Verify correct locale/channel combinations

2. **Attribute groups not loading**
   - Confirm the ENABLE_ATTRIBUTE_GROUPS feature flag is enabled
   - Check product ID is being correctly passed
   - Verify the API endpoint permissions

3. **Deleted attributes reappearing**
   - Ensure the correct flag is being passed to distinguish between product value removal vs. group attribute removal
   - Verify the `isSettingsContext` flag is properly set
   - Check that deletion confirmation was properly confirmed

4. **Missing attribute options in dropdown**
   - Verify the `getUnassignedAttributes` helper is filtering correctly
   - Check that locale/channel filters are correctly applied
   - Ensure attributes haven't been marked as hidden in user preferences 