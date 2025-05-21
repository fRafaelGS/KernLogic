import React from 'react';
import { ProductForm } from '@/domains/products/components/ProductForm';

export const NewProduct: React.FC = () => {
    return (
        <div className="container mx-auto py-6">
            <ProductForm />
        </div>
    );
}; 