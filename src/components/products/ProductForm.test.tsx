import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProductForm } from './ProductForm';
import { Product } from '@/services/productService';
import { AuthProvider } from '@/contexts/AuthContext'; // Mock or provide context
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For useQuery hook
import { BrowserRouter } from 'react-router-dom'; // For useNavigate hook

// Mock dependencies
const mockNavigate = jest.fn();
const mockAddNotification = jest.fn();
const mockProductService = {
  getCategories: jest.fn().mockResolvedValue(['Test Category', 'Another Category']),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    addNotification: mockAddNotification,
    user: { name: 'Test User', email: 'test@example.com' }, // Provide mock user if needed
  }),
}));

jest.mock('@/services/productService', () => ({
  productService: mockProductService,
}));

// Mock TipTap Editor (basic)
jest.mock('@/components/ui/RichTextEditor', () => ({
    RichTextEditor: ({ value, onChange, disabled, error }: any) => (
        <textarea 
            data-testid="description-editor"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            aria-invalid={error}
        />
    )
}));

const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    description: '<p>Initial Description</p>',
    sku: 'TESTSKU123',
    price: 99.99,
    stock: 50,
    category: 'Test Category',
    is_active: true,
};

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // Disable retries for tests
});

const renderComponent = (product = mockProduct) => {
    return render(
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                {/* Mock AuthProvider if needed or use the mock directly */}
                <ProductForm product={product} />
            </QueryClientProvider>
        </BrowserRouter>
    );
};

describe('ProductForm', () => {
    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();
        queryClient.clear(); // Clear react-query cache
    });

    test('renders form with initial product data', async () => {
        renderComponent();
        expect(screen.getByLabelText(/product name/i)).toHaveValue(mockProduct.name);
        expect(screen.getByLabelText(/sku/i)).toHaveValue(mockProduct.sku);
        expect(screen.getByTestId('description-editor')).toHaveValue(mockProduct.description);
        expect(screen.getByLabelText(/price/i)).toHaveValue(mockProduct.price);
        expect(screen.getByLabelText(/stock quantity/i)).toHaveValue(mockProduct.stock);
        // Check if category is selected (might need waitFor if async)
        await waitFor(() => {
             expect(screen.getByRole('combobox', { name: /category/i })).toHaveTextContent(mockProduct.category);
        });
    });

    test('shows validation error for empty name', async () => {
        renderComponent();
        const nameInput = screen.getByLabelText(/product name/i);
        await userEvent.clear(nameInput);
        // fireEvent.blur(nameInput); // RHF mode: onChange triggers validation
        expect(await screen.findByRole('alert')).toHaveTextContent(/name must be at least 3 characters/i);
    });

    test('shows validation error for invalid SKU', async () => {
        renderComponent();
        const skuInput = screen.getByLabelText(/sku/i);
        await userEvent.clear(skuInput);
        await userEvent.type(skuInput, 'SKU 123'); // Contains space
        expect(await screen.findByRole('alert')).toHaveTextContent(/sku must be alphanumeric/i);
    });

    test('shows validation error for negative price', async () => {
        renderComponent();
        const priceInput = screen.getByLabelText(/price/i);
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '-10');
        expect(await screen.findByRole('alert')).toHaveTextContent(/price must be positive/i);
    });

     test('shows validation error for non-integer stock', async () => {
        renderComponent();
        const stockInput = screen.getByLabelText(/stock quantity/i);
        await userEvent.clear(stockInput);
        await userEvent.type(stockInput, '10.5');
        expect(await screen.findByRole('alert')).toHaveTextContent(/stock must be a whole number/i);
    });

    test('successfully submits updated data', async () => {
        const updatedName = 'Updated Test Product';
        const updatedData = { ...mockProduct, name: updatedName };
        mockProductService.updateProduct.mockResolvedValue(updatedData); // Mock successful update

        renderComponent();
        const nameInput = screen.getByLabelText(/product name/i);
        const saveButton = screen.getByRole('button', { name: /save changes/i });

        // Change name and submit
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, updatedName);
        await userEvent.click(saveButton);

        // Check if update service was called correctly
        await waitFor(() => {
            expect(mockProductService.updateProduct).toHaveBeenCalledWith(mockProduct.id, expect.objectContaining({ name: updatedName }));
        });

        // Check for success toast (via notification mock)
        expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', message: 'Product Updated' }));
        
        // Check if form reset with new data (Save button should be disabled again)
        expect(saveButton).toBeDisabled();
        expect(nameInput).toHaveValue(updatedName);
    });

    test('handles duplicate SKU error from server', async () => {
        const duplicateSkuError = { 
            response: { 
                data: { sku: ['Product with this SKU already exists.'] }, 
                status: 400 
            }
        };
        mockProductService.updateProduct.mockRejectedValue(duplicateSkuError); // Mock server error

        renderComponent();
        const nameInput = screen.getByLabelText(/product name/i);
        const skuInput = screen.getByLabelText(/sku/i);
        const saveButton = screen.getByRole('button', { name: /save changes/i });

        // Make a change to enable save, keep SKU same (or change it)
        await userEvent.type(nameInput, ' Minor Change'); 
        await userEvent.click(saveButton);

        // Check if update service was called
        await waitFor(() => {
            expect(mockProductService.updateProduct).toHaveBeenCalled();
        });

        // Check for error toast/notification
        expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Product Update Failed' }));
        
        // Check for inline SKU error message from server
        expect(await screen.findByRole('alert')).toHaveTextContent(/product with this sku already exists/i);
        expect(skuInput).toHaveAttribute('aria-invalid', 'true');
        
        // Save button should be re-enabled after error
        expect(saveButton).toBeEnabled(); 
        expect(screen.queryByRole('button', { name: /saving.../i })).not.toBeInTheDocument();
    });

    test('handles delete button click and confirmation', async () => {
        // Mock window.confirm
        window.confirm = jest.fn().mockImplementation(() => true); // Simulate user clicking OK
        mockProductService.deleteProduct.mockResolvedValue(undefined); // Mock successful delete

        renderComponent();
        const deleteButton = screen.getByRole('button', { name: /delete product/i });
        
        await userEvent.click(deleteButton);

        // Check if confirmation was shown
        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(mockProduct.name));

        // Check if delete service was called
        await waitFor(() => {
            expect(mockProductService.deleteProduct).toHaveBeenCalledWith(mockProduct.id);
        });

        // Check for success toast/notification
        expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'info', message: 'Product Deactivated' }));
        
        // Check if navigation was called
        expect(mockNavigate).toHaveBeenCalledWith('/app/products');
    });

     test('cancels delete action if user cancels confirmation', async () => {
        window.confirm = jest.fn().mockImplementation(() => false); // Simulate user clicking Cancel

        renderComponent();
        const deleteButton = screen.getByRole('button', { name: /delete product/i });
        
        await userEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalled();
        expect(mockProductService.deleteProduct).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('save button is disabled initially and when submitting', async () => {
        renderComponent();
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled(); // Disabled because form is not dirty

        // Make a change to enable save
        await userEvent.type(screen.getByLabelText(/product name/i), ' Updated');
        expect(saveButton).toBeEnabled();

        // Simulate submit
        await userEvent.click(saveButton);
        expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled();
    });
    
     // Add more tests: successful submission, delete action, category selection, etc.
}); 