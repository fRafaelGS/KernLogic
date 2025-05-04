# Attribute Management System

This module provides a comprehensive solution for managing product attributes in the PIM platform.

## Architecture

The attribute management system consists of:

1. **Components** - Reusable UI components for displaying and editing attributes
2. **Service** - A centralized `AttributeService` that handles all API interactions
3. **Hooks** - The `useAttributes` hook that provides a simple interface for React components
4. **Utilities** - Helper functions for attribute data manipulation

## Key Components

### AttributeService

The `AttributeService` centralizes all attribute-related operations, including:

- Fetching attributes, values, and groups
- Creating, updating, and deleting attribute values
- Managing attribute group assignments
- Value formatting and validation

### useAttributes Hook

The `useAttributes` hook provides a clean, React-friendly way to work with attributes:

```tsx
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
  
  // Mutations
  handleAddAttribute,
  handleEditAttribute,
  handleUpdateValue,
  handleRemoveAttributeValue,
  // ...more handlers
  
  // Helpers
  getUnassignedAttributes,
  
  // Utility state
  isLoading,
  hasError
} = useAttributes(productId, {
  enableGroups: true,
  isStaff: true,
  isSettingsContext: false
});
```

### UI Components

- **AttributeValueRow** - Renders and edits a single attribute value
- **AddAttributeModal** - Modal for adding new attributes
- **AttributeGroupTabs** - Manages attributes organized in groups
- **LocaleChannelSelector** - Controls for selecting locale and channel

## Key Features

- **Strong typing** - All components and services are fully typed
- **Error handling** - Comprehensive error handling with user-friendly messages
- **Optimistic updates** - UI updates immediately for a better UX
- **Locale/channel support** - Built-in support for localization and channel-specific values
- **Group management** - Ability to organize attributes in logical groups
- **Type validation** - Automatic value formatting based on attribute type
- **Performance optimization** - Efficient data fetching and caching

## Usage Example

```tsx
import { useAttributes } from '@/hooks/useAttributes';
import { AttributeValueRow, AddAttributeModal } from '@/features/attributes';

const MyComponent = ({ productId }) => {
  const {
    attributes,
    attributeValues,
    handleAddAttribute,
    handleUpdateValue,
    // ...other methods and state
  } = useAttributes(productId);
  
  return (
    <div>
      {/* Render attribute values */}
      {attributes.map(attribute => (
        <AttributeValueRow
          key={attribute.id}
          attribute={attribute}
          value={attributeValues[attribute.id]}
          onUpdate={handleUpdateValue}
          // ...other props
        />
      ))}
      
      {/* Add new attributes */}
      <AddAttributeModal
        onAddAttribute={handleAddAttribute}
        // ...other props
      />
    </div>
  );
};
```

## Future Improvements

- Add support for attribute validation rules
- Implement batch operations for attribute values
- Add AI-assisted attribute value suggestions
- Improve performance with virtualized lists for large attribute sets
- Add attribute import/export capabilities 