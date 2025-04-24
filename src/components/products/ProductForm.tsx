import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Product, productService } from '@/services/productService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  category: z.string().min(1, 'Category is required'),
  is_active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product }) => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          category: product.category,
          is_active: product.is_active,
        }
      : { is_active: true },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      console.log('Submitting product data:', data);
      
      // Create a properly typed product data object
      const productData = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        price: Number(data.price), // Ensure price is a number
        stock: Number(data.stock),  // Ensure stock is a number
        category: data.category,
        is_active: true
      } as const;

      console.log('Making API call with data:', productData);

      if (product?.id) {
        console.log('Updating existing product...');
        const updatedProduct = await productService.updateProduct(product.id, productData);
        console.log('Update response:', updatedProduct);
        if (updatedProduct && updatedProduct.id) {
          toast.success('Product updated successfully');
          navigate('/app/products');
        } else {
          throw new Error('Failed to update product');
        }
      } else {
        console.log('Creating new product...');
        const newProduct = await productService.createProduct(productData);
        console.log('Create response:', newProduct);
        if (newProduct && newProduct.id) {
          toast.success('Product created successfully');
          navigate('/app/products');
        } else {
          throw new Error('Failed to create product');
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      if (error.response?.data) {
        console.error('Error response data:', error.response.data);
        
        // Handle validation errors
        if (typeof error.response.data === 'object') {
          const errorMessages = [];
          
          // Special handling for SKU uniqueness error
          if (error.response.data.sku && 
              Array.isArray(error.response.data.sku) && 
              error.response.data.sku.some((err: string) => err.includes('already exists'))) {
            toast.error(`The SKU "${data.sku}" is already in use. Please choose a different SKU.`);
            return;
          }
          
          // Collect all error messages
          for (const [field, messages] of Object.entries(error.response.data)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          
          if (errorMessages.length > 0) {
            toast.error(`Failed to save product: ${errorMessages.join('; ')}`);
            return;
          }
        }
        
        // Fall back to using the detail field or first error
        const errorMessage = error.response.data.detail || Object.values(error.response.data)[0];
        toast.error(`Failed to save product: ${errorMessage}`);
      } else {
        toast.error(error.message || 'Failed to save product. Please try again.');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
        <CardDescription>
          {product
            ? 'Update product details'
            : 'Fill in the details to create a new product'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} placeholder="Product name" />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Product description"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} placeholder="Product SKU" />
            {errors.sku && (
              <p className="text-sm text-red-500">{errors.sku.message}</p>
            )}
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                {...register('price', { 
                  valueAsNumber: true,
                  setValueAs: (value) => {
                    // Ensure it's a valid number or default to undefined to trigger validation
                    const num = parseFloat(value);
                    return !isNaN(num) ? num : undefined;
                  }
                })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                {...register('stock', { 
                  valueAsNumber: true,
                  setValueAs: (value) => {
                    // Ensure it's a valid integer or default to undefined to trigger validation
                    const num = parseInt(value, 10);
                    return !isNaN(num) ? num : undefined;
                  }
                })}
                placeholder="0"
              />
              {errors.stock && (
                <p className="text-sm text-red-500">{errors.stock.message}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Product category"
            />
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : product
                ? 'Update Product'
                : 'Create Product'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
