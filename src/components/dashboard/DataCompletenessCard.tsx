import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataCompletenessCardProps {
  completeness: number | undefined; 
  mostMissingFields: { field: string; count: number }[] | undefined;
  loading: boolean;
}

export const DataCompletenessCard: React.FC<DataCompletenessCardProps> = ({
  completeness,
  mostMissingFields,
  loading
}) => {
  const navigate = useNavigate();
  
  // Determine color based on completeness percentage
  const getProgressColor = (value: number | undefined) => {
    if (!value) return "#ef4444"; // default to red
    if (value > 80) return "#10b981"; // green
    if (value > 50) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-enterprise-900">Data Completeness</CardTitle>
          <CardDescription className="text-enterprise-500">
            {loading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              `${completeness || 0}% of catalog has all required fields filled`
            )}
          </CardDescription>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-enterprise-600">
                <Info className="h-4 w-4" />
                <span className="sr-only">About data completeness</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="w-80 p-4">
              <p className="text-sm font-medium mb-2">Required fields:</p>
              <ul className="text-xs text-enterprise-600 list-disc pl-4 space-y-1">
                <li>Name</li>
                <li>SKU</li>
                <li>Description</li>
                <li>Price</li>
                <li>Stock</li>
                <li>Category</li>
                <li>Brand</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <Progress 
                    value={completeness || 0} 
                    className="h-4" 
                    style={{
                      background: "#f1f5f9",
                      "--progress-background": getProgressColor(completeness)
                    } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-enterprise-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-80 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Most missing fields:</p>
                  {mostMissingFields && mostMissingFields.length > 0 ? (
                    <div className="space-y-1.5">
                      {mostMissingFields.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-xs text-enterprise-600">{item.field}</span>
                          <span className="text-xs font-medium">{item.count} products</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-enterprise-500">No missing fields detected.</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="link" 
          className="text-primary-600 hover:text-primary-700 p-0 h-auto text-sm"
          onClick={() => navigate('/app/products/new')}
        >
          Improve completeness
          <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}; 