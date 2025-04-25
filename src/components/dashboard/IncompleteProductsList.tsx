import React from 'react';
import { IncompleteProduct } from '@/services/dashboardService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IncompleteProductsListProps {
  products: IncompleteProduct[] | null;
  loading: boolean;
  maxItems?: number;
  title?: string;
  description?: string;
  showViewAll?: boolean;
}

export const IncompleteProductsList: React.FC<IncompleteProductsListProps> = ({
  products,
  loading,
  maxItems = 5,
  title = "Incomplete Products",
  description = "Products with missing data",
  showViewAll = true
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">{title}</CardTitle>
          <CardDescription className="text-enterprise-500">{description}</CardDescription>
        </div>
        {showViewAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-enterprise-600 hover:text-enterprise-900"
            disabled={true}
            title="Coming soon"
          >
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="divide-y divide-enterprise-100">
            {products.slice(0, maxItems).map((product) => (
              <div 
                key={product?.id || Math.random()} 
                className="px-6 py-4 hover:bg-enterprise-50 cursor-pointer"
                onClick={() => product?.id ? navigate(`/app/products/${product.id}/edit`) : null}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-enterprise-800">{product?.name || "Unnamed product"}</h4>
                  <Badge variant="outline" className="bg-enterprise-50">
                    {product?.completeness || 0}% complete
                  </Badge>
                </div>
                <div className="text-xs text-enterprise-500 mb-3">SKU: {product?.sku || "No SKU"}</div>
                <div className="flex flex-wrap gap-2">
                  {product?.missing_fields && Array.isArray(product.missing_fields) ? (
                    product.missing_fields.map((field) => (
                      <Badge 
                        key={field} 
                        variant="outline"
                        className="bg-danger-50 text-danger-700 border-danger-200"
                      >
                        Missing: {field}
                      </Badge>
                    ))
                  ) : (
                    <Badge 
                      variant="outline"
                      className="bg-danger-50 text-danger-700 border-danger-200"
                    >
                      Missing data
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-8 w-8 text-success-500 mb-2" />
            <p className="text-enterprise-700 font-medium">All products are complete!</p>
            <p className="text-enterprise-500 text-sm">No incomplete products found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 