import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
import { ChevronDown, ChevronRight, HelpCircle, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from "@/components/ui/spinner";
import { FileUpload } from "@/components/ui/file-upload";
import { Info } from "lucide-react";

// Services
import { productService, Product } from '@/services/productService';
import { API_URL } from '@/config';
import { getCategories, createCategory } from "@/services/categoryService";

const PRODUCTS_BASE_URL = `${API_URL}/products`;

const COUNTRY_CODES = [
  "US", "CA", "MX", "UK", "FR", "DE", "ES", "IT", "AU", "JP", "CN", "BR", "IN"
];

const PRODUCT_TYPES = [
  "Physical", "Digital", "Service", "Subscription", "Bundle"
];

const UNITS_OF_MEASURE = [
  "Each", "Pair", "Pack", "Box", "Case", "Pallet", "Kg", "Gram", "Liter", "Meter"
];

// Schema for product form validation
const productEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  price: z.coerce
    .number({ required_error: "Price is required" })
    .min(0, "Price must be positive"),
  stock: z.coerce
    .number({ required_error: "Stock is required" })
    .min(0, "Stock must be positive")
    .int("Stock must be a whole number"),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
  primary_image: z.any().optional(),
  // New fields
  brand: z.string().optional(),
  type: z.string().optional(),
  unit_of_measure: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).default([]),
  country_availability: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.string()).default({}),
});

type ProductFormValues = z.infer<typeof productEditSchema>;

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product: initialProduct }: ProductFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id || !!initialProduct;
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  // Use the passed-in product data or fetch it if needed
  const productId = initialProduct?.id || (id ? Number(id) : undefined);

  // Form definition using react-hook-form with zod resolver
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: initialProduct?.name || '',
      description: initialProduct?.description || '',
      sku: initialProduct?.sku || '',
      price: initialProduct?.price || 0,
      stock: initialProduct?.stock || 0,
      category: initialProduct?.category || '',
      is_active: initialProduct?.is_active ?? true,
      brand: initialProduct?.brand || '',
      type: initialProduct?.type || '',
      unit_of_measure: initialProduct?.unit_of_measure || '',
      barcode: initialProduct?.barcode || '',
      tags: initialProduct?.tags || [],
      country_availability: initialProduct?.country_availability || [],
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
        stock: initialProduct.stock,
        category: initialProduct.category,
        is_active: initialProduct.is_active,
        brand: initialProduct.brand || '',
        type: initialProduct.type || '',
        unit_of_measure: initialProduct.unit_of_measure || '',
        barcode: initialProduct.barcode || '',
        tags: initialProduct.tags || [],
        country_availability: initialProduct.country_availability || [],
        attributes: initialProduct.attributes || {},
      });

      // Set image preview if available
      if (initialProduct.primary_image_large) {
        setImagePreview(initialProduct.primary_image_large);
      }
    }
  }, [initialProduct, form]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const categoriesList = await getCategories();
        setCategories(categoriesList);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Initialize tags and countries from product data
  useEffect(() => {
    if (form.getValues().tags?.length) {
      setTags(form.getValues().tags);
    }
    if (form.getValues().country_availability?.length) {
      setCountries(form.getValues().country_availability);
    }
    if (form.getValues().attributes) {
      setAttributes(form.getValues().attributes);
    }
  }, [form]);

  // Update form when tags or countries change
  useEffect(() => {
    form.setValue("tags", tags);
  }, [tags, form]);

  useEffect(() => {
    form.setValue("country_availability", countries);
  }, [countries, form]);

  // Handler for creating a new category
  const handleCreateCategory = async (categoryName: string) => {
    try {
      await createCategory(categoryName);
      // Add the new category to the local state
      setCategories(prev => [...prev, categoryName]);
      toast.success(`Category "${categoryName}" created successfully`);
      return;
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category");
      throw error;
    }
  };

  // Mutation for create/update
  const { mutate, isPending } = useMutation({
    mutationFn: (values: ProductFormValues) => {
      // Handle file upload if needed
      const formData = new FormData();
      
      // Add all form values to formData
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'tags' || key === 'country_availability' || key === 'attributes') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value?.toString() || '');
        }
      });
      
      // Add image if available
      if (imageFile) {
        formData.append('primary_image', imageFile);
      }
      
      if (isEditMode && productId) {
        return productService.updateProduct(productId, formData);
      }
      return productService.createProduct(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully`);
      navigate('/app/products');
    },
    onError: (error) => {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`);
      console.error('Error saving product:', error);
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
      const newAttributes = {
        ...attributes,
        [newAttributeKey]: newAttributeValue
      };
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
                            min="0"
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="stock" className="block text-sm font-medium">
                    Stock *
                  </label>
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                        <CreatableSelect
                          options={categories}
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          onCreateOption={handleCreateCategory}
                          placeholder={categoriesLoading ? "Loading categories..." : "Select or create a category"}
                          disabled={isLoading || categoriesLoading}
                          className="w-full"
                        />
                      </FormControl>
                      {field.value && (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Product will be visible to users
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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

                <div className="space-y-2">
                  <label htmlFor="type" className="block text-sm font-medium">
                    Product Type
                  </label>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CreatableSelect
                            options={PRODUCT_TYPES}
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value)}
                            onCreateOption={async (value) => {
                              field.onChange(value);
                              return Promise.resolve();
                            }}
                            placeholder="Select or create a product type"
                            disabled={isLoading}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="unit_of_measure" className="block text-sm font-medium">
                    Unit of Measure
                  </label>
                  <FormField
                    control={form.control}
                    name="unit_of_measure"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CreatableSelect
                            options={UNITS_OF_MEASURE}
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value)}
                            onCreateOption={async (value) => {
                              field.onChange(value);
                              return Promise.resolve();
                            }}
                            placeholder="Select or create a unit of measure"
                            disabled={isLoading}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="barcode" className="block text-sm font-medium">
                    Barcode / UPC
                  </label>
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter barcode number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label htmlFor="tags" className="block text-sm font-medium">
                    Tags
                  </label>
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
                <TagInput
                  id="tags"
                  tags={tags}
                  setTags={setTags}
                  placeholder="Add tag and press Enter"
                  maxTags={10}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label htmlFor="countries" className="block text-sm font-medium">
                    Country Availability
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Enter country codes (e.g., US, CA, UK)
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <TagInput
                  id="countries"
                  tags={countries}
                  setTags={setCountries}
                  placeholder="Add country code and press Enter"
                  maxTags={20}
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
                
                {Object.keys(attributes).length > 0 ? (
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
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : isEditMode ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
