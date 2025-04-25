import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart } from '@tremor/react';
import { InventoryTrend } from '@/services/dashboardService';

interface InventoryTrendChartProps {
  data: InventoryTrend | null;
  loading: boolean;
  onRangeChange?: (range: 30 | 60 | 90) => void;
}

// Format currency in USD
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

export const InventoryTrendChart: React.FC<InventoryTrendChartProps> = ({
  data,
  loading,
  onRangeChange
}) => {
  const [range, setRange] = useState<30 | 60 | 90>(30);

  // Handle range change
  const handleRangeChange = (value: string) => {
    const newRange = Number(value) as 30 | 60 | 90;
    setRange(newRange);
    if (onRangeChange) {
      onRangeChange(newRange);
    }
  };

  // Convert trend data to chart format
  const chartData = data && data.dates && data.values
    ? data.dates.map((date, i) => ({
        date,
        value: data.values[i]
      }))
    : [];

  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Inventory Value Trend</CardTitle>
          <CardDescription className="text-enterprise-500">
            {range} day view
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs 
            defaultValue={range.toString()} 
            value={range.toString()}
            onValueChange={handleRangeChange}
            className="h-8"
          >
            <TabsList className="h-8">
              <TabsTrigger value="30" className="h-8 px-3 text-xs">30d</TabsTrigger>
              <TabsTrigger value="60" className="h-8 px-3 text-xs">60d</TabsTrigger>
              <TabsTrigger value="90" className="h-8 px-3 text-xs">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="h-[240px] bg-enterprise-50 rounded-md flex items-center justify-center">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : data && data.dates ? (
          data.dates.length >= 2 ? (
            <AreaChart
              className="h-[240px]"
              data={chartData}
              index="date"
              categories={["value"]}
              colors={["primary"]}
              valueFormatter={(value) => formatCurrency(value)}
              showLegend={false}
              showGridLines={false}
              showAnimation={true}
              animationDuration={600}
            />
          ) : (
            <div className="h-[240px] bg-enterprise-50 rounded-md flex flex-col items-center justify-center">
              <h3 className="text-enterprise-700 font-semibold text-lg">Not enough history yet</h3>
              <p className="text-enterprise-500 text-sm pt-2">More data points will appear over time</p>
            </div>
          )
        ) : (
          <div className="h-[240px] bg-enterprise-50 rounded-md flex items-center justify-center">
            <p className="text-enterprise-500 text-sm">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 