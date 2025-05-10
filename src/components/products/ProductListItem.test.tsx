import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductListItem } from './ProductListItem';
import { useProductPrice } from '@/hooks/useProductPrice';

// Mock the useProductPrice hook
jest.mock('@/hooks/useProductPrice', () => ({
  useProductPrice: jest.fn()
}));

describe('ProductListItem component', () => {
  // Sample product with default_price
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    sku: 'TP-001',
    category: 'Electronics',
    brand: 'TestBrand',
    default_price: {
      amount: '19.99',
      currency_iso: 'USD',
      price_type_code: 'base'
    }
  };

  // Setup for each test
  beforeEach(() => {
    // Mock the hook implementation
    (useProductPrice as jest.Mock).mockReturnValue({
      getFormattedPrice: () => '$19.99',
      isLegacyPrice: () => false,
      getPriceSourceInfo: () => ({ isLegacy: false, priceType: 'base' }),
      useNewPricingData: true
    });
  });

  it('renders product information correctly', () => {
    render(<ProductListItem product={mockProduct} />);
    
    // Check basic product info
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('TP-001')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
    
    // Check price display
    expect(screen.getByTestId('product-price')).toHaveTextContent('$19.99');
    
    // Check price type display
    expect(screen.getByTestId('price-type')).toHaveTextContent('base');
  });
  
  it('calls onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<ProductListItem product={mockProduct} onClick={handleClick} />);
    
    await user.click(screen.getByTestId('product-list-item'));
    
    expect(handleClick).toHaveBeenCalledWith(mockProduct);
  });
}); 