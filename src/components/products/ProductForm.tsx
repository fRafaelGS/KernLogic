import React, { useState, useEffect, useCallback } from 'react';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Product, productService, ProductImage } from '@/services/productService';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Loader2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import axios from 'axios';
import { API_URL } from '@/config';
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { ImageGrid } from '@/components/ui/ImageGrid';
import { Separator } from "@/components/ui/separator";

// Define a consistent base URL for products
const PRODUCTS_BASE_URL = `${API_URL}/products`;

const productEditSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  sku: z.string()
    .min(3, 'SKU must be at least 3 characters')
    .max(30, 'SKU cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'SKU must be alphanumeric with no spaces'),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
      .positive('Price must be positive')
      .multipleOf(0.01, { message: 'Price can have maximum 2 decimal places' })
  ),
  stock: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'Stock is required', invalid_type_error: 'Stock must be a whole number' })
      .int('Stock must be a whole number')
      .nonnegative('Stock cannot be negative')
  ),
  category: z.string().min(1, 'Category is required'),
  is_active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productEditSchema>;

interface ProductFormProps {
  product?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product }) => {
  const navigate = useNavigate();
  const { addNotification } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingImageAction, setLoadingImageAction] = useState<number | null>(null);

  const isEditMode = !!product?.id;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    reset,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      sku: product?.sku || '',
      price: product?.price ?? undefined,
      stock: product?.stock ?? undefined,
      category: product?.category || '',
      is_active: product?.is_active ?? true,
    },
  });

  const descriptionValue = watch('description');

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    reset({
      name: product?.name || '',
      description: product?.description || '',
      sku: product?.sku || '',
      price: product?.price ?? undefined,
      stock: product?.stock ?? undefined,
      category: product?.category || '',
      is_active: product?.is_active ?? true,
    });
  }, [product, reset]);

  // --- Fetch Categories for Dropdown ---
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => productService.getCategories(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // --- React Query Mutation for File Upload ---
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file); // Ensure backend expects 'image' field

        if (!product?.id) throw new Error("Product ID is missing");
        
        // Use axios directly with lots of logging
        const url = `${PRODUCTS_BASE_URL}/${product.id}/images/`;
        console.log("Image Upload URL:", url);
        
        try {
            // Get token from local storage
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Authentication required');
            
            // Log the request details
            console.log("Upload Request Headers:", {
                'Authorization': `Bearer ${token.substring(0, 15)}...`,
                'Content-Type': 'multipart/form-data'
            });
            console.log("File being uploaded:", file.name, file.type, file.size);
            
            // Create the request with axios
            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Content-Type is set automatically for FormData
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                    console.log(`Upload progress: ${percentCompleted}%`);
                    setUploadProgress(percentCompleted);
                }
            });
            
            console.log("Upload success response:", response.status, response.data);
            return response.data;
        } catch (error) {
            console.error("Upload error details:", error);
            if (axios.isAxiosError(error)) {
                console.error("Axios error response:", error.response?.status, error.response?.data);
                throw new Error(error.response?.data?.detail || `Failed to upload ${file.name}: ${error.message}`);
            }
            throw error;
        }
    },
    onSuccess: () => {
        toast.success("Image uploaded successfully!");
        // Invalidate product query to refetch data including new image
        queryClient.invalidateQueries({ queryKey: ['product', product?.id] }); 
        setUploadProgress(0); // Reset progress
    },
    onError: (error: Error, file) => { // Changed variable name for clarity
        toast.error(`Upload failed for ${file.name}: ${error.message}`);
        setUploadProgress(0);
        addNotification({
            type: 'error',
            message: 'Image Upload Failed',
            description: `Could not upload ${file.name}. ${error.message}`
        });
    },
  });

  // --- Handler for File Uploads ---
  const handleFilesUpload = (files: File[]) => {
    // Handle multiple files if backend supports it, or loop
    files.forEach(file => {
        // Reset progress before each upload if desired
        setUploadProgress(0);
        
        // No need for progress simulation since axios provides real progress
        uploadFileMutation.mutate(file, {
            onSuccess: () => {
                setTimeout(() => setUploadProgress(0), 1000); // Hide progress bar after a delay
            }
        });
    });
  };

  // --- Handler for URL Upload (Placeholder/Example) ---
  const handleUrlUpload = (url: string) => {
    // TODO: Implement backend call for URL upload if supported
    // This might involve sending the URL to the backend, 
    // which then fetches and saves the image.
    console.log("URL Upload Requested (Not Implemented):", url);
    toast.info("URL upload functionality is not yet implemented.");
    // Example mutation call structure:
    // urlUploadMutation.mutate({ imageUrl: url });
  };

  // --- Mutation for Deleting an Image ---
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
        if (!product?.id) throw new Error("Product ID is missing");
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Authentication required');

        // Use the PRODUCTS_BASE_URL constant to ensure consistent URL
        const url = `${PRODUCTS_BASE_URL}/${product.id}/images/${imageId}/`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to delete image: ${response.statusText}`);
        }
        // No content expected on successful DELETE
    },
    onSuccess: (_, imageId) => {
        toast.success(`Image deleted successfully.`);
        queryClient.invalidateQueries({ queryKey: ['product', product?.id] });
        setLoadingImageAction(null); // Clear loading state for this specific image
         addNotification({
            type: 'info',
            message: 'Image Deleted',
            description: `An image was removed from product "${product?.name || 'N/A'}".`
        });
    },
    onError: (error: Error, imageId) => {
        toast.error(`Failed to delete image: ${error.message}`);
        setLoadingImageAction(null);
         addNotification({
            type: 'error',
            message: 'Image Delete Failed',
            description: error.message
        });
    },
  });
  
  // --- Mutation for Setting Primary Image ---
  const setPrimaryImageMutation = useMutation({
      mutationFn: async (imageId: number) => {
        if (!product?.id) throw new Error("Product ID is missing");
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Authentication required');
        
        // Use the PRODUCTS_BASE_URL constant to ensure consistent URL
        const url = `${PRODUCTS_BASE_URL}/${product.id}/images/${imageId}/`;

        // Assuming PATCH to the image detail endpoint sets it as primary
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
             },
             body: JSON.stringify({ is_primary: true })
        });
         if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to set primary image: ${response.statusText}`);
        }
        return response.json(); // Expecting updated image or product data
    },
     onSuccess: (data, imageId) => {
        toast.success(`Image set as primary.`);
        queryClient.invalidateQueries({ queryKey: ['product', product?.id] });
        setLoadingImageAction(null); 
         addNotification({
            type: 'info',
            message: 'Primary Image Set',
            description: `Primary image updated for product "${product?.name || 'N/A'}".`
        });
    },
    onError: (error: Error, imageId) => {
        toast.error(`Failed to set primary image: ${error.message}`);
        setLoadingImageAction(null);
          addNotification({
            type: 'error',
            message: 'Set Primary Failed',
            description: error.message
        });
    },
  });

  // --- Mutation for Reordering Images ---
  const reorderImagesMutation = useMutation({
      mutationFn: async (orderedImageIds: number[]) => {
        if (!product?.id) throw new Error("Product ID is missing");
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Authentication required');
        
        // Prepare payload: Array of objects with id and new order (index)
        const payload = orderedImageIds.map((id, index) => ({ id, order: index }));
        
        // Use the PRODUCTS_BASE_URL constant to ensure consistent URL
        const url = `${PRODUCTS_BASE_URL}/${product.id}/images/reorder/`;

        // Assuming PATCH to the base images endpoint handles reordering
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
             },
             body: JSON.stringify({ images: payload }) // Send the reordered list
        });
         if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to reorder images: ${response.statusText}`);
        }
        return response.json(); // Expecting updated product data or success message
    },
     onSuccess: (data) => {
        toast.success(`Image order saved.`);
        queryClient.invalidateQueries({ queryKey: ['product', product?.id] });
        // No loading state to clear here as it's a general action
         addNotification({
            type: 'info',
            message: 'Image Order Updated',
            description: `Image order saved for product "${product?.name || 'N/A'}".`
        });
    },
    onError: (error: Error) => {
        toast.error(`Failed to save image order: ${error.message}`);
          addNotification({
            type: 'error',
            message: 'Image Reorder Failed',
            description: error.message
        });
        // Optionally refetch to revert optimistic UI update from dnd-kit
        queryClient.invalidateQueries({ queryKey: ['product', product?.id] }); 
    },
  });

  // --- Update Image Action Handlers ---
  const handleDeleteImage = (imageId: number) => {
      if (window.confirm('Are you sure you want to delete this image?')) {
          setLoadingImageAction(imageId); // Set loading state for this specific image
          deleteImageMutation.mutate(imageId); 
      }
  };

  const handleSetPrimaryImage = (imageId: number) => {
      setLoadingImageAction(imageId); // Set loading state
      setPrimaryImageMutation.mutate(imageId);
  };

  const handleReorderImages = (reorderedImageIds: number[]) => {
      // Call the mutation with the new array of IDs
      reorderImagesMutation.mutate(reorderedImageIds);
  };

  // --- Unified Submit Handler ---
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    // `data` here is already validated by Zod and guaranteed to have required fields
    const productDataForApi = {
      name: data.name, 
      description: data.description || '', 
      sku: data.sku, 
      price: Number(data.price),
      stock: Number(data.stock),
      category: data.category, 
      is_active: data.is_active,
    };

    try {
      let savedProduct: Product;
      if (isEditMode) {
        // Update uses Partial<Product>, so direct data spread is fine
        savedProduct = await productService.updateProduct(product.id!, productDataForApi);
        toast.success('Product updated successfully');
        addNotification({
          type: 'success',
          message: 'Product Updated',
          description: `Product "${savedProduct.name}" (SKU: ${savedProduct.sku}) was updated.`
        });
        reset(savedProduct); 
      } else {
        // Create expects specific fields, ensure type match
        // We cast here because Zod ensures required fields are present
        savedProduct = await productService.createProduct(productDataForApi as Omit<Product, 'id' | 'created_by' | 'created_at' | 'updated_at'>);
        toast.success('Product created successfully');
        addNotification({
          type: 'success',
          message: 'Product Created',
          description: `New product "${savedProduct.name}" (SKU: ${savedProduct.sku}) was added.`
        });
        navigate(`/app/products/${savedProduct.id}/edit`, { replace: true }); 
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      const errorMessage = error.response?.data?.detail || 
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        error.message || 
        'Failed to save product.';

      addNotification({
        type: 'error',
        message: isEditMode ? 'Product Update Failed' : 'Product Creation Failed',
        description: errorMessage.length > 100 ? errorMessage.substring(0, 97) + '...' : errorMessage
      });

      if (error.response?.data?.sku && Array.isArray(error.response.data.sku)) {
         setError('sku', {
            type: 'server',
            message: error.response.data.sku[0]
         });
         toast.error(`SKU Error: ${error.response.data.sku[0]}`);
      } else {
         toast.error(`${isEditMode ? 'Update' : 'Creation'} failed: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler (Only relevant in Edit mode) ---
  const handleDelete = async () => {
    if (!isEditMode) return; // Should not be callable in create mode
    if (window.confirm(`Are you sure you want to mark product "${product.name}" as inactive?`)) {
        setIsSubmitting(true); 
        try {
            await productService.deleteProduct(product.id!); 
            toast.success(`Product "${product.name}" marked as inactive.`);
            addNotification({
                type: 'info',
                message: 'Product Deactivated',
                description: `Product "${product.name}" (SKU: ${product.sku}) was marked inactive.`
            });
            navigate('/app/products');
        } catch (error: any) {
            console.error('Error deleting/deactivating product:', error);
            const errorMsg = error.message || 'Failed to deactivate product.';
            toast.error(errorMsg);
            addNotification({
                type: 'error',
                message: 'Deactivation Failed',
                description: errorMsg
            });
            setIsSubmitting(false);
        }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Edit the core information for this product.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className={cn(errors.name && "text-danger-600")}>Product Name</Label>
            <Input 
              id="name" 
              {...register('name')} 
              placeholder="Enter product name" 
              disabled={isSubmitting}
              className={cn(errors.name && "border-danger-500 focus-visible:ring-danger-500")}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku" className={cn(errors.sku && "text-danger-600")}>SKU</Label>
            <Input 
              id="sku" 
              {...register('sku')} 
              placeholder="Unique product identifier" 
              disabled={isSubmitting}
              className={cn(errors.sku && "border-danger-500 focus-visible:ring-danger-500")}
              aria-invalid={errors.sku ? "true" : "false"}
              aria-describedby={errors.sku ? "sku-error" : undefined}
            />
            {errors.sku && (
              <p id="sku-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className={cn(errors.description && "text-danger-600")}>Description</Label>
            <Controller
                name="description"
                control={control}
                defaultValue={product?.description || ''}
                render={({ field }) => (
                   <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        limit={5000}
                        disabled={isSubmitting}
                        error={!!errors.description}
                   />
                )}
            />
            {errors.description && (
                <p id="description-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
          <CardDescription>Manage cost and stock levels.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="price" className={cn(errors.price && "text-danger-600")}>Price</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-enterprise-500 sm:text-sm">$</span>
              <Input 
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })} 
                placeholder="0.00"
                disabled={isSubmitting}
                className={cn("pl-7", errors.price && "border-danger-500 focus-visible:ring-danger-500")}
                aria-invalid={errors.price ? "true" : "false"}
                aria-describedby={errors.price ? "price-error" : undefined}
              />
            </div>
            {errors.price && (
              <p id="price-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock" className={cn(errors.stock && "text-danger-600")}>Stock Quantity</Label>
            <Input 
              id="stock"
              type="number"
              step="1"
              min="0"
              {...register('stock', { valueAsNumber: true })} 
              placeholder="0"
              disabled={isSubmitting}
              className={cn(errors.stock && "border-danger-500 focus-visible:ring-danger-500")}
              aria-invalid={errors.stock ? "true" : "false"}
              aria-describedby={errors.stock ? "stock-error" : undefined}
            />
            {errors.stock && (
              <p id="stock-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.stock.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Categorize the product.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="category" className={cn(errors.category && "text-danger-600")}>Category</Label>
            <Controller
                name="category"
                control={control}
                render={({ field }) => (
                    <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting || isLoadingCategories}
                    >
                        <SelectTrigger 
                            id="category"
                            className={cn(errors.category && "border-danger-500 focus:ring-danger-500")}
                            aria-invalid={errors.category ? "true" : "false"}
                            aria-describedby={errors.category ? "category-error" : undefined}
                        >
                            <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingCategories ? (
                                <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                            ) : (
                                // Ensure unique categories before mapping
                                [...new Set(categories || [])].map((categoryName, index) => (
                                    <SelectItem 
                                      key={`${categoryName}-${index}`}
                                      value={categoryName}
                                    >
                                        {categoryName}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.category && (
                <p id="category-error" role="alert" className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{errors.category.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card: Images & Media */}
      <Card>
        <CardHeader>
          <CardTitle>Images & Media</CardTitle>
          <CardDescription>
            {isEditMode 
               ? "Upload and manage product images. Drag to reorder."
               : "You can add images after creating the product."
            }
          </CardDescription>
        </CardHeader>
        {/* Corrected Conditional Rendering */}            
        <CardContent className="space-y-4">
             {isEditMode ? (
                <> { /* Fragment to group multiple components */}
                    <ImageUploader 
                        onFilesUpload={handleFilesUpload}
                        onUrlUpload={handleUrlUpload}
                        uploading={uploadFileMutation.isPending} 
                        progress={uploadProgress}
                        maxFiles={10} 
                        maxSizeMB={5} 
                        currentImageCount={product?.images?.length || 0} 
                    />
                    <Separator /> 
                    <ImageGrid 
                        images={product?.images || []} 
                        onDelete={handleDeleteImage}
                        onSetPrimary={handleSetPrimaryImage}
                        onReorder={handleReorderImages} 
                        loadingImageId={loadingImageAction || (deleteImageMutation.isPending ? deleteImageMutation.variables : null) || (setPrimaryImageMutation.isPending ? setPrimaryImageMutation.variables : null)}
                    />
                </>
             ) : (
                 <div className="text-center text-sm text-enterprise-500 py-8 border border-dashed rounded-md">
                     Please create the product first to add images.
                </div>
             )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 mt-6 border-t border-enterprise-200">
        <div>
            {isEditMode && (
                <Button 
                    type="button"
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    size="sm"
                >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Deactivate
                </Button>
            )}
        </div>
        
        <div className="flex space-x-3">
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/app/products')} 
                disabled={isSubmitting}
            >
                Cancel
            </Button>
            <Button 
                type="submit" 
                variant="primary" 
                disabled={isSubmitting || (isEditMode && !isDirty)}
            >
                {isSubmitting ? (
                    <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                ) : (
                   isEditMode ? 'Save Changes' : 'Create Product'
                )}
            </Button>
        </div>
      </div>
    </form>
  );
};
