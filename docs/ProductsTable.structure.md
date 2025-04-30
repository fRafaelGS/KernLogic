# File: src/components/products/ProductsTable.tsx

**Overall responsibility**  
This component renders a feature-rich product catalog table with sorting, filtering, inline editing, and bulk actions. It provides a centralized interface for product management with optimized performance and responsive design.

## Sections

1. **Imports** (Lines 1-95)  
   - React, hooks, UI components from shadcn/ui
   - TanStack Table components and types
   - Lucide icons for UI elements
   - Product service and related types
   - React Router for navigation
   - DND Kit for drag-and-drop column reordering
   - AsyncCreatableSelect for tag/category management

2. **Utility Types & Functions** (Lines 98-122)  
   - `FilterState` interface for filter panel state tracking
   - `useDebounce` custom hook for search input performance

3. **Helper Components** (Lines 123-274)  
   - `SortableTableHeader`: Handles column header styling, sorting indicators
   - `TableFallback`: Renders loading states, empty states, and error handling
   - `CategoryOption` and `Category` type definitions

4. **Main Component State** (Lines 280-390)  
   - Extensive state declarations: products, loading, editing, filtering, pagination
   - Table configuration state: sorting, column visibility, column order
   - Sensors for drag-and-drop functionality
   - Row selection tracking for bulk operations

5. **Data Fetching & Processing** (Lines 390-535)  
   - `fetchData()`: Retrieves products and categories with error handling
   - Filtered data computation with useMemo for performance
   - Product map maintenance for row/id correlation

6. **Event Handlers** (Lines 535-730)  
   - `handleRefresh`, `handleEdit`, `handleDelete` for core operations
   - `handleBulkDelete`, `handleBulkSetStatus` for bulk actions
   - Cell editing handlers: start, save, cancel, keyboard navigation
   - Filter and column management

7. **Tag Management** (Lines 730-750)  
   - Tag loading with useEffect
   - `handleCreateTagOption` for creating new tags during editing

8. **Column Definitions** (Lines 750-1400)  
   - Comprehensive column configuration with specialized cell renderers
   - Custom inline editors for each data type (text, number, select, tags)
   - Cell formatting and validation logic
   - Status toggle and image display handling

9. **Action Column Definition** (Lines 1400-1450)  
   - Sticky right-aligned column with view/edit/delete actions
   - Event propagation management for row vs. action clicks

10. **User Preferences** (Lines 1590-1635)  
    - Column order persistence in localStorage
    - Column visibility and pagination preferences

11. **Table Configuration** (Lines 1635-1730)  
    - `useReactTable` setup with combined columns
    - Event handlers for table state changes
    - Column filter management

12. **Modal Management** (Lines 1730-1800)  
    - State and handlers for bulk category/tag modals
    - Selected product ID helper function

13. **JSX Rendering** (Lines 1800-2025)  
    - Responsive container structure
    - Toolbar with search, filters, and action buttons
    - Filter panel with category, status, price filters
    - Table header with sortable columns and filter inputs
    - Table body with row rendering and cell customization
    - Pagination controls

14. **Style Injection** (Lines 2025-2050)  
    - Shadow styling for header
    - Sticky column positioning and shadows
    - DOM-based style injection for global styling

## Key Features

- Inline cell editing with type-specific editors
- Column reordering with drag and drop
- Advanced filtering: text search, dropdown, range, date
- Zebra striping and hover effects for rows
- Bulk operations: delete, status change, category/tag assignment
- Optimistic UI updates with fallback on API errors
- Responsive design with mobile-optimized views
- Persistent user preferences
- Icon indications for categories and brands

This complex component serves as the central product management interface, balancing rich functionality with performance optimizations. 