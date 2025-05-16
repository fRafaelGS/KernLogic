import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DonutChart } from '@tremor/react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductStatusChart.module.scss'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface ProductStatusChartProps {
  activeProducts: number;
  inactiveProducts: number;
  loading: boolean;
  className?: string;
}

export const ProductStatusChart: React.FC<ProductStatusChartProps> = ({
  activeProducts,
  inactiveProducts,
  loading,
  className
}) => {
  const navigate = useNavigate();

  // Calculate the percentage of active products
  const totalProducts = activeProducts + inactiveProducts;
  const activePercentage = totalProducts > 0 
    ? Math.round((activeProducts / totalProducts) * 100) 
    : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`h-full bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all ${className || ''}`} tabIndex={0} aria-label="Product status donut chart">
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
      <CardContent className="pt-2 h-[calc(100%-76px)] overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="relative flex items-center justify-center h-48 w-48 mb-2">
              <DonutChart
                data={[
                  { name: 'Active', value: activeProducts, color: 'rgb(34, 197, 94)' },
                  { name: 'Inactive', value: inactiveProducts, color: 'rgb(242, 242, 242)' },
                ]}
                      className={`h-44 w-44 ${styles['hide-tremor-legend']} pointer-events-none`}
              />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '90px',
                        height: '90px',
                        background: 'white',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{zIndex: 2}}>
                      <div className="text-3xl font-bold text-enterprise-900 leading-tight">
                  {activePercentage}%
                </div>
                      <div className="text-xs text-enterprise-500 font-medium mt-1">Active</div>
              </div>
            </div>
                  <div className="flex flex-row justify-center gap-4 mt-4 w-full">
              <Button 
                variant="outline" 
                      className="flex items-center justify-center text-xs h-auto py-2 px-4 min-w-[110px]"
                onClick={() => navigate('/app/products?status=active')}
              >
                <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                Active: {activeProducts}
              </Button>
              <Button 
                variant="outline" 
                      className="flex items-center justify-center text-xs h-auto py-2 px-4 min-w-[110px]"
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
        </TooltipTrigger>
        <TooltipContent side="top">
          Shows the percentage of active products in your catalog. Click below to filter by status.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 