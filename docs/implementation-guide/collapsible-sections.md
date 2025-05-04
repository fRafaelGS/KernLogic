# Collapsible Sections Implementation Guide

This guide explains how to implement the collapsible sections feature in the product detail page. The feature allows users to expand or collapse sections of the product detail page to customize their view and focus on relevant information.

## Overview

The implementation consists of:

1. A reusable `CollapsibleSection` component that wraps content with collapsible functionality
2. Integration with existing components by replacing Card components with CollapsibleSection
3. Preserving all existing functionality while adding collapsible behavior

## CollapsibleSection Component

The `CollapsibleSection` component is built on top of the Radix UI Collapsible primitive (via shadcn/ui) and provides a standardized way to make any section collapsible.

### Props

- `title`: String for the section heading
- `description`: Optional string or ReactNode for description text below the title
- `defaultOpen`: Boolean to control initial state (default: true)
- `actions`: Optional ReactNode for action buttons in the header
- `className`: Optional string for custom styling
- `children`: ReactNode for the section content
- `id`: Optional string for custom section ID (used for ARIA attributes)

### Usage

```tsx
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

// Basic usage
<CollapsibleSection title="Section Title">
  <div>Content goes here</div>
</CollapsibleSection>

// With description and actions
<CollapsibleSection 
  title="Section Title"
  description="Optional description text or component"
  actions={<Button>Action</Button>}
>
  <div>Content goes here</div>
</CollapsibleSection>

// With custom initial state
<CollapsibleSection 
  title="Section Title"
  defaultOpen={false} // Start collapsed
>
  <div>Content goes here</div>
</CollapsibleSection>
```

## Migration Steps

To migrate an existing component to use collapsible sections:

1. Import the CollapsibleSection component
2. Replace Card/CardHeader with CollapsibleSection
3. Move header content to CollapsibleSection props
4. Wrap the main content with the CollapsibleSection

### Example Migration

Here's a condensed example of migrating from Card to CollapsibleSection:

#### Before:

```tsx
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

return (
  <Card>
    <CardHeader>
      <CardTitle>Section Title</CardTitle>
      {optionalDescription && <CardDescription>{optionalDescription}</CardDescription>}
      {actionButtons}
    </CardHeader>
    <CardContent>
      {/* Section content */}
    </CardContent>
  </Card>
);
```

#### After:

```tsx
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

return (
  <CollapsibleSection
    title="Section Title"
    description={optionalDescription}
    actions={actionButtons}
    defaultOpen={true}
    id="section-id"
  >
    {/* Section content */}
  </CollapsibleSection>
);
```

## Implementation Details

### Key Features

1. **Accessibility**: The component uses proper ARIA attributes for keyboard navigation and screen readers
2. **Animation**: Smooth opening/closing transitions
3. **State Management**: Internal state tracks open/closed status
4. **Customization**: Supports custom actions, descriptions, and styling

### Component Structure

```tsx
<Collapsible> // Root element
  <div> // Header
    <h3>{title}</h3>
    <CollapsibleTrigger /> // Toggle button
    {description}
    {actions}
  </div>
  <CollapsibleContent> // Content (appears/disappears on toggle)
    <div>{children}</div>
  </CollapsibleContent>
</Collapsible>
```

## Testing

The component includes comprehensive tests covering:

1. Rendering with various props combinations
2. Testing expand/collapse functionality
3. Checking accessibility requirements

## Examples of Migrated Components

- **RelatedProductsPanel**: Uses CollapsibleSection with pagination controls in actions
- **ProductDetailDescription**: Uses CollapsibleSection with edit button in actions

## Best Practices

1. Always provide a meaningful title for each section
2. Use `defaultOpen={true}` for the most important sections
3. Provide clear action buttons when needed
4. Ensure content renders properly when collapsed/expanded
5. Test keyboard navigation and screen reader functionality

## Future Enhancements

1. Persistent collapse state (save user preferences)
2. Collapse/expand all toggle
3. Animated indicators for real-time data changes 