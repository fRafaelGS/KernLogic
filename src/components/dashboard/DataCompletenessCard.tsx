import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface DataCompletenessCardProps {
  completeness: number;
  mostMissingFields: { field: string; count: number }[];
  loading: boolean;
}

export const DataCompletenessCard: React.FC<DataCompletenessCardProps> = ({
  completeness,
  mostMissingFields,
  loading
}) => {
  return (
    <Card className="bg-white border-enterprise-200 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Data Completeness</CardTitle>
          {loading ? (
            <div className="text-enterprise-500">
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <CardDescription className="text-enterprise-500">
              {`${completeness}% of catalog has all required fields filled`}
            </CardDescription>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-enterprise-600 hover:text-enterprise-900">
                <Info className="h-4 w-4" />
                <span className="sr-only">About data completeness</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="w-80 p-4">
              <p className="text-sm font-medium mb-2">Required fields:</p>
              <ul className="text-xs text-enterprise-600 list-disc pl-4 space-y-1">
                <li>Name</li>
                <li>SKU</li>
                <li>Description</li>
                <li>Price</li>
                <li>Category</li>
                <li>Brand</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center text-xs text-enterprise-500 mb-1.5">
              <span>Completeness</span>
              <span>{completeness}%</span>
            </div>
            <Progress 
              value={completeness} 
              className="h-2.5 bg-enterprise-100"
            />
            
            <div className="mt-6">
              <div className="text-sm font-medium text-enterprise-800 mb-3">Most missing fields</div>
              {mostMissingFields && mostMissingFields.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {mostMissingFields.map((item) => (
                    <TooltipProvider key={item.field}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-enterprise-100 text-enterprise-700 hover:bg-enterprise-200">
                            {item.field} ({item.count})
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{item.count} products missing {item.field}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-enterprise-500">No missing fields detected</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 