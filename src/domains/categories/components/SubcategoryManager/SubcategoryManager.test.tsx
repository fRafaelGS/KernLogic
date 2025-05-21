import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubcategoryManager } from '@/domains/categories/components/SubcategoryManager/SubcategoryManager';
import { useCategories } from '@/domains/categories/components/SubcategoryManager/useCategories';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { Category } from '@/domains/products/types/categories';

// Mock the useCategories hook
jest.mock('./useCategories', () => ({
  useCategories: jest.fn()
}));

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock react-router-dom hooks if they're used
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// Mock data
const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Electronics',
    parent: null,
    children: [
      {
        id: 3,
        name: 'Laptops',
        parent: 1,
        children: []
      },
      {
        id: 4,
        name: 'Phones',
        parent: 1,
        children: []
      }
    ]
  },
  {
    id: 2,
    name: 'Clothing',
    parent: null,
    children: []
  }
];

// Setup function for common test setup
const setup = (
  categoriesData = {
    categories: mockCategories,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    findCategoryById: jest.fn((id) => mockCategories.find(c => c.id === id) || null),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isMoving: false,
    error: null,
    moveCategory: jest.fn()
  },
  authData = {
    checkPermission: jest.fn().mockImplementation((permission) => true)
  }
) => {
  (useCategories as jest.Mock).mockReturnValue(categoriesData);
  (useAuth as jest.Mock).mockReturnValue(authData);
  return render(<SubcategoryManager />);
};

describe('SubcategoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the manage categories button', () => {
    setup();
    expect(screen.getByText('Manage Categories')).toBeInTheDocument();
  });

  test('opens the modal when button is clicked', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    expect(screen.getByText('Category Management')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    setup({
      categories: [],
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: null,
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    user.click(screen.getByText('Manage Categories'));
    
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  test('displays error state and retry button', async () => {
    const mockRefetch = jest.fn();
    setup({
      categories: [],
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: new Error('Failed to fetch'),
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  test('renders category tree correctly', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
  });

  test('selects a category when clicked', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Initially no category is selected, so Edit tab should be disabled
    const editTab = screen.getByRole('tab', { name: /edit/i });
    expect(editTab).toHaveAttribute('aria-disabled', 'true');
    
    // Select a category
    await user.click(screen.getByText('Electronics'));
    
    // Now the Edit tab should be enabled
    expect(editTab).toHaveAttribute('aria-disabled', 'false');
    
    // Switch to edit tab
    await user.click(editTab);
    
    // Edit form should show the selected category
    expect(screen.getByText('Currently editing: Electronics')).toBeInTheDocument();
  });

  test('creates a new top-level category', async () => {
    const mockCreateCategory = jest.fn();
    setup({
      categories: mockCategories,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      createCategory: mockCreateCategory,
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: null,
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Fill in the new category name
    const input = screen.getByPlaceholderText('Enter category name');
    await user.type(input, 'Furniture');
    
    // Submit the form
    await user.click(screen.getByText('Create'));
    
    // Check if createCategory was called with the right arguments
    expect(mockCreateCategory).toHaveBeenCalledWith('Furniture', null);
  });

  test('creates a subcategory', async () => {
    const mockCreateCategory = jest.fn();
    setup({
      categories: mockCategories,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      createCategory: mockCreateCategory,
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: null,
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Select a parent category
    await user.click(screen.getByText('Electronics'));
    
    // Fill in the new subcategory name
    const input = screen.getByPlaceholderText('Enter category name');
    await user.type(input, 'Tablets');
    
    // Submit the form
    await user.click(screen.getByText('Create'));
    
    // Check if createCategory was called with the right arguments
    expect(mockCreateCategory).toHaveBeenCalledWith('Tablets', 1);
  });

  test('updates a category name', async () => {
    const mockUpdateCategory = jest.fn();
    setup({
      categories: mockCategories,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: mockUpdateCategory,
      deleteCategory: jest.fn(),
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: null,
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Select a category
    await user.click(screen.getByText('Electronics'));
    
    // Switch to edit tab
    await user.click(screen.getByRole('tab', { name: /edit/i }));
    
    // Change the category name
    const input = screen.getByDisplayValue('Electronics');
    await user.clear(input);
    await user.type(input, 'Computer Hardware');
    
    // Submit the form
    await user.click(screen.getByText('Update'));
    
    // Check if updateCategory was called with the right arguments
    expect(mockUpdateCategory).toHaveBeenCalledWith(1, {
      name: 'Computer Hardware',
      parent: null
    });
  });

  test('deletes a category', async () => {
    const mockDeleteCategory = jest.fn();
    setup({
      categories: mockCategories,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: mockDeleteCategory,
      findCategoryById: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMoving: false,
      error: null,
      moveCategory: jest.fn()
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Select a category
    await user.click(screen.getByText('Clothing'));
    
    // Switch to edit tab
    await user.click(screen.getByRole('tab', { name: /edit/i }));
    
    // Click delete button
    await user.click(screen.getByText('Delete Category'));
    
    // Confirm deletion
    await user.click(screen.getByText('Delete'));
    
    // Check if deleteCategory was called with the right arguments
    expect(mockDeleteCategory).toHaveBeenCalledWith(2);
  });

  test('expands and collapses a category with children', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Initially subcategories should not be visible
    expect(screen.queryByText('Laptops')).not.toBeInTheDocument();
    
    // Find and click the expand button (the chevron) for Electronics
    const expandButtons = screen.getAllByRole('treeitem');
    const electronicsItem = expandButtons.find(item => item.textContent?.includes('Electronics'));
    
    if (electronicsItem) {
      const chevron = electronicsItem.querySelector('svg');
      if (chevron) {
        await user.click(chevron);
      }
    }
    
    // Now subcategories should be visible
    expect(screen.getByText('Laptops')).toBeInTheDocument();
    expect(screen.getByText('Phones')).toBeInTheDocument();
    
    // Click again to collapse
    if (electronicsItem) {
      const chevron = electronicsItem.querySelector('svg');
      if (chevron) {
        await user.click(chevron);
      }
    }
    
    // Subcategories should be hidden again
    expect(screen.queryByText('Laptops')).not.toBeInTheDocument();
  });

  test('filters categories by search term', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // Initially all categories should be visible
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Type to search...');
    await user.type(searchInput, 'Cloth');
    
    // Now only matching categories should be visible
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
  });

  test('respects permissions for category operations', async () => {
    // Setup with restricted permissions
    setup(
      {
        categories: mockCategories,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategory: jest.fn(),
        findCategoryById: jest.fn(),
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        isMoving: false,
        error: null,
        moveCategory: jest.fn()
      },
      {
        checkPermission: jest.fn().mockImplementation((permission) => {
          return {
            'category.add': false,
            'category.change': true,
            'category.delete': false
          }[permission] || false;
        })
      }
    );
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Manage Categories'));
    
    // The create form should be hidden due to missing category.add permission
    expect(screen.queryByPlaceholderText('Enter category name')).not.toBeInTheDocument();
    
    // Select a category and switch to edit tab
    await user.click(screen.getByText('Electronics'));
    await user.click(screen.getByRole('tab', { name: /edit/i }));
    
    // Edit form should be visible because category.change permission is granted
    expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument();
    
    // Delete button should be hidden due to missing category.delete permission
    expect(screen.queryByText('Delete Category')).not.toBeInTheDocument();
  });
}); 