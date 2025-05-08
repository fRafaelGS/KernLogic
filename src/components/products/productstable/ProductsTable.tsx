import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductRowDetails from './ProductRowDetails';
import { Product } from "@/services/productService";

describe('ProductRowDetails', () => {
  const mockProduct: Partial<Product> = {
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
    render(<ProductRowDetails product={mockProduct as Product} zebra={false} />);
    
    // Check group headings
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('Shipping')).toBeInTheDocument();
    
    // Check attribute names and values
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Cotton')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('2kg')).toBeInTheDocument();
  });

  it('handles string attributes', () => {
    const productWithStringAttrs = {
      ...mockProduct,
      attributes: ['Size', 'Color', 'Material']
    };
    
    render(<ProductRowDetails product={productWithStringAttrs as Product} zebra={true} />);
    
    // With string attributes, they should all be under "General" group
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    // Values should be empty
    expect(screen.getAllByText('No value').length).toBe(3);
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
    
    render(<ProductRowDetails product={productWithMixedAttrs as Product} zebra={false} />);
    
    // Should find groups
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Dimensions')).toBeInTheDocument();
    
    // Should find all attributes and values
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('100cm')).toBeInTheDocument();
    expect(screen.getByText('Warranty')).toBeInTheDocument();
    expect(screen.getByText('2 years')).toBeInTheDocument();
  });

  it('shows a message when there are no attributes', () => {
    const productWithNoAttrs = {
      ...mockProduct,
      attributes: []
    };
    
    render(<ProductRowDetails product={productWithNoAttrs as Product} zebra={false} />);
    
    expect(screen.getByText('No attributes available for this product.')).toBeInTheDocument();
  });

  it('handles undefined attributes', () => {
    const productWithUndefinedAttrs = {
      ...mockProduct,
      attributes: undefined
    };
    
    render(<ProductRowDetails product={productWithUndefinedAttrs as Product} zebra={false} />);
    
    expect(screen.getByText('No attributes available for this product.')).toBeInTheDocument();
  });

  it('applies zebra styling when zebra prop is true', () => {
    const { container } = render(<ProductRowDetails product={mockProduct as Product} zebra={true} />);
    const row = container.querySelector('tr');
    
    expect(row).toHaveClass('bg-slate-50/60');
    expect(row).not.toHaveClass('bg-white/60');
  });
}); 