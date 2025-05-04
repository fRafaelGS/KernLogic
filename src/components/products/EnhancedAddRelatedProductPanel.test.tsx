import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedAddRelatedProductPanel from './EnhancedAddRelatedProductPanel';
import { productService, RelationshipType } from '@/services/productService';
import { vi } from 'vitest';

// Mock the productService
vi.mock('@/services/productService', () => ({
  productService: {
    searchProducts: vi.fn(),
  },
  RelationshipType: {
    ACCESSORY: 'accessory',
    VARIANT: 'variant',
    FREQUENTLY_BOUGHT_TOGETHER: 'frequently_bought_together',
    REPLACEMENT: 'replacement',
    SIMILAR: 'similar',
    GENERAL: 'general',
  }
}));

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}));

// Mock debounce to execute immediately in tests
vi.mock('lodash', () => ({
  debounce: (fn: Function) => fn,
}));

describe('EnhancedAddRelatedProductPanel', () => {
  const mockProductId = 123;
  const mockRelatedProducts = [
    { id: 111, name: 'Related Product 1', sku: 'REL111', price: 19.99, category: 'Category A', is_active: true, description: '' },
  ];
  const mockSearchResults = [
    { id: 222, name: 'Search Result 1', sku: 'SR222', price: 29.99, category: 'Category B', is_active: true, description: '' },
    { id: 333, name: 'Search Result 2', sku: 'SR333', price: 39.99, category: 'Category C', is_active: true, description: '' },
  ];
  
  const mockHandleProductAdded = vi.fn();
  const mockHandleMultipleProductsAdded = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
    (productService.searchProducts as jest.Mock).mockResolvedValue(mockSearchResults);
  });
  
  test('renders with default relationship type', () => {
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    expect(screen.getByText('Add Related Products')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('general');
  });
  
  test('searches for products when typing in the search field', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    const searchInput = screen.getByRole('textbox', { name: /search for products/i });
    await user.type(searchInput, 'test query');
    
    expect(productService.searchProducts).toHaveBeenCalledWith('test query');
    
    // Wait for search results to be displayed
    await waitFor(() => {
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
      expect(screen.getByText('Search Result 2')).toBeInTheDocument();
    });
  });
  
  test('selects and deselects products', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    // Search for products
    const searchInput = screen.getByRole('textbox', { name: /search for products/i });
    await user.type(searchInput, 'test');
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });
    
    // Select the first search result
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(firstCheckbox);
    
    // The "Add Selected" button should show count of 1
    expect(screen.getByRole('button', { name: /add selected \(1\)/i })).toBeInTheDocument();
    
    // Deselect the product
    await user.click(firstCheckbox);
    
    // The button should reset to "Add Selected (0)" and be disabled
    const addButton = screen.getByRole('button', { name: /add selected \(0\)/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  });
  
  test('adds multiple selected products', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    // Search for products
    const searchInput = screen.getByRole('textbox', { name: /search for products/i });
    await user.type(searchInput, 'test');
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
      expect(screen.getByText('Search Result 2')).toBeInTheDocument();
    });
    
    // Select both search results
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    
    // Change relationship type
    const selectElement = screen.getByRole('combobox');
    await user.click(selectElement);
    await user.click(screen.getByRole('option', { name: 'Accessory' }));
    
    // Click the "Add Selected" button
    const addButton = screen.getByRole('button', { name: /add selected \(2\)/i });
    await user.click(addButton);
    
    // Verify callback was called with correct parameters
    expect(mockHandleMultipleProductsAdded).toHaveBeenCalledWith([222, 333], 'accessory');
  });
  
  test('adds a suggested product', async () => {
    const user = userEvent.setup();
    
    // Set up loadAlgorithmicSuggestions mock
    (productService.searchProducts as jest.Mock).mockResolvedValueOnce([
      { id: 444, name: 'Suggested Product', sku: 'SUG444', price: 49.99, category: 'Category D', is_active: true, description: '' },
    ]);
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.getByText('Suggested Products')).toBeInTheDocument();
      expect(screen.getByText('Suggested Product')).toBeInTheDocument();
    });
    
    // Change relationship type
    const selectElement = screen.getByRole('combobox');
    await user.click(selectElement);
    await user.click(screen.getByRole('option', { name: 'Bought Together' }));
    
    // Add the suggested product
    const addButton = screen.getByRole('button', { name: '' }); // The + button has only an icon
    await user.click(addButton);
    
    // Verify callback was called with correct parameters
    expect(mockHandleProductAdded).toHaveBeenCalledWith(
      { id: 444, name: 'Suggested Product', sku: 'SUG444', price: 49.99, category: 'Category D', is_active: true, description: '' },
      'frequently_bought_together'
    );
  });
  
  test('handles no search results', async () => {
    const user = userEvent.setup();
    
    // Override search mock to return empty array
    (productService.searchProducts as jest.Mock).mockResolvedValue([]);
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    // Search for products
    const searchInput = screen.getByRole('textbox', { name: /search for products/i });
    await user.type(searchInput, 'nonexistent product');
    
    // Wait for "no results" message
    await waitFor(() => {
      expect(screen.getByText('No matching products found')).toBeInTheDocument();
    });
  });
  
  test('handles error when searching products', async () => {
    const user = userEvent.setup();
    
    // Override search mock to throw error
    (productService.searchProducts as jest.Mock).mockRejectedValue(new Error('API error'));
    
    render(
      <EnhancedAddRelatedProductPanel
        productId={mockProductId}
        relatedProducts={mockRelatedProducts}
        onProductAdded={mockHandleProductAdded}
        onMultipleProductsAdded={mockHandleMultipleProductsAdded}
      />
    );
    
    // Search for products
    const searchInput = screen.getByRole('textbox', { name: /search for products/i });
    await user.type(searchInput, 'test');
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to search products')).toBeInTheDocument();
    });
  });
}); 