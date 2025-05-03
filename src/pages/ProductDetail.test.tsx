import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProductDetail } from './ProductDetail';
import { productService } from '@/services/productService';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/services/productService', () => ({
  productService: {
    getProduct: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

jest.mock('@/components/products/ProductDetailLayout', () => ({
  ProductDetailLayout: ({ sidebar, content }: { sidebar: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="product-detail-layout">
      <div data-testid="product-detail-sidebar">{sidebar}</div>
      <div data-testid="product-detail-content">{content}</div>
    </div>
  ),
}));

jest.mock('@/components/products/ProductDetailSidebar', () => ({
  ProductDetailSidebar: ({ product }: any) => (
    <div data-testid="product-sidebar">
      <span>SKU: {product.sku}</span>
    </div>
  ),
}));

jest.mock('@/components/products/ProductDetailTabs', () => ({
  ProductDetailTabs: ({ product }: any) => (
    <div data-testid="product-tabs">
      <span>Product ID: {product.id}</span>
    </div>
  ),
}));

jest.mock('@/components/products/ProductDetailDescription', () => ({
  ProductDetailDescription: ({ product, onProductUpdate }: any) => (
    <div data-testid="product-description">
      <span>Description: {product.description || 'No description'}</span>
      <button 
        onClick={() => onProductUpdate({ ...product, description: 'Updated description' })}
        data-testid="update-description-btn"
      >
        Update Description
      </button>
    </div>
  ),
}));

// Mock window.confirm
window.confirm = jest.fn();

// Sample product data
const mockProduct = {
  id: 123,
  name: 'Test Product',
  sku: 'TEST-123',
  price: 99.99,
  description: 'This is a test product',
  category: 'Test Category',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
};

describe('ProductDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      checkPermission: () => true, // Default to full permissions
    });
  });

  test('renders loading state correctly', async () => {
    // Mock API call to delay resolution
    (productService.getProduct as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockProduct), 100))
    );

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Check if loading state components are rendered
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    
    // Check for skeleton loaders
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Test Product')).toBeInTheDocument();
    });
  });

  test('renders error state when API fails', async () => {
    // Mock API call to reject with error
    (productService.getProduct as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText(/failed to load product details/i)).toBeInTheDocument();
    });
    
    // Check for retry button
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  test('renders product details correctly when API succeeds', async () => {
    // Mock successful API response
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Check for product metadata
    expect(screen.getByText(/sku: test-123/i)).toBeInTheDocument();
    expect(screen.getByText(/description: this is a test product/i)).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  test('handles product update from description component', async () => {
    // Mock successful API response
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Click the update description button
    const updateButton = screen.getByTestId('update-description-btn');
    fireEvent.click(updateButton);
    
    // Check if the description was updated
    await waitFor(() => {
      expect(screen.getByText(/description: updated description/i)).toBeInTheDocument();
    });
  });

  test('handles product deletion', async () => {
    // Mock successful API responses
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);
    (productService.deleteProduct as jest.Mock).mockResolvedValue({});
    (window.confirm as jest.Mock).mockReturnValue(true); // User confirms deletion

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
          <Route path="/app/products" element={<div>Products List</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Click the delete button
    const deleteButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(deleteButton);
    
    // Check if confirmation was shown
    expect(window.confirm).toHaveBeenCalled();
    
    // Check if delete API was called
    await waitFor(() => {
      expect(productService.deleteProduct).toHaveBeenCalledWith(123);
    });
    
    // Check if toast was shown
    expect(toast.success).toHaveBeenCalledWith('Product archived successfully');
    
    // Check if navigation happened
    await waitFor(() => {
      expect(screen.getByText('Products List')).toBeInTheDocument();
    });
  });

  test('cancels product deletion when user cancels confirmation', async () => {
    // Mock successful API response
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);
    (window.confirm as jest.Mock).mockReturnValue(false); // User cancels deletion

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Click the delete button
    const deleteButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(deleteButton);
    
    // Check if confirmation was shown
    expect(window.confirm).toHaveBeenCalled();
    
    // Check if delete API was NOT called
    expect(productService.deleteProduct).not.toHaveBeenCalled();
    
    // Should still be on the same page
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  test('handles duplicate product functionality', async () => {
    // Mock successful API responses
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);
    
    const duplicatedProduct = {
      ...mockProduct,
      id: 456,
      name: 'Test Product (Copy)',
      sku: 'TEST-123-COPY',
    };
    
    (productService.createProduct as jest.Mock).mockResolvedValue(duplicatedProduct);

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Click the duplicate button
    const duplicateButton = screen.getByRole('button', { name: /duplicate/i });
    fireEvent.click(duplicateButton);
    
    // Check if createProduct API was called with the correct data
    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ 
          name: 'Test Product (Copy)', 
          sku: 'TEST-123-COPY' 
        })
      );
    });
    
    // Check if toast was shown
    expect(toast.success).toHaveBeenCalledWith('Product duplicated successfully');
  });

  test('respects role-based permissions', async () => {
    // Mock permissions to disallow editing and deleting
    (useAuth as jest.Mock).mockReturnValue({
      checkPermission: (permission: string) => {
        if (permission === 'product.edit') return false;
        if (permission === 'product.delete') return false;
        return true;
      },
    });
    
    // Mock successful API response
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);

    render(
      <MemoryRouter initialEntries={['/app/products/123']}>
        <Routes>
          <Route path="/app/products/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to render
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Edit and Delete buttons should not be present
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    
    // Duplicate button should still be present
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
  });
}); 