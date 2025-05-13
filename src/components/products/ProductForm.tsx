/**
 * ProductForm Component
 * 
 * This component handles both creating new products and editing existing ones.
 * The form uses a centralized schema (productEditSchema) and default values function
 * (getDefaultProductValues) from the src/schemas/product.ts file.
 * 
 * Key features:
 * - Unified form for create and edit operations
 * - Validation using Zod schema
 * - Proper handling of complex types (categories, attributes, prices)
 * - Image upload with preview
 * - Organization by tabs for better UX
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { productEditSchema, getDefaultProductValues, ProductFormValues, extractCategoryInfo } from '@/schemas/product';

// UI components
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TagInput } from '@/components/ui/tag-input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, HelpCircle, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from "@/components/ui/spinner";
import { FileUpload } from "@/components/ui/file-upload";
import { CategoryTreeSelect } from '../categories/CategoryTreeSelect';
import { CategoryModal } from '@/components/products/CategoryModal'

// Services
import { productService, Product, ProductPrice } from '@/services/productService';
import { API_URL } from '@/config';
import { getCategories, createCategory } from "@/services/categoryService";

// Custom components
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PriceSummaryBadge } from '@/components/products/PriceSummaryBadge';
import { PricingModal } from '@/components/products/PricingModal';
import { AttributeManager } from '@/features/AttributeManager/AttributeManager';
import AttributesTab from '@/components/products/AttributesTab'

const PRODUCTS_BASE_URL = `${API_URL}/products`;

// Add type for category options used by react-select
interface CategoryOption {
  label: string;
  value: number | string;
}

interface ProductFormProps {
  product?: Product;
}

// Adapter component for price badges
interface PriceBadgeProps {
  price: ProductPrice;
}

function PriceBadge({ price }: PriceBadgeProps) {
  if (!price) return null;
  
  // Create a minimal product object with the price
  const productWithPrice: Partial<Product> = {
    id: 0,
    name: '',
    sku: '',
    prices: [price],
    is_active: true,
    description: '',  // Add required fields from Product type
    category: ''      // Add required fields from Product type
  };
  
  return <PriceSummaryBadge product={productWithPrice as Product} />;
}

export function ProductForm({ product: initialProduct }: ProductFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id || !!initialProduct;
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<{ label: string; value: string }[]>([]);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState('en-US');
  const [selectedChannel, setSelectedChannel] = useState('default');
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  
  // State for draft prices (used in create mode)
  const [draftPrices, setDraftPrices] = useState<ProductPrice[]>([]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(initialProduct?.category || null)

  // Use the passed-in product data or fetch it if needed
  const productId = initialProduct?.id || (id ? Number(id) : undefined);

  // Form definition using react-hook-form with zod resolver and centralized default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: getDefaultProductValues(initialProduct),
    mode: 'onSubmit', // Set submission mode
  });

  // Initialize image preview if product has an image
  useEffect(() => {
    if (initialProduct?.primary_image_large) {
      setImagePreview(initialProduct.primary_image_large);
    }
  }, [initialProduct]);

  // Only fetch if no initialProduct is provided and we have an ID
  const { isLoading: queryLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const data = await productService.getProduct(productId);
      
      // Update our local product state when we get the data
      if (data) {
        setProduct(data);
      }
      
      return data;
    },
    enabled: isEditMode && !initialProduct && !!productId,
  });

  // Set form data if initialProduct is provided
  useEffect(() => {
    if (initialProduct) {
      // Reset form with data using our centralized helper
      form.reset(getDefaultProductValues(initialProduct));
      
      // Update product state
      setProduct(initialProduct);

      // Set image preview if available
      if (initialProduct.primary_image_large) {
        setImagePreview(initialProduct.primary_image_large);
      }
    }
  }, [initialProduct, form]);

  // Fetch initial category options
  useEffect(() => {
    const loadInitialCategories = async () => {
      try {
        const initialCats = await productService.getCategories();
        const options = initialCats.map(c => ({ 
          label: c.name || '', 
          value: c.id || ''
        }));
        setCategoryOptions(options);
        if (initialProduct?.category) {
          const { label, value } = extractCategoryInfo(initialProduct.category);
          const initialOption = options.find(opt => 
            String(opt.value) === String(value) || opt.label === label
          );
          if (initialOption) {
            form.setValue('category', initialOption);
            setSelectedCategory({ label: initialOption.label, id: initialOption.value, value: initialOption.value })
          } else {
            const newOption = { label, value };
            form.setValue('category', newOption);
            setSelectedCategory({ label, id: value, value })
          }
        }
      } catch (error) {
        console.error("Failed to load initial categories", error);
        toast({ title: "Error loading categories", variant: "destructive" });
      }
    };
    loadInitialCategories();
  }, [initialProduct, form, toast]);

  // Initialize Tag Options (can be extended to fetch common tags)
  useEffect(() => {
    // Load all available tags first (for both new and edit forms)
    const loadAllTags = async () => {
      try {
        console.log('Loading all available tags...');
        const tags = await productService.searchTags('');
        console.log('Loaded tags:', tags);
        setTagOptions(tags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };
    
    loadAllTags();
    
    // If we're editing, add the product's existing tags
    if (initialProduct?.tags) {
      console.log('Initializing form with product tags:', initialProduct.tags);
      // Assuming tags are stored as strings (names or IDs)
      // Create options from the product's current tags
      const initialTagOpts = initialProduct.tags.map(tag => ({ label: tag, value: tag }));
      console.log('Created tag options:', initialTagOpts);
      // Merge with any tags we've already loaded to avoid duplicates
      setTagOptions(prev => {
        const existingValues = new Set(prev.map(opt => opt.value));
        const newOpts = initialTagOpts.filter(opt => !existingValues.has(opt.value));
        const mergedOptions = [...prev, ...newOpts];
        console.log('Merged tag options:', mergedOptions);
        return mergedOptions;
      });
      // Update the form value to be the array of IDs/values
      form.setValue('tags', initialProduct.tags);
    }
  }, [initialProduct, form]);

  // Mutation for create/update
  const { mutate, isPending } = useMutation({
    mutationFn: (values: ProductFormValues) => {
      // Create FormData with proper encoding for file uploads
      const formData = new FormData();
      
      // Always ensure is_active is true
      values.is_active = true;
      
      // Debug what's happening during form submission
      console.log('Form values before FormData conversion:', values);
      
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'tags') {
          // For tags, we need to send an array, not a JSON string
          // If we have tags, append each tag individually to create a proper array in FormData
          if (Array.isArray(value) && value.length > 0) {
            // Use brackets notation for arrays in FormData
            value.forEach((tag, index) => {
              formData.append(`tags[${index}]`, tag);
            });
            console.log(`Set tags as array with ${value.length} items`);
          } else {
            // If there are no tags, send an empty array parameter to satisfy the API
            formData.append('tags', '[]');
            console.log('Set empty tags array');
          }
        } else if (key === 'attributes') {
          formData.append(key, JSON.stringify(value || {}));
        } else if (key === 'category') {
          // More carefully handle category, which comes as an object from react-select
          if (value) {
            if (typeof value === 'string') {
              formData.append(key, value);
              console.log(`Set category as string: ${value}`);
            } else if (typeof value === 'object') {
              // For category, we should send the ID to the backend
              // The backend is expecting a category_id field for properly setting the category
              const categoryId = (value as any).value || '';
              formData.append('category_id', categoryId.toString());
              console.log(`Set category_id from object: ${categoryId}`);
              
              // Also include the category name for backwards compatibility
              const categoryName = (value as any).label || '';
              formData.append(key, categoryName);
              console.log(`Set category name: ${categoryName}`);
            }
          } else {
            formData.append(key, '');
            console.log('Category is empty');
          }
        } else if (key !== 'primary_image') {
          // Handle all other fields normally - as long as they're not the image field
          formData.append(key, value?.toString() || '');
          console.log(`Set ${key}: ${value}`);
        }
      });
      
      // Handle image file separately and ensure it's properly added as a file
      if (imageFile) {
        // Make sure to append as a File object, not converted to string
        formData.append('primary_image', imageFile);
        console.log('Added image file to FormData:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        });
      }
      
      // Debug complete FormData
      console.log('FormData prepared:');
      for (const pair of formData.entries()) {
        // For debugging - keep this to help troubleshoot API issues
        console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
      }
      
      if (isEditMode && productId) {
        return productService.updateProduct(productId, formData);
      } 

      // Create product and then add any draft prices
      return productService.createProduct(formData)
        .then(createdProduct => {
          // If we have draft prices, create them now
          if (draftPrices.length > 0) {
            console.log(`Adding ${draftPrices.length} draft prices to new product ${createdProduct.id}`);
            
            // Create each price by calling the API for each draft
            return Promise.all(
              draftPrices.map(dp =>
                productService.addPrice(createdProduct.id, {
                  price_type: dp.price_type,
                  currency: dp.currency,
                  channel_id: dp.channel_id,
                  amount: dp.amount,
                  valid_from: dp.valid_from,
                  valid_to: dp.valid_to,
                })
              )
            ).then(() => createdProduct);
          }
          return createdProduct;
        });
    },
    onSuccess: (product) => {
      // Invalidate both the products list and the specific product's cache
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (product && product.id) {
        // Specifically invalidate the individual product cache
        queryClient.invalidateQueries({ queryKey: ['product', product.id] });
        
        // For edit mode, we can also refetch to force an immediate update
        if (isEditMode && product.id) {
          queryClient.refetchQueries({ queryKey: ['product', product.id] });
        }
      }
      
      toast({ title: `Product ${isEditMode ? 'updated' : 'created'} successfully`, variant: "default" });
      
      // Ensure we have a valid product ID before navigating
      if (product && product.id) {
        // Navigate to product detail page with replace:true to replace the current history entry
        navigate(`/app/products/${product.id}`, { replace: true });
      } else {
        console.error('Product created but no ID returned');
        navigate('/app/products'); // Fallback to products list if no ID
        toast({ 
          title: "Product created but there was an issue. Please check the products list.", 
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data) {
        // Handle specific backend validation errors
        const backendErrors = error.response.data;
        
        // Show the first specific error if available
        if (backendErrors.price) {
          toast({ 
            title: `Price error: ${backendErrors.price[0]}`, 
            variant: "destructive" 
          });
          // Set the error in the form
          form.setError('price', { message: backendErrors.price[0] });
        } else if (backendErrors.sku) {
          toast({ 
            title: `SKU error: ${backendErrors.sku[0]}`, 
            variant: "destructive" 
          });
          form.setError('sku', { message: backendErrors.sku[0] });
        } else {
          // Generic error message for other field errors
          const firstErrorField = Object.keys(backendErrors)[0];
          const firstErrorMessage = firstErrorField ? backendErrors[firstErrorField][0] : 'Unknown error';
          toast({ 
            title: `${firstErrorField}: ${firstErrorMessage}`, 
            variant: "destructive" 
          });
        }
      } else {
        // Generic error for non-validation issues
        toast({ 
          title: `Failed to ${isEditMode ? 'update' : 'create'} product`, 
          variant: "destructive" 
        });
      }
      
      console.error('Error saving product:', error);
      
      // Additional error details
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
    },
  });

  // Handle form submission
  const onSubmit = (values: ProductFormValues) => {
    console.log('Form submitted with values:', values);
    
    // Show immediate feedback to the user
    setIsLoading(true);
    toast({ title: "Processing your request...", description: "Creating product" });
    
    try {
      mutate(values, {
        onError: (error) => {
          console.error('Mutation error:', error);
          setIsLoading(false);
          
          // Display detailed error information
          if (axios.isAxiosError(error)) {
            console.error('API error response:', error.response?.data);
            console.error('API error status:', error.response?.status);
            console.error('API error headers:', error.response?.headers);
          }
          
          toast({ 
            title: "Error creating product", 
            description: axios.isAxiosError(error) 
              ? (error.response?.data?.detail || error.message) 
              : "An unexpected error occurred",
            variant: "destructive" 
          });
        },
        onSuccess: (data) => {
          console.log('Product created successfully:', data);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error in submit handler:', error);
      setIsLoading(false);
      toast({ 
        title: "Error creating product", 
        description: "An unexpected error occurred in the form submission",
        variant: "destructive" 
      });
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Add this function to help debug form validations
  const validateAndSubmit = () => {
    // Check if form has validation errors
    const formState = form.getValues();
    const formErrors = form.formState.errors;
    
    console.log('Current form values:', formState);
    console.log('Current form errors:', formErrors);
    
    if (Object.keys(formErrors).length > 0) {
      console.error('Form validation failed:', formErrors);
      toast({ 
        title: "Validation Error", 
        description: "Please check form fields for errors",
        variant: "destructive" 
      });
      return;
    }
    
    // If validation passes, handle submit
    form.handleSubmit(onSubmit)();
  };

  // Extracted PricingModal handler with proper cache invalidation
  const handlePricesUpdated = async () => {
    // Refresh product data to get updated prices
    if (productId) {
      try {
        // Force invalidate and refetch the product and prices
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
        queryClient.refetchQueries({ queryKey: ['product', productId] });
        queryClient.invalidateQueries({ queryKey: ['prices', productId] });
        
        // Directly fetch the updated product to refresh our form state
        const refreshedProduct = await productService.getProduct(productId);
        if (refreshedProduct) {
          // Reset form with refreshed data
          form.reset(getDefaultProductValues(refreshedProduct));
          
          // Always update our local product state with the latest data
          setProduct(refreshedProduct);

          // Show success toast
          toast({ title: "Prices updated successfully" });
        }
      } catch (error) {
        console.error("Failed to refresh product after price update", error);
        toast({ 
          title: "Prices updated but failed to refresh product data", 
          variant: "destructive" 
        });
      }
    }
  };

  if (queryLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isEditMode ? 'Edit Product' : 'Add New Product'}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => {
          console.log('Form submitted through onSubmit handler');
          validateAndSubmit(); // This will log form data and handle the submission
        })} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              {isEditMode && (
                <>
                  <TabsTrigger value="details">Details & Media</TabsTrigger>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="attributes">Attributes</TabsTrigger>
                </>
              )}
            </TabsList>
          
            <TabsContent value="basic" className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    Product Name *
                  </label>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter product name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sku" className="block text-sm font-medium">
                    SKU *
                  </label>
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter SKU" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {isEditMode && (
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPricingModalOpen(true)}
                  >
                    Pricing
                  </Button>
                  {draftPrices.length > 0 && (
                    <span className="ml-2 text-sm text-blue-600">
                      ({draftPrices.length} draft price{draftPrices.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description
                </label>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Enter product description..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-medium">
                    Category
                  </label>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="w-full justify-between"
                    >
                      {selectedCategory?.label || selectedCategory?.name || 'Select category'}
                    </Button>
                    <input
                      type="hidden"
                      {...form.register('category')}
                      value={selectedCategory?.value || selectedCategory?.id || ''}
                    />
                    <FormMessage />
                  </div>
                </div>

                {!isEditMode && (
                  <div className="space-y-2">
                    <label htmlFor="image" className="block text-sm font-medium">
                      Product Image
                    </label>
                    <div className="flex flex-col items-center space-y-4">
                      {imagePreview && (
                        <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                          <img
                            src={imagePreview}
                            alt="Product preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {isEditMode && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="tags" className="block text-sm font-medium">Tags</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-2 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Tags help categorize and search for products
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <AsyncCreatableSelect<{ label: string; value: string }, true>
                              isMulti
                              cacheOptions
                              defaultOptions={tagOptions}
                              loadOptions={productService.searchTags}
                              onCreateOption={async (inputValue) => {
                                if (!inputValue) return;
                                try {
                                  const newTag = await productService.createTag({ name: inputValue });
                                  const newOption = { label: newTag.name, value: newTag.id };
                                  setTagOptions((prev) => [...prev, newOption]);
                                  field.onChange([...(field.value || []), newOption.value]); 
                                  toast({ title: `Tag "${inputValue}" created`, variant: "default" });
                                } catch (error) {
                                  console.error("Failed to create tag:", error);
                                  toast({ title: "Failed to create tag", variant: "destructive" });
                                }
                              }}
                              onChange={(options) => {
                                const tagValues = options ? options.map(opt => opt.value) : [];
                                field.onChange(tagValues);
                              }}
                              value={tagOptions.filter(opt => (field.value || []).includes(opt.value))}
                              placeholder="Add or create tags..."
                              getOptionLabel={(option) => option.label}
                              getOptionValue={(option) => option.value}
                              isLoading={isPending}
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              }}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          
            {isEditMode && (
              <>
                <TabsContent value="details" className="space-y-4">
                  {/* Details & Media */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Product Details</h3>
                      
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter brand name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="barcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GTIN / Barcode</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter GTIN number" />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-slate-500">
                                Enter a valid EAN-8, EAN-13, UPC-A, or GTIN-14 code
                              </p>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Product Image</h3>
                      <div className="flex flex-col items-center space-y-4">
                        {imagePreview && (
                          <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Product preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="description" className="space-y-4">
                  {/* Rich Text Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Detailed Description</h3>
                    <p className="text-sm text-slate-500">Format product description with rich text editor</p>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RichTextEditor
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Enter detailed product description..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="attributes" className="space-y-4">
                  <Card className="p-6 text-center">
                    <p className="text-gray-600 mb-4">
                      You can manage attributes once the product is saved.
                    </p>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditMode ? `/app/products/${productId}` : '/app/products')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : isEditMode ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>

          <PricingModal 
            isOpen={isPricingModalOpen} 
            onClose={() => setIsPricingModalOpen(false)}
            productId={productId}
            draftPrices={draftPrices}
            setDraftPrices={setDraftPrices}
            onPricesUpdated={handlePricesUpdated}
          />

          <CategoryModal
            open={isCategoryModalOpen}
            onOpenChange={setIsCategoryModalOpen}
            productId={productId}
            currentCategoryId={selectedCategory?.id || selectedCategory?.value || null}
            onCategoryUpdated={cat => {
              // Always set both label and value for the form and selectedCategory
              setSelectedCategory({ label: cat.name, value: cat.id })
              form.setValue('category', { label: cat.name, value: cat.id })
              setIsCategoryModalOpen(false)
            }}
          />
        </form>
      </Form>
    </div>
  );
}
