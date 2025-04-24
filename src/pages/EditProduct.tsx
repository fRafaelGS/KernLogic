import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProductForm } from '@/components/products/ProductForm';
import { productService } from '@/services/productService';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';

export const EditProduct: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const productId = Number(id);

    const { 
        data: product, 
        isLoading, 
        error, 
        isError 
    } = useQuery({
        queryKey: ['product', productId],
        queryFn: () => productService.getProduct(productId),
        enabled: !isNaN(productId),
        retry: 1,
    });

    if (isNaN(productId)) {
        return (
             <div className="flex flex-col items-center justify-center h-64 text-danger-600">
                <AlertCircle className="h-10 w-10 mb-4"/>
                <p className="text-xl font-medium">Invalid Product ID</p>
                <p className="text-enterprise-600">The product ID in the URL is not valid.</p>
             </div>
        );
    }

    const renderLoading = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                 <Skeleton className="h-8 w-1/4" /> 
                 <Skeleton className="h-8 w-24" /> 
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );

    const renderError = () => (
         <div className="flex flex-col items-center justify-center h-64 text-danger-600 bg-danger-50 p-6 rounded-lg border border-danger-200">
            <AlertCircle className="h-10 w-10 mb-4"/>
            <p className="text-xl font-medium mb-2">Failed to Load Product</p>
            <p className="text-center mb-4">{(error as Error)?.message || 'An unexpected error occurred.'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
    );

    const renderNotFound = () => (
         <div className="flex flex-col items-center justify-center h-64 text-enterprise-500">
            <AlertCircle className="h-10 w-10 mb-4"/>
            <p className="text-xl font-medium">Product Not Found</p>
            <p>The product with ID {productId} could not be found.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <nav className="flex items-center text-sm text-enterprise-600 mb-2">
                 <Link to="/app/products" className="hover:underline hover:text-primary-600">Products</Link>
                 <ChevronRight className="h-4 w-4 mx-1" />
                 <span className="font-medium text-enterprise-800">
                    {isLoading ? 'Loading...' : product ? `Edit: ${product.name}` : 'Edit Product'}
                 </span>
            </nav>

            <div className="sticky top-16 z-10 bg-white border rounded-lg shadow-sm p-4 mb-4 -mx-4 md:-mx-6 px-4 md:px-6">
                 <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 max-w-7xl mx-auto">
                     <h1 className="text-2xl font-bold text-enterprise-900 truncate pr-4">
                         {isLoading ? <Skeleton className="h-8 w-48" /> : product ? product.name : 'Edit Product'}
                     </h1>
                     <span className="text-sm text-enterprise-500 bg-enterprise-50 px-2 py-1 rounded font-mono">
                         SKU: {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : product ? product.sku : 'N/A'}
                     </span>
                 </div>
            </div>

            <ErrorBoundary fallbackMessage="There was an error displaying the product form.">
                {isLoading && renderLoading()}
                {isError && renderError()}
                {!isLoading && !isError && !product && renderNotFound()}
                {!isLoading && !isError && product && (
                    <ProductForm product={product} />
                )}
            </ErrorBoundary>
        </div>
    );
}; 