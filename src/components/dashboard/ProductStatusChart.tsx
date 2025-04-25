import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DonutChart } from '@tremor/react';
import { useNavigate } from 'react-router-dom';

interface ProductStatusChartProps {
  activeProducts: number | undefined;
  inactiveProducts: number | undefined;
  loading: boolean;
}

export const ProductStatusChart: React.FC<ProductStatusChartProps> = ({
  activeProducts = 0,
  inactiveProducts = 0,
  loading
}) => {
  const navigate = useNavigate();
  
  // Handle chart value click to navigate to filtered products
  const handleValueClick = (value: any) => {
    if (value) {
      navigate(`/app/products?is_active=${value.name === 'Active'}`);
    }
  };
  
  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-enterprise-900">Product Status</CardTitle>
          <CardDescription className="text-enterprise-500">Active vs. Inactive</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4 min-h-[220px] flex items-center justify-center">
        {loading ? (
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
        ) : (
          <DonutChart
            data={[
              { name: 'Active', value: activeProducts || 0 },
              { name: 'Inactive', value: inactiveProducts || 0 }
            ]}
            category="value"
            index="name"
            colors={['emerald', 'rose']}
            valueFormatter={(value) => `${value} products`}
            className="h-[180px] w-[180px] mx-auto"
            onValueChange={handleValueClick}
          />
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs text-enterprise-600">
            Active ({activeProducts || 0})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span className="text-xs text-enterprise-600">
            Inactive ({inactiveProducts || 0})
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}; 