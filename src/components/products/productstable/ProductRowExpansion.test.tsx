import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsTable } from '../ProductsTable';
import ProductRowDetails from './ProductRowDetails';
import { BrowserRouter } from 'react-router-dom';
import { Product } from '@/services/productService';

// Mock the dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: 'Test User' }
  })
}));

jest.mock('@/services/productService', () => ({
  productService: {
    getProducts: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Test Product',
        sku: 'TEST-123',
        price: 99.99,
        is_active: true,
        attributes: [
          { id: 1, name: 'Color', value: 'Red', group: 'Physical' },
          { id: 2, name: 'Size', value: 'Large', group: 'Physical' },
          { id: 3, name: 'Material', value: 'Cotton', group: 'Materials' }
        ]
      }
    ]),
    getCategories: jest.fn().mockResolvedValue([]),
    getProductAssets: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../ProductsSearchBox', () => ({
  ProductsSearchBox: () => <div data-testid="search-box" />
}));

jest.mock('./ProductsTableFallback', () => ({
  ProductsTableFallback: () => <div data-testid="table-fallback" />
}));

jest.mock('@/hooks/useProductColumns', () => ({
  useProductColumns: () => ({
    columns: [
      { id: 'name', accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
      { id: 'sku', accessorKey: 'sku', header: 'SKU', cell: ({ row }) => row.original.sku },
      { id: 'price', accessorKey: 'price', header: 'Price', cell: ({ row }) => row.original.price }
    ],
    actionColumn: {
      id: 'actions',
      header: 'Actions',
      cell: () => <div>Actions</div>
    },
    allColumns: [
      { id: 'name', accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
      { id: 'sku', accessorKey: 'sku', header: 'SKU', cell: ({ row }) => row.original.sku },
      { id: 'price', accessorKey: 'price', header: 'Price', cell: ({ row }) => row.original.price },
      {
        id: 'actions',
        header: 'Actions',
        cell: () => <div>Actions</div>
      }
    ]
  })
}));

// Mock ProductRowDetails to check if it's rendered
jest.mock('./ProductRowDetails', () => {
  return jest.fn(({ product, zebra }) => (
    <tr data-testid="product-row-details">
      <td colSpan={999}>
        <div>
          <h3>Attributes for: {product.name}</h3>
          <div data-zebra={zebra.toString()}></div>
        </div>
      </td>
    </tr>
  ));
});

describe('Product row expansion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the ProductRowDetails component when a row is expanded', async () => {
    render(
      <BrowserRouter>
        <ProductsTable />
      </BrowserRouter>
    );

    // Wait for products to load
    await screen.findByText('Test Product');

    // Initially, the details should not be visible
    expect(screen.queryByTestId('product-row-details')).not.toBeInTheDocument();

    // Find and click the expander button
    const expanderButton = screen.getByRole('button', { name: /Expand row/i });
    fireEvent.click(expanderButton);

    // Now the ProductRowDetails should be visible
    expect(screen.getByTestId('product-row-details')).toBeInTheDocument();
    expect(screen.getByText('Attributes for: Test Product')).toBeInTheDocument();

    // Check if it was called with the correct props
    expect(ProductRowDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        product: expect.objectContaining({
          id: 1,
          name: 'Test Product',
          sku: 'TEST-123'
        }),
        zebra: expect.any(Boolean)
      }),
      expect.anything()
    );

    // Click again to collapse
    const collapserButton = screen.getByRole('button', { name: /Collapse row/i });
    fireEvent.click(collapserButton);

    // Details should be hidden again
    expect(screen.queryByTestId('product-row-details')).not.toBeInTheDocument();
  });
}); 