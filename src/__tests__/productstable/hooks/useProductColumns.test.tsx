import React from 'react';
import { renderHook } from '@testing-library/react';
import { useProductColumns, type UseProductColumnsOpts } from '@/hooks/useProductColumns';

// Mock SCSS imports
jest.mock('@/styles/editable-cell.scss', () => ({}));

// Mock dependencies
jest.mock('@/api/familyApi', () => ({
  useFamilies: () => ({
    data: [],
    isLoading: false
  })
}));

jest.mock('@/utils/familyNormalizer', () => ({
  normalizeFamily: jest.fn()
}));

jest.mock('@/components/products/FamilyDisplay', () => ({
  FamilyDisplay: () => <div>FamilyDisplay</div>
}));

jest.mock('@/services/productService', () => ({
  productService: {
    getProductAssets: jest.fn(),
    updateProduct: jest.fn()
  }
}));

jest.mock('@/services/categoryService', () => ({
  updateProductCategory: jest.fn()
}));

jest.mock('@/components/categories/CategoryTreeSelect', () => ({
  CategoryTreeSelect: () => <div>CategoryTreeSelect</div>
}));

jest.mock('@/utils/images', () => ({
  pickPrimaryImage: jest.fn()
}));

jest.mock('@/utils/dateFormat', () => ({
  formatDisplayDate: jest.fn()
}));

// Create minimal required options for testing
const createMockOptions = (): UseProductColumnsOpts => ({
  // State
  editingCell: null,
  editValue: '',
  tagOptions: [
    { label: 'tech', value: 'tech' },
    { label: 'mobile', value: 'mobile' }
  ],
  categoryOptions: [
    { label: 'Electronics', value: 1 },
    { label: 'Books', value: 2 }
  ],

  // Setters
  setEditValue: jest.fn(),
  setCategoryOptions: jest.fn(),
  setProducts: jest.fn(),

  // Event handlers
  handleKeyDown: jest.fn(),
  handlePriceCellChange: jest.fn(),
  handleSaveCellEdit: jest.fn(),
  handleCancelEdit: jest.fn(),
  handleCellEdit: jest.fn(),
  handleCreateTagOption: jest.fn().mockResolvedValue({ label: 'new-tag', value: 'new-tag' }),
  updateData: jest.fn().mockResolvedValue(undefined),

  // Navigation and actions
  navigate: jest.fn(),
  handleRowClick: jest.fn(),
  handleDelete: jest.fn(),

  // Misc helpers
  toast: jest.fn(),
  fetchData: jest.fn(),
  IconBtn: ({ tooltip, onClick }) => (
    <button title={tooltip} onClick={onClick}>
      Icon
    </button>
  )
});

describe('useProductColumns', () => {
  test('should return an array of column definitions', () => {
    const mockOptions = createMockOptions();
    const { result } = renderHook(() => useProductColumns(mockOptions));

    expect(result.current.columns).toBeInstanceOf(Array);
    expect(result.current.columns.length).toBeGreaterThan(0);
  });

  test('should return columns with required properties', () => {
    const mockOptions = createMockOptions();
    const { result } = renderHook(() => useProductColumns(mockOptions));

    // Each column should have basic required properties
    result.current.columns.forEach(column => {
      expect(column).toHaveProperty('header');
      // Column should have either accessorKey or a custom cell function
      expect(
        column.hasOwnProperty('accessorKey') || 
        column.hasOwnProperty('cell') ||
        column.hasOwnProperty('id')
      ).toBe(true);
    });
  });

  test('should include expected core columns', () => {
    const mockOptions = createMockOptions();
    const { result } = renderHook(() => useProductColumns(mockOptions));

    const columnIds = result.current.columns.map(col => 
      col.id || (col as any).accessorKey
    );

    // Verify presence of core columns
    expect(columnIds).toContain('select');
    expect(columnIds).toContain('sku');
    expect(columnIds).toContain('name');
    expect(columnIds).toContain('thumbnail');
    expect(columnIds).toContain('category_name');
  });

  test('should return allColumns array', () => {
    const mockOptions = createMockOptions();
    const { result } = renderHook(() => useProductColumns(mockOptions));

    expect(result.current.allColumns).toBeInstanceOf(Array);
    expect(result.current.allColumns.length).toBeGreaterThan(0);
  });

  test('should handle editing state properly', () => {
    const mockOptions = createMockOptions();
    mockOptions.editingCell = { rowIndex: 0, columnId: 'sku' };
    mockOptions.editValue = 'test-sku';

    const { result } = renderHook(() => useProductColumns(mockOptions));

    // Should still return valid columns even when in editing state
    expect(result.current.columns).toBeInstanceOf(Array);
    expect(result.current.columns.length).toBeGreaterThan(0);
  });

  test('should handle empty tag and category options', () => {
    const mockOptions = createMockOptions();
    mockOptions.tagOptions = [];
    mockOptions.categoryOptions = [];

    const { result } = renderHook(() => useProductColumns(mockOptions));

    // Should still return valid columns with empty options
    expect(result.current.columns).toBeInstanceOf(Array);
    expect(result.current.columns.length).toBeGreaterThan(0);
  });

  test('should memoize column definitions properly', () => {
    const mockOptions = createMockOptions();
    const { result, rerender } = renderHook(() => useProductColumns(mockOptions));

    const firstResult = result.current.columns;

    // Rerender with same options
    rerender();

    // Should return same reference (memoized)
    expect(result.current.columns).toBe(firstResult);
  });

  test('should update when options change', () => {
    const mockOptions = createMockOptions();
    const { result, rerender } = renderHook(
      (props) => useProductColumns(props),
      { initialProps: mockOptions }
    );

    const firstResult = result.current.columns;

    // Change options
    const newOptions = {
      ...mockOptions,
      tagOptions: [{ label: 'new-tag', value: 'new-tag' }]
    };

    rerender(newOptions);

    // Should return new reference when options change
    expect(result.current.columns).not.toBe(firstResult);
  });
}); 