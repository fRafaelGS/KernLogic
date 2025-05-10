import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useProductPrice } from './useProductPrice';

describe('useProductPrice hook', () => {
  // Sample product with default_price
  const productWithDefaultPrice = {
    id: 1,
    name: 'Test Product',
    sku: 'TP-001',
    default_price: {
      amount: '19.99',
      currency_iso: 'USD',
      price_type_code: 'base'
    }
  };
  
  // Sample product without default_price
  const productWithoutPrice = {
    id: 2,
    name: 'No Price Product',
    sku: 'TP-002',
  };

  it('should format default_price correctly', () => {
    const { result } = renderHook(() => useProductPrice());
    
    const formatted = result.current.getFormattedPrice(productWithDefaultPrice);
    
    // USD formatting should include $ symbol and 2 decimal places
    expect(formatted).toBe('$19.99');
  });
  
  it('should handle products without price', () => {
    const { result } = renderHook(() => useProductPrice());
    
    const formatted = result.current.getFormattedPrice(productWithoutPrice);
    
    // Should return empty string for products without price
    expect(formatted).toBe('');
  });
  
  it('should return correct price source info for products with default_price', () => {
    const { result } = renderHook(() => useProductPrice());
    
    const priceInfo = result.current.getPriceSourceInfo(productWithDefaultPrice);
    
    expect(priceInfo.isLegacy).toBe(false);
    expect(priceInfo.priceType).toBe('base');
  });
  
  it('should return correct price source info for products without price', () => {
    const { result } = renderHook(() => useProductPrice());
    
    const priceInfo = result.current.getPriceSourceInfo(productWithoutPrice);
    
    expect(priceInfo.isLegacy).toBe(false);
    expect(priceInfo.priceType).toBe('unknown');
  });
  
  it('should always return isLegacyPrice as false', () => {
    const { result } = renderHook(() => useProductPrice());
    
    // Should return false for both products with and without default_price
    expect(result.current.isLegacyPrice(productWithDefaultPrice)).toBe(false);
    expect(result.current.isLegacyPrice(productWithoutPrice)).toBe(false);
  });
  
  it('should always report useNewPricingData as true', () => {
    const { result } = renderHook(() => useProductPrice());
    
    expect(result.current.useNewPricingData).toBe(true);
  });
}); 