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
import { useToast } from '@/domains/core/components/ui/use-toast';
import axios from 'axios';
import AsyncCreatableSelect from 'react-select/async-creatable';
// Import from our local schema file to avoid import issues
import { 
  productEditSchema, 
  getDefaultProductValues, 
  ProductFormValues,
  extractCategoryInfo
} from '@/domains/products/schemas/product-local';
import { cn } from '@/domains/core/lib/utils'
import { LocaleCode, ChannelCode } from '@/config/config'
import { Category } from '@/domains/products/types/categories'

// UI components
import { Button } from '@/domains/core/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/domains/core/components/ui/form';
import { Input } from '@/domains/core/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/domains/core/components/ui/select';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/domains/core/components/ui/tabs';
import { Spinner } from "@/domains/core/components/ui/spinner";
import { CategoryModal } from '@/domains/products/components/productstable/CategoryModal';

// Services
import { productService, Product, ProductPrice, QUERY_KEYS, PRODUCTS_API_URL } from '@/domains/products/services/productService';
import { invalidateProductQueries, invalidateProductAndAssets } from '@/domains/core/utils/query/queryInvalidation';
import { normalizeFamily } from '@/domains/core/utils/familyNormalizer';

// Custom components
import { RichTextEditor } from '@/domains/core/components/ui/RichTextEditor';
import { PriceSummaryBadge } from '@/domains/products/components/PriceSummaryBadge';
import { PricingModal } from '@/domains/products/components/PricingModal';

import { useFamilies, useOverrideAttributeGroup } from '@/domains/families/services/familyApi';
import { Family as FamilyBase } from '@/domains/families/types/family';
import { NormalizedFamily } from '@/domains/core/utils/familyNormalizer';
import { ProductAttributeGroups } from '@/domains/products/components/ProductAttributeGroups';
import { ProductAttributesPanel } from '@/domains/products/components/ProductAttributesPanel';
import { useProductAssets } from '@/domains/products/components/hooks/useProductAssets';
import { useOrgSettings } from '@/domains/organization/hooks/useOrgSettings';

// Create a composite type that includes properties from both Family interfaces
type Family = NormalizedFamily & Partial<FamilyBase>;

// Update the ProductWithFamily interface to include all required Product fields for compatibility
interface ProductWithFamily extends Omit<Product, 'family'> {
  name: string
  description: string
  sku: string
  category: string
  is_active: boolean
  family?: Family | null
  attributes?: any
  primary_image_large?: string
  tags?: string[]
}

// Add type for category options used by react-select
interface CategoryOption {
  label: string
  value: string
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
  const { locales, channels, defaultLocale, defaultChannel } = useOrgSettings()
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(defaultLocale)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCode>(
    defaultChannel?.code || (channels.length > 0 ? channels[0].code : '')
  )
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

  // This will be used for image upload operations
  const productAssetsHook = useProductAssets(productId || 0);

  // Form definition using react-hook-form with zod resolver and centralized default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: getDefaultProductValues(initialProduct as Product),
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
      const defaultValues = getDefaultProductValues(initialProduct as Product);
      console.log('Default values from helper:', defaultValues);
      
      // Reset form with data using our centralized helper
      form.reset(getDefaultProductValues(initialProduct as Product));
      
      // Just to be extra sure, explicitly set these critical fields
      form.setValue('name', initialProduct.name || '');
      form.setValue('sku', initialProduct.sku || '');
      
      // Update product state
      setProduct(initialProduct);

      // Set image preview if available
      if (initialProduct.primary_image_large) {
        setImagePreview(initialProduct.primary_image_large);
      }

      // Normalize and set family data if available
      if (initialProduct.family) {
        const normalizedFamily = normalizeFamily(initialProduct.family, initialProduct.family_name);
        setSelectedFamily(normalizedFamily || null);
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
          value: String(c.id || '')
        }));
        setCategoryOptions(options);
        if (initialProduct?.category) {
          let normalizedCategory = ''
          if (isCategoryOption(initialProduct.category)) {
            normalizedCategory = initialProduct.category.value
          } else if (typeof initialProduct.category === 'number') {
            normalizedCategory = String(initialProduct.category)
          } else {
            normalizedCategory = initialProduct.category
          }
          const { label, value } = extractCategoryInfo(normalizedCategory)
          const initialOption = options.find(opt => 
            String(opt.value) === String(value) || opt.label === label
          )
          if (initialOption) {
            form.setValue('category', { label: initialOption.label, value: String(initialOption.value) })
            setSelectedCategory({ label: initialOption.label, id: String(initialOption.value), value: String(initialOption.value) })
          } else {
            const newOption = { label, value: String(value) }
            form.setValue('category', newOption)
            setSelectedCategory({ label, id: String(value), value: String(value) })
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
        setTagOptions(tags.map((t: { label: string; value: string | number }) => ({ label: t.label, value: String(t.value) })));
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };
    
    loadAllTags();
    
    // If we're editing, add the product's existing tags
    if (initialProduct?.tags) {
      console.log('Initializing form with product tags:', initialProduct.tags);
      const initialTagOpts = (initialProduct.tags as string[]).map((tag: string) => ({ label: tag, value: String(tag) }))
      console.log('Created tag options:', initialTagOpts)
      setTagOptions(prev => {
        const existingValues = new Set(prev.map((opt: { label: string; value: string }) => opt.value))
        const newOpts = initialTagOpts.filter((opt: { label: string; value: string }) => !existingValues.has(opt.value))
        const mergedOptions = [...prev, ...newOpts]
        console.log('Merged tag options:', mergedOptions)
        return mergedOptions
      })
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
    setIsLoading(true);
    
    // Make a copy of the payload to modify it
    let payload: any = {
      ...values,
      family: selectedFamily?.id || null,
    };

    // If in edit mode, include tags, otherwise exclude them completely
    if (isEditMode) {
      // For edit mode: ensure tags is an array
      payload.tags = values.tags || [];
    } else {
      // For create mode: completely remove tags to avoid the API error
      delete payload.tags;
    }

    console.log('Submitting product with family:', selectedFamily?.id || null);

    // Set up function to call based on mode
    if (isEditMode && productId !== undefined) {
      // Edit mode - use direct JSON payload (without image)
      productService.updateProduct(productId, payload as any)
        .then(async (result: Product) => {
          toast({ title: `Product updated successfully` });
          
          // Invalidate product queries
          await invalidateProductQueries(queryClient, productId);
          
          // Handle image upload separately if present
          if (imageFile) {
            try {
              console.log('Uploading image for existing product...');
              
              // Upload the image using the hook from component level
              const asset = await productAssetsHook.uploadAssetAsync({
                file: imageFile,
                onProgress: (progress) => {
                  console.log(`Upload progress: ${progress}%`);
                }
              });
              
              // Set as primary if successful
              if (asset?.id) {
                await productAssetsHook.setPrimaryAssetAsync(asset.id);
              }
              
              console.log('Image uploaded and set as primary');
            } catch (error) {
              console.error('Failed to upload image:', error);
              toast({ 
                title: 'Product updated but image upload failed',
                variant: 'destructive'
              });
            }
          }
          
          // Navigate to product detail page
          navigate(`/app/products/${productId}`);
        })
        .catch((error: unknown) => {
          console.error(`Failed to update product:`, error);
          const errorMessage = error instanceof Error ? error.message : `Failed to update product`;
          toast({ title: errorMessage, variant: 'destructive' });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Create mode - first create the product without the image
      productService.createProduct(payload as any)
        .then(async (result: Product) => {
          const newProductId = result.id;
          
          if (!newProductId) {
            throw new Error('Created product but no ID was returned');
          }
          
          toast({ title: `Product created successfully` });
          
          // Add draft prices if needed
          if (draftPrices.length > 0) {
            console.log(`Adding ${draftPrices.length} draft prices to new product ${newProductId}`);
            
            try {
              await Promise.all(
                draftPrices.map(dp =>
                  productService.addPrice(newProductId, {
                    price_type: dp.price_type,
                    currency: dp.currency,
                    channel_id: dp.channel_id,
                    amount: dp.amount,
                    valid_from: dp.valid_from,
                    valid_to: dp.valid_to,
                  })
                )
              );
              console.log('Prices added successfully');
            } catch (error) {
              console.error('Failed to add draft prices:', error);
              toast({ 
                title: 'Product created but prices could not be added',
                variant: 'destructive'
              });
            }
          }
          
          // Upload image if present - IMPORTANT: For newly created products, we need to use productService directly
          // since our hook is instantiated with the old productId (which is 0 for new products)
          if (imageFile) {
            try {
              console.log('Uploading image for new product...');
              
              // Upload the image directly with productService
              const uploadedAsset = await productService.uploadAsset(
                newProductId, 
                imageFile, 
                (progressEvent) => {
                  const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                  console.log(`Upload progress: ${progress}%`);
                }
              );
              
              // Set as primary
              if (uploadedAsset?.id) {
                await productService.setAssetPrimary(newProductId, uploadedAsset.id);
                
                // Invalidate relevant queries for the new product
                await invalidateProductAndAssets(queryClient, newProductId);
              }
              
              console.log('Image uploaded and set as primary');
            } catch (error) {
              console.error('Failed to upload image:', error);
              toast({ 
                title: 'Product created but image upload failed',
                variant: 'destructive'
              });
            }
          }
          
          // Navigate to the product detail page
          navigate(`/app/products/${newProductId}`);
        })
        .catch((error: unknown) => {
          console.error(`Failed to create product:`, error);
          const errorMessage = error instanceof Error ? error.message : `Failed to create product`;
          toast({ title: errorMessage, variant: 'destructive' });
        })
        .finally(() => {
          setIsLoading(false);
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
          form.reset(getDefaultProductValues(refreshedProduct as Product));
          
          // Always update our local product state with the latest data
          setProduct(refreshedProduct as any);

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
  const handleFamilyChange = async (value: number | null) => {
    // Check if "none" was selected (which we'll treat as null)
    if (value === null) {
      setSelectedFamily(null);
      
      // Invalidate queries to refresh the UI
      if (productId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['product', productId] }),
          queryClient.invalidateQueries({ queryKey: ['familyAttributeGroups', null] }),
          queryClient.invalidateQueries({ queryKey: ['attributes', productId] })
        ]);
      }
      
      toast({
        title: "Family Removed",
        description: "No family selected. Attribute groups inheritance will be disabled. Please assign a family to enable attribute group management.",
        variant: "destructive"
      });
      return;
    }
    
    // Find the family in the list of families
    const family = families?.find(f => f.id === value);
    
    // Create a normalized family object
    const normalizedFamily = normalizeFamily(family);
    
    if (normalizedFamily) {
      setSelectedFamily(normalizedFamily);
      
      // Invalidate and refetch all relevant queries
      if (productId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['product', productId] }),
          queryClient.invalidateQueries({ queryKey: ['familyAttributeGroups', value] }),
          queryClient.invalidateQueries({ queryKey: ['attributes', productId] }),
          // Force a refetch of the product data
          queryClient.refetchQueries({ queryKey: ['product', productId] })
        ]);
      }
      
      // Show toast notification about inheritance
      toast({
        title: "Family Selected",
        description: `This product will now inherit all attribute groups from the '${normalizedFamily.label}' family.`,
        variant: "default"
      });
      
      // Check if required attribute groups have values
      if (product && family?.attribute_groups) {
        const requiredGroups = family.attribute_groups.filter(group => group.required);
        
        // Additional warning about required attribute groups if needed
        if (requiredGroups.length > 0) {
          toast({
            title: "Required Attributes",
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
    const isInFamily = selectedFamily?.attribute_groups?.some(
      group => group.attribute_group === groupId
    ) ?? false;
    
    // Check if it's been hidden by an override
    const isHidden = hiddenAttributeGroups.includes(groupId);
    
    return isInFamily && !isHidden;
  };

  // Fix the SKU validation useEffect hook
  useEffect(() => {
    // Set up SKU validation
    const validateSku = async (value: string) => {
      if (value && value.length > 2) {
        try {
          // Call API to check if SKU exists
          const response = await axios.get(`${PRODUCTS_API_URL}/check-sku/?sku=${encodeURIComponent(value)}`);
          
          // If SKU exists and we're not in edit mode (or editing a different product)
          if (response.data?.exists && 
              (!isEditMode || (isEditMode && response.data.product_id !== productId))) {
            form.setError('sku', { 
              message: 'A product with this SKU already exists' 
            });
          } else {
            // Clear error if SKU is valid
            form.clearErrors('sku');
          }
        } catch (error) {
          // If endpoint doesn't exist or another error, don't block submission
          console.warn('Failed to validate SKU:', error);
        }
      }
    };
    
    // Set up the subscription
    const subscription = form.watch((value, { name }) => {
      if (name === 'sku' && typeof value.sku === 'string') {
        validateSku(value.sku);
      }
    });
    
    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [form, isEditMode, productId]);

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
                      value={selectedCategory ? String(selectedCategory.value || selectedCategory.id || '') : ''}
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
                  onValueChange={(value) => {
                    // Convert value to number or null
                    const familyId = value === "none" ? null : value ? Number(value) : null;
                    handleFamilyChange(familyId);
                  }}
                  defaultValue={initialProduct?.family?.id?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {families?.map((family) => (
                      <SelectItem key={family.id} value={family.id.toString()}>
                        {family.label} ({family.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {selectedFamily ? (
                    <>
                      <span className="block text-blue-600 font-medium">Family defines attribute groups for this product.</span>
                      {selectedFamily?.attribute_groups && selectedFamily.attribute_groups.length > 0 ? (
                        <span className="block mt-1">
                          Contains {selectedFamily.attribute_groups.length} attribute groups, 
                          {selectedFamily.attribute_groups.filter(g => g.required).length} required.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="block text-amber-600">No family selected. Attribute groups will not be available until a family is selected.</span>
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
            
            <TabsContent value="attributes" className="space-y-4">
              {productId && (
                <ProductAttributesPanel
                  key={`${productId}-${selectedFamily?.id ?? 'none'}-${selectedLocale}-${selectedChannel}`}
                  productId={String(productId)}
                  locale={selectedLocale}
                  channel={selectedChannel}
                  familyId={selectedFamily?.id}
                />
              )}
              {!productId && (
                <div className="p-4 text-center text-gray-500">
                  <p>Attributes will be available after saving the product.</p>
                </div>
              )}
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
              form.setValue('category', { label: cat.name, value: String(cat.id) })
              setSelectedCategory({ label: cat.name, id: String(cat.id), value: String(cat.id) })
              setIsCategoryModalOpen(false)
            }}
          />

          {product && product.family && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Family Attribute Groups</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage which attribute groups from the product family should appear for this product.
                Groups are inherited from the '<span className="font-medium">{product.family.label}</span>' family.
              </p>
              <ProductAttributeGroups 
                product={{
                  id: productId || 0,
                  family: product.family,
                  effective_attribute_groups: product.attributes?.effective_attribute_groups || [],
                  family_overrides: product.attributes?.family_overrides || []
                } as any}
                onGroupsChange={() => {
                  // Optionally refresh the product data or UI
                  if (productId) {
                    queryClient.invalidateQueries({ queryKey: ['product', productId] });
                  }
                }}
              />
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

function isCategoryOption(obj: unknown): obj is CategoryOption {
  return typeof obj === 'object' && obj !== null && 'value' in obj && typeof (obj as any).value === 'string'
}
