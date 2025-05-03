import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProductDetailDescription } from './ProductDetailDescription';
import { productService } from '@/services/productService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/services/productService', () => ({
  productService: {
    updateProduct: jest.fn(),
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

jest.mock('@/components/ui/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder, 'aria-label': ariaLabel }: any) => (
    <div data-testid="rich-text-editor">
      <label htmlFor="rich-text-input">{ariaLabel}</label>
      <textarea
        id="rich-text-input"
        data-testid="rich-text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  ),
}));

// Sample product data
const mockProduct = {
  id: 123,
  name: 'Test Product',
  sku: 'TEST-123',
  price: 99.99,
  description: 'This is a test product description',
  category: 'Test Category',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  created_by: 'Test User',
};

describe('ProductDetailDescription Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Current User' },
      checkPermission: () => true, // Default to having edit permission
    });
  });

  test('renders product description in view mode', () => {
    render(<ProductDetailDescription product={mockProduct} />);
    
    // Check if description is displayed
    expect(screen.getByText('This is a test product description')).toBeInTheDocument();
    
    // Check for edit button
    expect(screen.getByRole('button', { name: /edit product description/i })).toBeInTheDocument();
    
    // Check for last edited info
    expect(screen.getByText(/last edited by test user/i)).toBeInTheDocument();
  });

  test('renders empty state when no description is available', () => {
    const productWithoutDescription = { ...mockProduct, description: '' };
    render(<ProductDetailDescription product={productWithoutDescription} />);
    
    // Check for empty state message
    expect(screen.getByText('No description available for this product.')).toBeInTheDocument();
    
    // Check for add description button
    expect(screen.getByRole('button', { name: /add product description/i })).toBeInTheDocument();
  });

  test('enters edit mode when edit button is clicked', async () => {
    render(<ProductDetailDescription product={mockProduct} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Check if editor is displayed
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    
    // Check if textarea has current description
    const textArea = screen.getByTestId('rich-text-input');
    expect(textArea).toHaveValue('This is a test product description');
    
    // Check for save and cancel buttons
    expect(screen.getByRole('button', { name: /save description/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument();
  });

  test('updates description when editing and saving', async () => {
    const onProductUpdate = jest.fn();
    (productService.updateProduct as jest.Mock).mockResolvedValue({
      ...mockProduct,
      description: 'Updated description',
    });
    
    render(<ProductDetailDescription product={mockProduct} onProductUpdate={onProductUpdate} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Update description
    const textArea = screen.getByTestId('rich-text-input');
    fireEvent.change(textArea, { target: { value: 'Updated description' } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /save description/i });
    fireEvent.click(saveButton);
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith(
        123,
        { description: 'Updated description' }
      );
    });
    
    // Check if onProductUpdate callback was called
    expect(onProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Updated description',
      })
    );
    
    // Check if success toast was shown
    expect(toast.success).toHaveBeenCalledWith('Description updated successfully');
  });

  test('cancels editing when cancel button is clicked', async () => {
    render(<ProductDetailDescription product={mockProduct} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Update description
    const textArea = screen.getByTestId('rich-text-input');
    fireEvent.change(textArea, { target: { value: 'Changed description that should not save' } });
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
    fireEvent.click(cancelButton);
    
    // Check if we're back in view mode with original description
    expect(screen.getByText('This is a test product description')).toBeInTheDocument();
    
    // API should not have been called
    expect(productService.updateProduct).not.toHaveBeenCalled();
  });

  test('shows error message when saving fails', async () => {
    const onProductUpdate = jest.fn();
    (productService.updateProduct as jest.Mock).mockRejectedValue({
      response: {
        data: {
          message: 'Server error: Failed to update product'
        }
      }
    });
    
    render(<ProductDetailDescription product={mockProduct} onProductUpdate={onProductUpdate} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Update description
    const textArea = screen.getByTestId('rich-text-input');
    fireEvent.change(textArea, { target: { value: 'Updated description' } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /save description/i });
    fireEvent.click(saveButton);
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Server error: Failed to update product')).toBeInTheDocument();
    });
    
    // Check if retry button is displayed
    expect(screen.getByRole('button', { name: /retry saving description/i })).toBeInTheDocument();
    
    // Check if error toast was shown
    expect(toast.error).toHaveBeenCalledWith('Failed to update description');
  });

  test('validates character limit', async () => {
    render(<ProductDetailDescription product={mockProduct} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Create a string longer than 10000 characters
    const longText = 'a'.repeat(10001);
    
    // Update description
    const textArea = screen.getByTestId('rich-text-input');
    fireEvent.change(textArea, { target: { value: longText } });
    
    // Check if character count shows error
    await waitFor(() => {
      const charCount = screen.getByText(/\/10,000 characters/i);
      expect(charCount).toHaveClass('text-red-500');
    });
    
    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /save description/i });
    expect(saveButton).toBeDisabled();
    
    // Should show over limit message
    expect(screen.getByText(/\(1 over limit\)/i)).toBeInTheDocument();
  });

  test('respects permissions for editing', () => {
    // Mock no edit permission
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Current User' },
      checkPermission: (permission: string) => permission !== 'product.edit',
    });
    
    render(<ProductDetailDescription product={mockProduct} />);
    
    // Edit button should not be visible
    expect(screen.queryByRole('button', { name: /edit product description/i })).not.toBeInTheDocument();
  });

  test('retries saving when retry button is clicked', async () => {
    const onProductUpdate = jest.fn();
    
    // First reject, then resolve on retry
    (productService.updateProduct as jest.Mock)
      .mockRejectedValueOnce({
        response: {
          data: {
            message: 'Server error: Failed to update product'
          }
        }
      })
      .mockResolvedValueOnce({
        ...mockProduct,
        description: 'Updated description',
      });
    
    render(<ProductDetailDescription product={mockProduct} onProductUpdate={onProductUpdate} />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit product description/i });
    fireEvent.click(editButton);
    
    // Update description
    const textArea = screen.getByTestId('rich-text-input');
    fireEvent.change(textArea, { target: { value: 'Updated description' } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /save description/i });
    fireEvent.click(saveButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Server error: Failed to update product')).toBeInTheDocument();
    });
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry saving description/i });
    fireEvent.click(retryButton);
    
    // Check if API was called again
    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledTimes(2);
    });
    
    // Check if success toast was shown after retry
    expect(toast.success).toHaveBeenCalledWith('Description updated successfully');
  });
}); 