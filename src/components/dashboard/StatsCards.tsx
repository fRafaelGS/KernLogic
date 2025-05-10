import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProductPrice, ProductWithPrice } from '@/hooks/useProductPrice';

interface StatsData {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  products: ProductWithPrice[];
}

export const StatsCards: React.FC<{ data: StatsData }> = ({ data }) => {
  // Calculate total inventory value using the pricing table
  const calculateInventoryValue = (products: ProductWithPrice[]): number => {
    return products.reduce((total, product) => {
      let productValue = 0;
      
      if (product.default_price) {
        // Use new pricing model
        productValue = parseFloat(product.default_price.amount) * (product.stock || 0);
      }
      
      return total + productValue;
    }, 0);
  };
  
  // Format currency for display
  const formatCurrencyValue = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const inventoryValue = calculateInventoryValue(data.products);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="total-products">
            {data.totalProducts}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Active products in inventory
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          <CardDescription className="text-xs">Using base price type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="inventory-value">
            {formatCurrencyValue(inventoryValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on default_price from pricing table
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="low-stock">
            {data.lowStockCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Products with stock &lt; 10
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 