import { renderHook } from '@testing-library/react';
import { useUniqueCategories, useUniqueTags } from '@/hooks/useProductDerived';
import type { Product } from '@/services/productService';

// Mock products for testing
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Product 1',
    sku: 'SKU001',
    description: 'Test product 1',
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    category: [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Mobile Phones' }
    ],
    tags: ['tech', 'mobile', 'smartphone']
  },
  {
    id: 2,
    name: 'Product 2',
    sku: 'SKU002',
    description: 'Test product 2',
    is_active: true,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    status: 'active',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    category: [
      { id: 1, name: 'Electronics' },
      { id: 3, name: 'Laptops' }
    ],
    tags: ['tech', 'computer', 'laptop']
  },
  {
    id: 3,
    name: 'Product 3',
    sku: 'SKU003',
    description: 'Test product 3',
    is_active: false,
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    status: 'inactive',
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z',
    category: { id: 4, name: 'Books' },
    tags: ['education', 'reading']
  }
];

describe('useUniqueCategories', () => {
  test('should extract unique categories from mixed list of products', () => {
    const { result } = renderHook(() => useUniqueCategories(mockProducts));
    
    // Expect sorted array of unique category names
    expect(result.current).toEqual(['Books', 'Electronics', 'Laptops', 'Mobile Phones']);
  });

  test('should return empty array for empty input', () => {
    const { result } = renderHook(() => useUniqueCategories([]));
    
    expect(result.current).toEqual([]);
  });

  test('should handle products with undefined categories', () => {
    const productsWithUndefinedCategories = [
      {
        ...mockProducts[0],
        category: undefined
      } as unknown as Product,
      mockProducts[1]
    ];
    
    const { result } = renderHook(() => useUniqueCategories(productsWithUndefinedCategories));
    
    // Should still extract categories from valid products
    expect(result.current).toEqual(['Electronics', 'Laptops']);
  });

  test('should handle products with string categories', () => {
    const productsWithStringCategories = [
      {
        ...mockProducts[0],
        category: 'Simple Category'
      } as Product
    ];
    
    const { result } = renderHook(() => useUniqueCategories(productsWithStringCategories));
    
    expect(result.current).toEqual([]);
  });
});

describe('useUniqueTags', () => {
  test('should extract unique tags from mixed list of products', () => {
    const { result } = renderHook(() => useUniqueTags(mockProducts));
    
    // Expect array of unique tag strings
    expect(result.current).toEqual(['tech', 'mobile', 'smartphone', 'computer', 'laptop', 'education', 'reading']);
  });

  test('should return empty array for empty input', () => {
    const { result } = renderHook(() => useUniqueTags([]));
    
    expect(result.current).toEqual([]);
  });

  test('should handle products with undefined tags', () => {
    const productsWithUndefinedTags = [
      {
        ...mockProducts[0],
        tags: undefined
      } as unknown as Product,
      {
        ...mockProducts[1],
        tags: ['only-tag']
      }
    ];
    
    const { result } = renderHook(() => useUniqueTags(productsWithUndefinedTags));
    
    expect(result.current).toEqual(['only-tag']);
  });

  test('should handle non-array input gracefully', () => {
    const invalidInput = 'not-an-array' as any;
    const { result } = renderHook(() => useUniqueTags(invalidInput));
    
    expect(result.current).toEqual([]);
  });

  test('should convert non-string tags to strings', () => {
    const productsWithMixedTags = [
      {
        ...mockProducts[0],
        tags: [123, 'string-tag', null, undefined] as any
      } as unknown as Product
    ];
    
    const { result } = renderHook(() => useUniqueTags(productsWithMixedTags));
    
    // Should filter out null/undefined and convert numbers to strings
    expect(result.current).toEqual(['123', 'string-tag']);
  });
}); 