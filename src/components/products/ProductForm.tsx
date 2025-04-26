import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useToast } from '@/components/ui/use-toast';
import AsyncCreatableSelect from 'react-select/async-creatable';
import axios from 'axios';

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

// Services
import { productService, Product } from '@/services/productService';
import { API_URL } from '@/config';
import { getCategories, createCategory } from "@/services/categoryService";

const PRODUCTS_BASE_URL = `${API_URL}/products`;

// Validation for GTIN (EAN-8, EAN-13, UPC-A, GTIN-14)
const isValidGTIN = (code: string): boolean => {
  // Remove any spaces or dashes
  code = code.replace(/[\s-]/g, '');
  
  // Check if the code contains only digits
  if (!/^\d+$/.test(code)) return false;
  
  // Check for valid length
  if (![8, 12, 13, 14].includes(code.length)) return false;
  
  // Checksum validation (Luhn algorithm for GTIN/EAN/UPC)
  let sum = 0;
  const parity = code.length % 2;
  
  for (let i = 0; i < code.length - 1; i++) {
    let digit = parseInt(code[i], 10);
    if (i % 2 === parity) digit *= 3;
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code[code.length - 1], 10);
};

// Add type for category options used by react-select
interface CategoryOption {
  label: string;
  value: number | string;
}

// Schema for product form validation
const productEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  price: z.coerce
    .number({ required_error: "Price is required" })
    .min(0.01, "Price must be at least 0.01"),
  category: z.any().optional(), // Allow any type for react-select object
  is_active: z.boolean().default(true), // Always true by default, kept for backend compatibility
  primary_image: z.any().optional(),
  brand: z.string().optional(),
  barcode: z.string()
    .refine(val => val === '' || isValidGTIN(val), {
      message: "Invalid GTIN format. Please enter a valid EAN-8, EAN-13, UPC-A, or GTIN-14 code",
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.string()).default({}),
});

type ProductFormValues = z.infer<typeof productEditSchema>;

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product: initialProduct }: ProductFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id || !!initialProduct;
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<{ label: string; value: string }[]>([]);

  // Use the passed-in product data or fetch it if needed
  const productId = initialProduct?.id || (id ? Number(id) : undefined);

  // Form definition using react-hook-form with zod resolver
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: initialProduct?.name || '',
      description: initialProduct?.description || '',
      sku: initialProduct?.sku || '',
      price: initialProduct?.price || 0.01,
      category: initialProduct?.category ? 
        { label: initialProduct.category, value: initialProduct.category } : undefined,
      is_active: initialProduct?.is_active ?? true,
      brand: initialProduct?.brand || '',
      barcode: initialProduct?.barcode || '',
      tags: initialProduct?.tags || [],
      attributes: initialProduct?.attributes || {},
    },
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
    queryFn: () => productId ? productService.getProduct(productId) : null,
    enabled: isEditMode && !initialProduct && !!productId,
  });

  // Set form data if initialProduct is provided
  useEffect(() => {
    if (initialProduct) {
      // Reset form with data
      form.reset({
        name: initialProduct.name,
        description: initialProduct.description || '',
        sku: initialProduct.sku,
        price: initialProduct.price,
        category: initialProduct.category ? { label: initialProduct.category, value: initialProduct.category } : undefined,
        is_active: initialProduct.is_active,
        brand: initialProduct.brand || '',
        barcode: initialProduct.barcode || '',
        tags: initialProduct.tags || [],
        attributes: initialProduct.attributes || {},
      });

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
        const options = initialCats.map(c => ({ label: c.name, value: c.id }));
        setCategoryOptions(options);
        // Set default category value if editing
        if (initialProduct?.category) {
          const initialOption = options.find(opt => opt.label === initialProduct.category || opt.value === initialProduct.category);
          if (initialOption) {
            form.setValue('category', initialOption);
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
      const formData = new FormData();
      
      // Always ensure is_active is true
      values.is_active = true;
      
      // Debug what's happening during form submission
      console.log('Form values before FormData conversion:', values);
      
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(value || [])); // Send tag IDs
        } else if (key === 'attributes') {
          formData.append(key, JSON.stringify(value || {}));
        } else if (key === 'category') {
          // More carefully handle category, which comes as an object from react-select
          if (value) {
            if (typeof value === 'string') {
              formData.append(key, value);
              console.log(`Set category as string: ${value}`);
            } else if (typeof value === 'object') {
              // If it's an object from react-select, prefer the label property
              const categoryValue = (value as any).label || (value as any).value || '';
              formData.append(key, categoryValue);
              console.log(`Set category from object: ${categoryValue}`);
            }
          } else {
            formData.append(key, '');
            console.log('Category is empty');
          }
        } else if (key !== 'primary_image') {
          formData.append(key, value?.toString() || '');
          console.log(`Set ${key}: ${value}`);
        }
      });
      
      if (imageFile) {
        formData.append('primary_image', imageFile);
        console.log('Added image file to FormData');
      }
      
      // Debug complete FormData
      console.log('FormData prepared:');
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      if (isEditMode && productId) {
        return productService.updateProduct(productId, formData);
      } 
      return productService.createProduct(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: `Product ${isEditMode ? 'updated' : 'created'} successfully`, variant: "default" });
      navigate('/app/products');
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
    mutate(values);
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle adding a new attribute
  const handleAddAttribute = () => {
    if (newAttributeKey.trim() && newAttributeValue.trim()) {
      const newAttributes = { ...attributes, [newAttributeKey]: newAttributeValue };
      setAttributes(newAttributes);
      form.setValue("attributes", newAttributes);
      setNewAttributeKey("");
      setNewAttributeValue("");
    }
  };

  // Handle removing an attribute
  const handleRemoveAttribute = (key: string) => {
    const newAttributes = { ...attributes };
    delete newAttributes[key];
    setAttributes(newAttributes);
    form.setValue("attributes", newAttributes);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="details">Details & Metadata</TabsTrigger>
              <TabsTrigger value="attributes">Technical Specifications</TabsTrigger>
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
                        <Textarea
                          {...field}
                          placeholder="Enter product description"
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-sm font-medium">
                    Price *
                  </label>
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.01"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-medium">
                    Category
                  </label>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AsyncCreatableSelect<CategoryOption, false>
                            cacheOptions
                            defaultOptions={categoryOptions}
                            loadOptions={productService.searchCategories}
                            onCreateOption={async (inputValue) => {
                              if (!inputValue) return;
                              try {
                                const newCategory = await productService.createCategory({ name: inputValue });
                                const newOption = { label: newCategory.name, value: newCategory.id };
                                setCategoryOptions((prev) => [...prev, newOption]);
                                field.onChange(newOption);
                                toast({ title: `Category "${inputValue}" created`, variant: "default" });
                              } catch (error) {
                                console.error("Failed to create category:", error);
                                toast({ title: "Failed to create category", variant: "destructive" });
                              }
                            }}
                            onChange={(option) => field.onChange(option)}
                            value={field.value}
                            placeholder="Select or create a category"
                            getOptionLabel={(option) => option.label}
                            getOptionValue={(option) => option.value.toString()}
                            isLoading={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
            </TabsContent>
          
            <TabsContent value="details" className="space-y-4">
              {/* Details & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="brand" className="block text-sm font-medium">
                    Brand
                  </label>
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter brand name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="barcode" className="block text-sm font-medium">
                    GTIN
                  </label>
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter GTIN number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Enter a valid EAN-8, EAN-13, UPC-A, or GTIN-14 code
                  </p>
                </div>
              </div>

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
                            console.log('Tag selection changed. Selected options:', options);
                            const tagValues = options ? options.map(opt => opt.value) : [];
                            console.log('Setting tag values in form:', tagValues);
                            field.onChange(tagValues);
                          }}
                          value={tagOptions.filter(opt => {
                            const isIncluded = (field.value || []).includes(opt.value);
                            console.log(`Tag ${opt.label} (${opt.value}) included in field value:`, isIncluded, 'Field value:', field.value);
                            return isIncluded;
                          })}
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
            </TabsContent>
            
            <TabsContent value="attributes" className="space-y-4">
              {/* Technical Specifications */}
              <div className="border rounded-md p-4 space-y-4">
                <h3 className="font-medium">Product Attributes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      value={newAttributeKey}
                      onChange={(e) => setNewAttributeKey(e.target.value)}
                      placeholder="Attribute name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Input
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      placeholder="Attribute value"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Button 
                      type="button"
                      onClick={handleAddAttribute}
                      disabled={!newAttributeKey.trim() || !newAttributeValue.trim()}
                      className="w-full"
                    >
                      Add Attribute
                    </Button>
                  </div>
                </div>
                
                {Object.entries(attributes).length > 0 ? (
                  <div className="mt-4 border rounded-md divide-y">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 hover:bg-gray-50">
                        <div>
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttribute(key)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">No attributes added yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/products')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : isEditMode ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
