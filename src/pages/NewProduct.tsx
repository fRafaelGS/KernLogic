import React from 'react';
import { ProductForm } from '@/components/products/ProductForm';

export const NewProduct: React.FC = () => {
    return (
        <div className="container mx-auto py-6">
            <ProductForm />
        </div>
    );
}; 