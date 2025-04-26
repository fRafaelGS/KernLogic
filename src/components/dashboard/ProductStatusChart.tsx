import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DonutChart } from '@tremor/react';
import { useNavigate } from 'react-router-dom';

interface ProductStatusChartProps {
  activeProducts: number;
  inactiveProducts: number;
  loading: boolean;
}

export const ProductStatusChart: React.FC<ProductStatusChartProps> = ({
  activeProducts,
  inactiveProducts,
  loading
}) => {
  const navigate = useNavigate();

  // Calculate the percentage of active products
  const totalProducts = activeProducts + inactiveProducts;
  const activePercentage = totalProducts > 0 
    ? Math.round((activeProducts / totalProducts) * 100) 
    : 0;

  return (
    <Card className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Product Status</CardTitle>
        {loading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <CardDescription className="text-enterprise-500">
            {`${activeProducts} active products`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-44 w-44">
              <DonutChart
                data={[
                  { name: 'Active', value: activeProducts, color: 'rgb(34, 197, 94)' },
                  { name: 'Inactive', value: inactiveProducts, color: 'rgb(242, 242, 242)' },
                ]}
                className="h-44 w-44"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-enterprise-900">
                  {activePercentage}%
                </div>
                <div className="text-xs text-enterprise-500">Active</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              <Button 
                variant="outline" 
                className="flex items-center justify-center text-xs h-auto py-2"
                onClick={() => navigate('/app/products?status=active')}
              >
                <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                Active: {activeProducts}
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center text-xs h-auto py-2"
                onClick={() => navigate('/app/products?status=inactive')}
              >
                <div className="h-2 w-2 bg-enterprise-200 rounded-full mr-2"></div>
                Inactive: {inactiveProducts}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 