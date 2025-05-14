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

import { LOCALES, LocaleCode } from '@/config/locales'
import { CHANNELS, ChannelCode } from '@/config/channels'
import { useFamilies, useOverrideAttributeGroup } from '@/api/familyApi';
import { Family } from '@/types/family';

const PRODUCTS_BASE_URL = `${API_URL}/products`;

// Add family property to Product interface
interface ProductWithFamily extends Product {
  family?: Family | null;
  attributes?: any;
}

// Add type for category options used by react-select
interface CategoryOption {
  label: string;
  value: number | string;
}

interface ProductFormProps {
  product?: ProductWithFamily;
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
  
  // Use the passed-in product data or fetch it if needed
  const productId = initialProduct?.id || (id ? Number(id) : undefined);
  
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<{ label: string; value: string }[]>([]);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(LOCALES[0].code)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCode>(CHANNELS[0].code)
  const [product, setProduct] = useState<ProductWithFamily | null>(initialProduct || null);
  
  // State for draft prices (used in create mode)
  const [draftPrices, setDraftPrices] = useState<ProductPrice[]>([]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(initialProduct?.category || null)

  const [selectedFamily, setSelectedFamily] = useState<Family | null>(initialProduct?.family || null);
  const [hiddenAttributeGroups, setHiddenAttributeGroups] = useState<number[]>([]);
  
  // Fetch families
  const { data: families, isLoading: isFamiliesLoading } = useFamilies();
  
  // Add the override attribute group hook
  const overrideAttributeGroup = useOverrideAttributeGroup(productId || 0);

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
        setProduct(data as ProductWithFamily);
      }
      
      return data;
    },
    enabled: isEditMode && !initialProduct && !!productId,
  });

  // Set form data if initialProduct is provided
  useEffect(() => {
    if (initialProduct) {
      console.log('Setting initial form values from product:', initialProduct);
      
      // Make sure name and SKU are explicitly set
      const defaultValues = getDefaultProductValues(initialProduct);
      console.log('Default values from helper:', defaultValues);
      
      // Reset form with data using our centralized helper
      form.reset(defaultValues);
      
      // Just to be extra sure, explicitly set these critical fields
      form.setValue('name', initialProduct.name || '');
      form.setValue('sku', initialProduct.sku || '');
      
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

  // Add effect to handle hidden attribute groups when family changes
  useEffect(() => {
    if (product?.attributes && typeof product.attributes === 'object' && 'hidden_attribute_groups' in product.attributes) {
      setHiddenAttributeGroups(product.attributes.hidden_attribute_groups || []);
    }
  }, [product]);

  // Mutation for create/update
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      // Debug what's happening during form submission
      console.log('Mutation executing with FormData');
      
      // Verify name and SKU are in the FormData
      console.log('Name in FormData:', data.get('name'));
      console.log('SKU in FormData:', data.get('sku'));
      
      // Create or update the product
      if (isEditMode && productId) {
        return productService.updateProduct(productId, data);
      } 

      // Create product and then add any draft prices
      return productService.createProduct(data)
        .then(createdProduct => {
          // If we have draft prices, create them now
          if (draftPrices.length > 0) {
            console.log(`Adding ${draftPrices.length} draft prices to new product ${createdProduct.id}`);
            
            // Create each price by calling the API for each draft
            return Promise.all(
              draftPrices.map(dp =>
                productService.addPrice(createdProduct.id || 0, {
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

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      console.log('Image selected for upload:', file.name, 'size:', file.size, 'type:', file.type);
    }
  };

  // Handle form submission
  const onSubmit = (values: ProductFormValues) => {
    console.log('Form submitted with values:', values);
    
    // Show immediate feedback to the user
    setIsLoading(true);
    toast({ title: "Processing your request...", description: isEditMode ? "Updating product" : "Creating product" });
    
    try {
      // Keep original values for validation and mutation
      const productValues = { ...values };
      
      // Log values to verify they exist before submission
      console.log('Product name:', productValues.name);
      console.log('Product SKU:', productValues.sku);
      
      // Make sure required fields are present
      if (!productValues.name || !productValues.sku) {
        console.error('Name or SKU is missing');
        setIsLoading(false);
        toast({ 
          title: "Required fields missing", 
          description: "Please enter both a name and SKU for the product",
          variant: "destructive" 
        });
        return;
      }
      
      // Create FormData object for file uploads
      const formData = new FormData();
      
      // Explicitly add name and SKU first to ensure they're included
      formData.append('name', productValues.name || '');
      formData.append('sku', productValues.sku || '');
      
      // Add all other form fields to FormData
      Object.entries(productValues).forEach(([key, value]) => {
        // Skip name and SKU since we already added them
        if (key === 'name' || key === 'sku') return;
        
        if (key === 'tags') {
          // Always send tags as a JSON array string
          formData.append('tags', JSON.stringify(value || []))
        } else if (key === 'attributes') {
          formData.append(key, JSON.stringify(value || {}));
        } else if (key === 'category') {
          // Handle category, which comes as an object from react-select
          if (value) {
            if (typeof value === 'string') {
              formData.append(key, value);
            } else if (typeof value === 'object') {
              const categoryId = (value as any).value || '';
              formData.append('category_id', categoryId.toString());
              const categoryName = (value as any).label || '';
              formData.append(key, categoryName);
            }
          } else {
            formData.append(key, '');
          }
        } else if (key !== 'primary_image') {
          // Handle all other fields
          formData.append(key, value?.toString() || '');
        }
      });
      
      // Handle image file separately
      if (imageFile) {
        formData.append('primary_image', imageFile);
      } else if (isEditMode && imagePreview && imagePreview.startsWith('http')) {
        formData.append('keep_existing_image', 'true');
      }
      
      // Log the FormData content for debugging
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(`[FormData] ${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
      }
      
      // Submit the form using the original mutate function which expects FormData
      if (isEditMode && productId) {
        mutate(formData, {
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
              title: `Error ${isEditMode ? 'updating' : 'creating'} product`, 
              description: axios.isAxiosError(error) 
                ? (error.response?.data?.detail || error.message) 
                : "An unexpected error occurred",
              variant: "destructive" 
            });
          },
          onSuccess: (data) => {
            console.log(`Product ${isEditMode ? 'updated' : 'created'} successfully:`, data);
            setIsLoading(false);
          }
        });
      } else {
        mutate(formData, {
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
              title: `Error ${isEditMode ? 'updating' : 'creating'} product`, 
              description: axios.isAxiosError(error) 
                ? (error.response?.data?.detail || error.message) 
                : "An unexpected error occurred",
              variant: "destructive" 
            });
          },
          onSuccess: (data) => {
            console.log(`Product ${isEditMode ? 'updated' : 'created'} successfully:`, data);
            setIsLoading(false);
          }
        });
      }
    } catch (error) {
      console.error('Error in submit handler:', error);
      setIsLoading(false);
      toast({ 
        title: `Error ${isEditMode ? 'updating' : 'creating'} product`, 
        description: "An unexpected error occurred in the form submission",
        variant: "destructive" 
      });
    }
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
          setProduct(refreshedProduct as ProductWithFamily);

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

  // Handle family change
  const handleFamilyChange = async (familyId: number | null) => {
    if (!familyId) {
      setSelectedFamily(null);
      return;
    }
    
    const family = families?.find(f => f.id === familyId);
    if (family) {
      setSelectedFamily(family);
      
      // Check if required attribute groups have values
      if (product && family.attribute_groups) {
        const requiredGroups = family.attribute_groups.filter(group => group.required);
        
        // Warn about required attribute groups
        if (requiredGroups.length > 0) {
          toast({
            title: "Family Selected",
            description: `This family requires ${requiredGroups.length} attribute groups. Please fill in all required attributes.`,
            variant: "default"
          });
        }
      }
    }
  };
  
  // Toggle attribute group visibility
  const toggleAttributeGroup = async (groupId: number, isVisible: boolean) => {
    if (!productId) return;
    
    try {
      await overrideAttributeGroup.mutateAsync({
        groupId,
        removed: !isVisible
      });
      
      // Update local state
      setHiddenAttributeGroups(prev => 
        isVisible 
          ? prev.filter(id => id !== groupId)
          : [...prev, groupId]
      );
      
      toast({
        title: isVisible ? "Group Shown" : "Group Hidden",
        description: `Attribute group visibility updated.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to toggle attribute group visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update attribute group visibility.",
        variant: "destructive"
      });
    }
  };
  
  // Check if an attribute group should be shown based on family and overrides
  const shouldShowAttributeGroup = (groupId: number): boolean => {
    if (!selectedFamily) return true;
    
    // Check if this group is in the family
    const isInFamily = selectedFamily.attribute_groups.some(
      group => group.attribute_group === groupId
    );
    
    // Check if it's been hidden by an override
    const isHidden = hiddenAttributeGroups.includes(groupId);
    
    return isInFamily && !isHidden;
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
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

              {/* Add Family select field */}
              <FormItem className="flex flex-col">
                <FormLabel>Product Family</FormLabel>
                <Select
                  onValueChange={(value) => handleFamilyChange(value ? Number(value) : null)}
                  defaultValue={initialProduct?.family?.id?.toString() || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {families?.map((family) => (
                      <SelectItem key={family.id} value={family.id.toString()}>
                        {family.label} ({family.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-enterprise-500 mt-1">
                  {selectedFamily ? (
                    <>
                      Family defines required attribute groups for this product.
                      {selectedFamily.attribute_groups.length > 0 ? (
                        <span className="block mt-1">
                          Contains {selectedFamily.attribute_groups.length} attribute groups, 
                          {selectedFamily.attribute_groups.filter(g => g.required).length} required.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "No family selected. All attribute groups will be shown."
                  )}
                </p>
              </FormItem>
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
            
            <TabsContent value="attributes">
              <AttributesTab 
                form={form}
                product={product} 
                selectedFamily={selectedFamily}
                hiddenGroups={hiddenAttributeGroups}
                onToggleGroupVisibility={toggleAttributeGroup}
                shouldShowGroup={shouldShowAttributeGroup}
              />
            </TabsContent>
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
            productId={productId || 0}
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
