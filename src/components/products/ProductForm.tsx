import React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Loader2, AlertCircle } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Price must be a number' })
      .min(0.01, 'Price must be greater than 0')
  ),
  stock: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Stock must be a number' })
      .min(0, 'Stock cannot be negative')
      .int('Stock must be a whole number')
  ),
  category: z.string().min(1, 'Category is required'),
  is_active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setError,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
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
      : { 
          name: '',
          description: '',
          sku: '',
          price: undefined,
          stock: undefined,
          category: '',
          is_active: true,
        },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    
    try {
      // Create a properly typed product data object
      const productData = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        price: Number(data.price),
        stock: Number(data.stock),
        category: data.category,
        is_active: data.is_active
      };

      if (product?.id) {
        const updatedProduct = await productService.updateProduct(product.id, productData);
        if (updatedProduct && updatedProduct.id) {
          toast.success('Product updated successfully');
          navigate('/app/products');
        } else {
          throw new Error('Failed to update product');
        }
      } else {
        const newProduct = await productService.createProduct(productData);
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
        // Handle field-specific validation errors from the server
        if (typeof error.response.data === 'object') {
          // Special handling for SKU uniqueness error
          if (error.response.data.sku && 
              Array.isArray(error.response.data.sku) && 
              error.response.data.sku.some((err: string) => err.includes('already exists'))) {
            setError('sku', { 
              type: 'server', 
              message: `This SKU is already in use. Please choose a different one.` 
            });
          }
          
          // Set field errors for any server validation errors
          Object.entries(error.response.data).forEach(([field, messages]) => {
            if (field in productSchema.shape) {
              setError(field as keyof ProductFormData, {
                type: 'server',
                message: Array.isArray(messages) ? messages[0] : messages as string
              });
            }
          });
        }
        
        // Show general error toast
        const errorMessage = error.response.data.detail || 
          (typeof error.response.data === 'string' ? error.response.data : 'Server validation failed');
        toast.error(`Failed to save product: ${errorMessage}`);
      } else {
        toast.error(error.message || 'Failed to save product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="text-xl text-enterprise-900">
          {product ? 'Edit Product' : 'Add New Product'}
        </CardTitle>
        <CardDescription className="text-enterprise-600">
          {product
            ? 'Update your product information'
            : 'Enter the details to create a new product'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-enterprise-700 font-medium">Product Name</Label>
            <Input 
              id="name" 
              {...register('name')} 
              placeholder="Enter product name" 
              disabled={isSubmitting}
              className={`${errors.name ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
            />
            {errors.name && (
              <div className="flex items-center text-sm text-danger-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.name.message}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-enterprise-700 font-medium">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Provide a detailed description"
              disabled={isSubmitting}
              className={`min-h-[120px] ${errors.description ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
            />
            {errors.description && (
              <div className="flex items-center text-sm text-danger-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.description.message}</span>
              </div>
            )}
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku" className="text-enterprise-700 font-medium">SKU</Label>
            <Input 
              id="sku" 
              {...register('sku')} 
              placeholder="Unique product identifier"
              disabled={isSubmitting}
              className={`${errors.sku ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
            />
            {errors.sku && (
              <div className="flex items-center text-sm text-danger-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.sku.message}</span>
              </div>
            )}
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-enterprise-700 font-medium">Price ($)</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                    className={`${errors.price ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? '' : Number(value));
                    }}
                    value={field.value === undefined ? '' : field.value}
                  />
                )}
              />
              {errors.price && (
                <div className="flex items-center text-sm text-danger-600 mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.price.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="text-enterprise-700 font-medium">Stock</Label>
              <Controller
                name="stock"
                control={control}
                render={({ field }) => (
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    disabled={isSubmitting}
                    className={`${errors.stock ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? '' : Number(value));
                    }}
                    value={field.value === undefined ? '' : field.value}
                  />
                )}
              />
              {errors.stock && (
                <div className="flex items-center text-sm text-danger-600 mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.stock.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-enterprise-700 font-medium">Category</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Product category"
              disabled={isSubmitting}
              className={`${errors.category ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-enterprise-200'}`}
            />
            {errors.category && (
              <div className="flex items-center text-sm text-danger-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.category.message}</span>
              </div>
            )}
          </div>

          {/* Form Controls */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/products')}
              disabled={isSubmitting}
              className="text-enterprise-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting || (!isDirty && !!product)}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {product ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
