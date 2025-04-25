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

// Services
import { productService, Product } from '@/services/productService';
import { API_URL } from '@/config';
import { getCategories, createCategory } from "@/services/categoryService";

const PRODUCTS_BASE_URL = `${API_URL}/products`;

// Schema for product form validation
const productEditSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters' }),
  description: z.string().optional(),
  sku: z.string().min(2, { message: 'SKU must be at least 2 characters' }),
  price: z.preprocess(
    (a) => parseFloat(a as string),
    z.number().min(0, { message: 'Price must be a positive number' })
  ),
  stock: z.preprocess(
    (a) => parseInt(a as string, 10),
    z.number().min(0, { message: 'Stock must be a positive number' })
  ),
  category: z.string().min(1, { message: 'Please select a category' }),
  is_active: z.boolean(),
  // New fields
  brand: z.string().optional(),
  type: z.string().optional(),
  unit_of_measure: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  country_availability: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  primary_image: z.string().optional(),
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
          {/* Basic Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter SKU" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price *</FormLabel>
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

                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock *</FormLabel>
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit_of_measure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. kg, pcs" />
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
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter barcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
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

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <CreatableSelect
                  options={categories}
                  value={form.watch("category")}
                  onChange={(value) => form.setValue("category", value, { shouldValidate: true })}
                  onCreateOption={handleCreateCategory}
                  placeholder={categoriesLoading ? "Loading categories..." : "Select or create a category"}
                  disabled={isLoading || categoriesLoading}
                  className="w-full"
                />
                {form.formState.errors.category && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Tags
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle size={16} className="text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Press Enter to add a tag
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <TagInput
                        id="tags"
                        placeholder="Add tags..."
                        tags={field.value || []}
                        setTags={(newTags) => field.onChange(newTags)}
                        maxTags={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country_availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Country Availability
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle size={16} className="text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Enter country codes (e.g. US, CA)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <TagInput
                        id="countries"
                        placeholder="Add country codes..."
                        tags={field.value || []}
                        setTags={(newTags) => field.onChange(newTags)}
                        maxTags={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Product Image</FormLabel>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mb-3"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-h-40 rounded-md border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications Section */}
          <Collapsible
            open={attributesOpen}
            onOpenChange={setAttributesOpen}
            className="border rounded-md p-3"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full font-medium">
              <span>Technical Specifications</span>
              {attributesOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Attribute name"
                  value={newAttributeKey}
                  onChange={(e) => setNewAttributeKey(e.target.value)}
                />
                <Input
                  placeholder="Attribute value"
                  value={newAttributeValue}
                  onChange={(e) => setNewAttributeValue(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleAddAttribute}>
                  Add Attribute
                </Button>
              </div>
              
              {/* Display current attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                {Object.entries(attributes).map(([key, value]) => (
                  <Card key={key} className="p-1">
                    <CardContent className="flex justify-between items-center p-2">
                      <div>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttribute(key)}
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active status toggle */}
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

          {/* Form actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
