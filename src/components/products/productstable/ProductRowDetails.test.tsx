import React from 'react';
import { render } from '@testing-library/react';
import ProductRowDetails from './ProductRowDetails';

// Mock the Product type for tests
interface MockProduct {
  id?: number;
  name?: string;
  sku?: string;
  price?: number;
  description?: string;
  category?: string;
  is_active?: boolean;
  attributes?: any[];
}

describe('ProductRowDetails', () => {
  const mockProduct: MockProduct = {
    id: 1,
    name: 'Test Product',
    sku: 'TEST-123',
    price: 99.99,
    description: '',
    category: '',
    is_active: true,
    attributes: [
      { id: 1, name: 'Color', value: 'Red', group: 'Physical' },
      { id: 2, name: 'Size', value: 'Large', group: 'Physical' },
      { id: 3, name: 'Material', value: 'Cotton', group: 'Materials' },
      { id: 4, name: 'Weight', value: '2kg', group: 'Shipping' }
    ]
  };

  it('renders attribute groups correctly', () => {
    const { getByText } = render(<ProductRowDetails product={mockProduct as any} zebra={false} />);
    
    // Check group headings
    expect(getByText('Physical')).toBeInTheDocument();
    expect(getByText('Materials')).toBeInTheDocument();
    expect(getByText('Shipping')).toBeInTheDocument();
    
    // Check attribute names and values
    expect(getByText('Color')).toBeInTheDocument();
    expect(getByText('Red')).toBeInTheDocument();
    expect(getByText('Size')).toBeInTheDocument();
    expect(getByText('Large')).toBeInTheDocument();
    expect(getByText('Material')).toBeInTheDocument();
    expect(getByText('Cotton')).toBeInTheDocument();
    expect(getByText('Weight')).toBeInTheDocument();
    expect(getByText('2kg')).toBeInTheDocument();
  });

  it('handles string attributes', () => {
    const productWithStringAttrs = {
      ...mockProduct,
      attributes: ['Size', 'Color', 'Material']
    };
    
    const { getByText, getAllByText } = render(<ProductRowDetails product={productWithStringAttrs as any} zebra={true} />);
    
    // With string attributes, they should all be under "General" group
    expect(getByText('General')).toBeInTheDocument();
    expect(getByText('Size')).toBeInTheDocument();
    expect(getByText('Color')).toBeInTheDocument();
    expect(getByText('Material')).toBeInTheDocument();
    // Values should be empty
    expect(getAllByText('No value').length).toBe(3);
  });

  it('handles attributes with different object structures', () => {
    const productWithMixedAttrs = {
      ...mockProduct,
      attributes: [
        { id: 1, name: 'Color', value: 'Blue' },
        { attribute_group: 'Dimensions', name: 'Height', display_value: '100cm' },
        { name: 'Warranty', value: '2 years' }
      ]
    };
    
    const { getByText } = render(<ProductRowDetails product={productWithMixedAttrs as any} zebra={false} />);
    
    // Should find groups
    expect(getByText('General')).toBeInTheDocument();
    expect(getByText('Dimensions')).toBeInTheDocument();
    
    // Should find all attributes and values
    expect(getByText('Color')).toBeInTheDocument();
    expect(getByText('Blue')).toBeInTheDocument();
    expect(getByText('Height')).toBeInTheDocument();
    expect(getByText('100cm')).toBeInTheDocument();
    expect(getByText('Warranty')).toBeInTheDocument();
    expect(getByText('2 years')).toBeInTheDocument();
  });

  it('shows a message when there are no attributes', () => {
    const productWithNoAttrs = {
      ...mockProduct,
      attributes: []
    };
    
    const { getByText } = render(<ProductRowDetails product={productWithNoAttrs as any} zebra={false} />);
    
    expect(getByText('No attributes available for this product.')).toBeInTheDocument();
  });

  it('handles undefined attributes', () => {
    const productWithUndefinedAttrs = {
      ...mockProduct,
      attributes: undefined
    };
    
    const { getByText } = render(<ProductRowDetails product={productWithUndefinedAttrs as any} zebra={false} />);
    
    expect(getByText('No attributes available for this product.')).toBeInTheDocument();
  });

  it('applies zebra styling when zebra prop is true', () => {
    const { container } = render(<ProductRowDetails product={mockProduct as any} zebra={true} />);
    const row = container.querySelector('tr');
    
    expect(row).toHaveClass('bg-slate-50/60');
    expect(row).not.toHaveClass('bg-white/60');
  });
}); 