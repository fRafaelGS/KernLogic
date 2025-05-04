import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RelatedProductsPanel from './RelatedProductsPanel';
import { productService } from '@/services/productService';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi } from 'vitest';

// Mock the productService
vi.mock('@/services/productService', () => ({
  productService: {
    getRelatedProducts: vi.fn(),
    getExplicitRelations: vi.fn(),
    removeRelatedProduct: vi.fn(),
    toggleRelatedProduct: vi.fn(),
    updateRelationship: vi.fn(),
    addMultipleRelatedProducts: vi.fn()
  },
  RelationshipType: {
    ACCESSORY: 'accessory',
    VARIANT: 'variant',
    FREQUENTLY_BOUGHT_TOGETHER: 'frequently_bought_together',
    REPLACEMENT: 'replacement'
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

// Mock EnhancedAddRelatedProductPanel since we're testing that separately
vi.mock('./EnhancedAddRelatedProductPanel', () => ({
  __esModule: true,
  default: ({ onProductAdded, onMultipleProductsAdded }) => (
    <div data-testid="mock-add-panel">
      <button 
        data-testid="mock-add-single" 
        onClick={() => onProductAdded({ id: 999, name: 'New Product', sku: 'NEW123', price: 29.99, category: 'Test', is_active: true, description: '' }, 'accessory')}
      >
        Add Single
      </button>
      <button 
        data-testid="mock-add-multiple" 
        onClick={() => onMultipleProductsAdded([888, 777], 'variant')}
      >
        Add Multiple
      </button>
    </div>
  )
}));

// Sample data for tests
const mockProductId = 123;
const mockProducts = [
  { id: 111, name: 'Test Product 1', sku: 'TP111', price: 19.99, category: 'Category A', is_active: true, description: '' },
  { id: 222, name: 'Test Product 2', sku: 'TP222', price: 29.99, category: 'Category B', is_active: true, description: '' },
  { id: 333, name: 'Test Product 3', sku: 'TP333', price: 39.99, category: 'Category A', is_active: true, description: '' },
];

const mockExplicitRelations = [
  { 
    id: 1, 
    product_id: 123, 
    related_product_id: 111, 
    relationship_type: 'accessory', 
    is_pinned: true, 
    created_at: '2023-01-01T12:00:00Z',
    created_by: 'user1',
    source: 'manual',
    notes: 'Test note 1'
  },
  { 
    id: 2, 
    product_id: 123, 
    related_product_id: 222, 
    relationship_type: 'variant', 
    is_pinned: false, 
    created_at: '2023-01-02T12:00:00Z',
    created_by: 'user2',
    source: 'algorithm',
    notes: ''
  },
];

// Helper function to render component with router
const renderWithRouter = (ui: React.ReactNode) => {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        {ui}
      </TooltipProvider>
    </MemoryRouter>
  );
};

describe('RelatedProductsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set up default mocks
    (productService.getRelatedProducts as any).mockResolvedValue(mockProducts);
    (productService.getExplicitRelations as any).mockResolvedValue(mockExplicitRelations);
    (productService.removeRelatedProduct as any).mockResolvedValue(true);
    (productService.toggleRelatedProduct as any).mockResolvedValue(true);
    (productService.updateRelationship as any).mockResolvedValue(true);
    (productService.addMultipleRelatedProducts as any).mockResolvedValue({ success: true, processed: 2, failed: 0 });
  });

  test('renders loading state initially', async () => {
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Check for loading indicators
    expect(screen.getAllByTestId(/skeleton/i).length).toBeGreaterThan(0);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(productService.getRelatedProducts).toHaveBeenCalledWith(mockProductId);
    });
  });

  test('displays related products after loading', async () => {
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Product 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Product 3')).toBeInTheDocument();
    });
  });

  test('displays different badges for manual vs algorithmic relations', async () => {
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for data to load
    await waitFor(() => {
      // Product 1 should have a manually added badge
      const product1Card = screen.getByText('Test Product 1').closest('.card');
      expect(product1Card).toContainElement(screen.getByText('Manually added'));
      
      // Product 2 should have a suggested badge
      const product2Card = screen.getByText('Test Product 2').closest('.card');
      expect(product2Card).toContainElement(screen.getByText('Suggested'));
    });
  });

  test('allows removing a related product', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).toBeInTheDocument();
    });
    
    // Find and click the remove button for product 1
    const product1Card = screen.getByText('Test Product 1').closest('.card');
    await user.hover(product1Card!);
    
    // The remove button appears on hover
    const removeButton = screen.getByRole('button', { name: /remove related product/i });
    await user.click(removeButton);
    
    // Verify the API was called
    expect(productService.removeRelatedProduct).toHaveBeenCalledWith(mockProductId, 111);
  });

  test('allows editing relationship type', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).toBeInTheDocument();
    });
    
    // Find and click the edit button for product 1
    const product1Card = screen.getByText('Test Product 1').closest('.card');
    await user.hover(product1Card!);
    
    // The edit button appears on hover
    const editButton = screen.getByRole('button', { name: /edit relationship/i });
    await user.click(editButton);
    
    // Verify the edit dialog appears
    expect(screen.getByText('Edit Relationship')).toBeInTheDocument();
    
    // Change relationship type
    const selectElement = screen.getByRole('combobox');
    await user.click(selectElement);
    await user.click(screen.getByText('Replacement'));
    
    // Add notes
    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'New test note');
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    // Verify API called with right parameters
    expect(productService.updateRelationship).toHaveBeenCalledWith(
      mockProductId,
      111,
      { relationship_type: 'replacement', notes: 'New test note' }
    );
  });

  test('shows empty state when no related products', async () => {
    // Override mock to return empty array
    (productService.getRelatedProducts as any).mockResolvedValue([]);
    
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Add your first related product')).toBeInTheDocument();
      expect(screen.queryByText('Why add related products?')).toBeInTheDocument();
    });
  });

  test('handles adding a single product', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(productService.getRelatedProducts).toHaveBeenCalled();
    });
    
    // Click the mock add button
    await user.click(screen.getByTestId('mock-add-single'));
    
    // Verify API was called
    expect(productService.toggleRelatedProduct).toHaveBeenCalledWith(mockProductId, 999, true);
    expect(productService.updateRelationship).toHaveBeenCalledWith(
      mockProductId,
      999,
      { relationship_type: 'accessory' }
    );
  });

  test('handles adding multiple products', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(productService.getRelatedProducts).toHaveBeenCalled();
    });
    
    // Click the mock add multiple button
    await user.click(screen.getByTestId('mock-add-multiple'));
    
    // Verify API was called
    expect(productService.addMultipleRelatedProducts).toHaveBeenCalledWith(
      mockProductId,
      [888, 777],
      'variant'
    );
  });

  test('handles errors when loading products', async () => {
    // Override mock to simulate error
    (productService.getRelatedProducts as any).mockRejectedValue(new Error('Network error'));
    
    renderWithRouter(<RelatedProductsPanel productId={mockProductId} />);
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByText('Failed to load related products')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
}); 