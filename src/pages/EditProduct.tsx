import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProductForm } from '@/components/products/ProductForm';
import { productService } from '@/services/productService';
import { toast } from 'react-hot-toast';

export const EditProduct: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: product, isLoading, error } = useQuery({
        queryKey: ['product', id],
        queryFn: () => productService.getProduct(Number(id)),
    });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        toast.error('Failed to load product');
        return <div>Error loading product</div>;
    }

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <div className="container mx-auto py-6">
            <ProductForm product={product} />
        </div>
    );
}; 