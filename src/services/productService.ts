import axios, { AxiosError } from 'axios';
import { API_URL } from '@/config';
import axiosInstance from '@/lib/axiosInstance';

// PRODUCTS_PATH should be empty string to work with the backend URL structure
// The backend routes 'api/' to products.urls which registers the viewset at ''
const PRODUCTS_PATH = '/api'; // Add /api prefix since API_URL is now empty

// Define core fields that should trigger activity logging when changed
const CORE_FIELDS = [
  'sku', 
  'name', 
  'category', 
  'brand', 
  'tags', 
  'barcode', // GTIN
  'price', 
  'is_active'
];

// REMOVE global header setting - interceptor handles this
// const token = localStorage.getItem('access_token');
// if (token) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//     console.log('Set global Authorization header from saved token');
// }

// REMOVE local Axios instance creation and interceptors - use shared instance
// const api = axios.create({
//     baseURL: BASE,
//     headers: {
//         'Content-Type': 'application/json',
//     },
//     withCredentials: true,
// });
// ... REMOVE INTERCEPTORS ...

export interface ProductImage {
  id: number;
  url: string;
  order: number; // For reordering
  is_primary: boolean; // To identify the main image
}

export interface Product {
    id?: number;
    name: string;
    description: string;
    sku: string;
    price: number;
    stock: number; // Add stock property
    category: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    images?: ProductImage[] | null; // Add images array (optional)
    // NEW fields for thumbnail display
    primary_image_thumb?: string;  // 64px webp/jpg 
    primary_image_large?: string;  // 600-800px original
    
    // Additional Product Information (Optional)
    brand?: string;
    tags?: string[];
    barcode?: string;
    
    // Technical Specifications (Optional)
    attributes?: Record<string, string>;
}

export const PRODUCTS_API_URL = `/api/products`;

export interface ProductAttribute {
    id: number;
    name: string;
    value: string;
    group: string;
    locale: string;
    updated_at: string;
    isMandatory: boolean;
}

export interface ProductAsset {
    id: number;
    name: string;
    type: string;
    url: string;
    size: string;
    resolution?: string;
    uploaded_by: string;
    uploaded_at: string;
}

export interface ProductActivity {
    id: number;
    type: string;
    user: string;
    timestamp: string;
    details: string;
}

export interface ProductVersion {
    id: number;
    version: string;
    timestamp: string;
    user: string;
    summary: string;
}

export interface PriceHistory {
    date: string;
    oldPrice: string;
    newPrice: string;
    user: string;
}

// Fetch available attributes for an attribute set (by setId)
const getAttributeSet = async (setId: number) => {
  // Example endpoint: /api/attribute-sets/:setId/
  const url = `/api/attribute-sets/${setId}/`;
  const response = await axiosInstance.get(url);
  // Should return { setId, attributes: [...] }
  return response.data;
};

// Fetch all attribute values for a product
const getAttributeValues = async (productId: number) => {
  // Example endpoint: /api/products/:id/attributes/
  const url = `${PRODUCTS_API_URL}/${productId}/attributes/`;
  const response = await axiosInstance.get(url);
  return response.data;
};

// Update or add an attribute value for a product
const updateAttributeValue = async (
  productId: number,
  attributeId: number,
  payload: { value: any; locale: string }
) => {
  // PATCH or POST to /api/products/:id/attributes/:attributeId/
  const url = `${PRODUCTS_API_URL}/${productId}/attributes/${attributeId}/`;
  // Use PATCH for update, POST for add (here we use PATCH for both for idempotency)
  const response = await axiosInstance.patch(url, payload);
  return response.data;
};

// Create a new attribute value for a product
const createAttributeValue = async (
  productId: number,
  attributeId: number,
  payload: { value: any; locale: string }
) => {
  // POST to /api/products/:id/attributes/:attributeId/
  const url = `${PRODUCTS_API_URL}/${productId}/attributes/${attributeId}/`;
  const response = await axiosInstance.post(url, payload);
  return response.data;
};

// Log attribute activity (optional, if backend supports)
const logAttributeActivity = async (payload: {
  action: string;
  userId: number | string | undefined;
  productId: number;
  attributeId: number;
}) => {
  // Example endpoint: /api/attribute-activities/
  const url = `/api/attribute-activities/`;
  await axiosInstance.post(url, payload);
};

// Create a new attribute in an attribute set
const createAttribute = async (
  attributeSetId: number,
  attributeData: {
    name: string;
    groupId?: number;
    groupName: string;
    dataType: string;
    unit?: string;
    isMandatory: boolean;
    options?: Array<{ value: string; label: string }>;
    validationRule?: string;
  }
) => {
  const url = `/api/attribute-sets/${attributeSetId}/attributes/`;
  const response = await axiosInstance.post(url, attributeData);
  return response.data;
};

// Add Category type definition here if not already present globally
interface Category {
  id: number | string;
  name: string;
  // Add other category fields if they exist
}

// Add type for category options used by react-select
interface CategoryOption {
  label: string;
  value: number | string;
}

export const productService = {
    // Get all products
    getProducts: async (filters?: Record<string, any>): Promise<Product[]> => {
        let url = `${PRODUCTS_PATH}/`;
        console.log('Fetching products from:', url); 
        
        // Add query parameters if provided
        if (filters) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value.toString());
                }
            });
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        
        try {
            const token = localStorage.getItem('access_token');
            console.log('Current access token (from productService):', token ? `${token.substring(0, 15)}...` : 'none');
            
            const response = await axiosInstance.get(url); 
            // --- DEBUG LOGS --- 
            console.log('[productService.getProducts] Raw API response data:', response.data); 
            console.log('[productService.getProducts] Is response.data an array?:', Array.isArray(response.data)); 
            // --- END DEBUG LOGS ---
            console.log('Products API response:', response.data); // Original log
            
            // Handle paginated response format
            if (response.data && typeof response.data === 'object' && 'results' in response.data) {
                console.log('[productService.getProducts] Detected paginated response, returning results array');
                return response.data.results;
            }
            
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            // Type checking for AxiosError can still be useful
            if (axios.isAxiosError(error)) { 
                console.error('Response status:', error.response?.status);
                console.error('Response data:', error.response?.data);
            }
            throw error;
        }
    },

    // Get a single product
    getProduct: async (id: number): Promise<Product> => {
        const url = `${PRODUCTS_PATH}/${id}/`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Create a new product
    createProduct: async (product: Omit<Product, 'id' | 'created_by' | 'created_at' | 'updated_at'> | FormData): Promise<Product> => {
        const url = `${PRODUCTS_PATH}/`;
        console.log('Creating product at:', url);
        try {
            // Handle FormData or regular object
            if (product instanceof FormData) {
                console.log('Product data is FormData, preparing to send...');
                
                // Debug: Log FormData contents
                console.log('FormData contents:');
                for (const pair of product.entries()) {
                    console.log(`${pair[0]}: ${pair[1]}`);
                }
                
                // Get auth token for debugging
                const token = localStorage.getItem('access_token');
                console.log('Using auth token (first 15 chars):', token ? token.substring(0, 15) + '...' : 'none');
                
                const response = await axiosInstance.post(url, product, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                console.log('Create product response:', response.data);
                return response.data;
            } else {
                // Regular object handling (existing code)
                console.log('Product data is regular object, converting to proper format...');
                const formattedProduct = {
                    ...product,
                    price: Number(product.price)
                };
                console.log('Formatted product data:', formattedProduct);
                const response = await axiosInstance.post(url, formattedProduct);
                console.log('Create product response:', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error creating product:', error);
            
            // More detailed error logging
            if (axios.isAxiosError(error)) {
                console.error('Request config:', error.config);
                console.error('Response status:', error.response?.status);
                console.error('Response headers:', error.response?.headers);
                console.error('Response data:', error.response?.data);
                
                // Check if it's an authentication error
                if (error.response?.status === 401) {
                    console.error('Authentication error - token may be invalid or expired');
                    // You might want to trigger a re-login here
                }
            }
            
            throw error;
        }
    },

    // Update a product
    updateProduct: async (id: number, product: Partial<Product> | FormData): Promise<Product> => {
        const url = `${PRODUCTS_PATH}/${id}/`;
        
        // For regular objects, check if core fields are being modified
        if (!(product instanceof FormData)) {
          const hasCoreFieldChanges = Object.keys(product).some(key => CORE_FIELDS.includes(key));
          
          // If core fields are changed, we'll need to add activity tracking
          if (hasCoreFieldChanges) {
            // Add a flag to tell the backend to log this as a PRODUCT_CORE_EDIT activity
            // This is handled by the backend to create an activity log entry
            const productWithFlag = {
              ...product,
              _activity_type: 'PRODUCT_CORE_EDIT'
            };
            
            const response = await axiosInstance.patch(url, productWithFlag);
            return response.data;
          }
        }
        
        if (product instanceof FormData) {
          // For FormData, we need to set the correct Content-Type
          // Check if we're updating core fields
          const hasCoreFieldUpdate = Array.from(product.keys()).some(key => CORE_FIELDS.includes(key as string));
          
          if (hasCoreFieldUpdate) {
            // Add activity flag
            product.append('_activity_type', 'PRODUCT_CORE_EDIT');
          }
          
          const response = await axiosInstance.patch(url, product, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
          });
          return response.data;
        }
        
        // For regular objects with no core field changes
        const response = await axiosInstance.patch(url, product);
        return response.data;
    },

    // Delete a product
    deleteProduct: async (id: number): Promise<void> => {
        const url = `${PRODUCTS_PATH}/${id}/`;
        await axiosInstance.delete(url);
    },

    // Get all categories (Updated to use real API data)
    getCategories: async (): Promise<Category[]> => {
        console.log('Fetching categories from API...');
        try {
            const response = await axiosInstance.get(`${PRODUCTS_PATH}/categories/`);
            // Transform the response to match the expected format
            // The API returns an array of category names, we need to convert to objects
            return response.data.map((categoryName: string) => ({
                id: categoryName,
                name: categoryName
            }));
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Return empty array as fallback
            return [];
        }
    },

    // Search categories (Updated to use real API data)
    searchCategories: async (inputValue: string): Promise<CategoryOption[]> => {
        console.log(`Searching categories for: "${inputValue}"`);
        try {
            // Fetch all categories from the API
            const response = await axiosInstance.get(`${PRODUCTS_PATH}/categories/`);
            // Filter categories based on input value
            const filteredCategories = response.data
                .filter((categoryName: string) => 
                    categoryName.toLowerCase().includes(inputValue.toLowerCase()))
                .map((categoryName: string) => ({
                    label: categoryName,
                    value: categoryName
                }));
            return filteredCategories;
        } catch (error) {
            console.error('Error searching categories:', error);
            return []; // Return empty array as fallback
        }
    },

    // Create a new category (Updated to use real API)
    createCategory: async (data: { name: string }): Promise<Category> => {
        console.log('Creating category:', data);
        try {
            const response = await axiosInstance.post(`${PRODUCTS_PATH}/categories/`, {
                category: data.name
            });
            // The API returns { id: number, category: string }
            return {
                id: response.data.category, // Use the category name as the ID
                name: response.data.category
            };
        } catch (error) {
            console.error('Error creating category:', error);
            throw error; // Propagate error to be handled by the caller
        }
    },

    // Search tags - Updated to use real API
    searchTags: async (inputValue: string): Promise<{ label: string; value: string }[]> => {
        console.log(`Searching tags for: "${inputValue}"`);
        try {
            // Call API endpoint for tags
            const response = await axiosInstance.get(`${PRODUCTS_PATH}/tags/`, {
                params: { search: inputValue }
            });
            
            // Transform the response to the expected format for react-select
            // The API should return an array of tag names or objects
            const tags = response.data;
            
            if (Array.isArray(tags)) {
                // If API returns array of strings (tag names)
                if (typeof tags[0] === 'string') {
                    return tags.map(tagName => ({ 
                        label: tagName, 
                        value: tagName 
                    }));
                } 
                // If API returns array of objects with id and name props
                else if (tags[0] && typeof tags[0] === 'object') {
                    return tags.map((tag: any) => ({ 
                        label: tag.name, 
                        value: tag.id || tag.name 
                    }));
                }
            }
            
            // Fallback to empty array if response format is unexpected
            return [];
        } catch (error) {
            console.error('Error searching tags:', error);
            // Return empty array as fallback
            return [];
        }
    },

    // Create a new tag - Updated to use real API
    createTag: async (data: { name: string }): Promise<{ id: string; name: string }> => {
        console.log('Creating tag:', data);
        try {
            // Call API to create tag
            const response = await axiosInstance.post(`${PRODUCTS_PATH}/tags/`, data);
            
            // Return the created tag - format depends on backend response
            if (response.data.id) {
                return {
                    id: response.data.id,
                    name: response.data.name
                };
            } else {
                // If the API returns just the tag name
                return {
                    id: response.data,  // Use the returned value as ID
                    name: data.name
                };
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            throw error; // Propagate error to be handled by the caller
        }
    },

    // Get product statistics
    getStats: async (): Promise<{
        total_products: number;
        total_value: number;
    }> => {
        const url = `${PRODUCTS_PATH}/stats/`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Get product attributes
    getProductAttributes: async (productId: number): Promise<ProductAttribute[]> => {
        try {
            const url = `${PRODUCTS_PATH}/${productId}/attributes/`;
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching product attributes:', error);
            // Fall back to default attributes if API fails
            return [];
        }
    },

    // Get product assets
    getProductAssets: async (productId: number): Promise<ProductAsset[]> => {
        try {
            const url = `${PRODUCTS_PATH}/${productId}/assets/`;
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching product assets:', error);
            return [];
        }
    },

    // Get product activity log
    getProductActivities: async (productId: number): Promise<ProductActivity[]> => {
        try {
            const url = `${PRODUCTS_PATH}/${productId}/activities/`;
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching product activities:', error);
            return [];
        }
    },

    // Get product versions
    getProductVersions: async (productId: number): Promise<ProductVersion[]> => {
        try {
            const url = `${PRODUCTS_PATH}/${productId}/versions/`;
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching product versions:', error);
            return [];
        }
    },

    // Get product price history
    getPriceHistory: async (productId: number): Promise<PriceHistory[]> => {
        try {
            const url = `${PRODUCTS_PATH}/${productId}/price-history/`;
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching price history:', error);
            return [];
        }
    },

    // Get related products
    getRelatedProducts: async (productId: number): Promise<Product[]> => {
        try {
            const url = `${PRODUCTS_PATH}/products/${productId}/related/`;
            console.log(`Fetching related products from: ${url}`);
            
            const response = await axiosInstance.get(url);
            
            // Handle HTML responses - backends often return HTML for 404 or when endpoints aren't implemented yet
            if (typeof response.data === 'string' && (
                response.data.includes('<!DOCTYPE html>') || 
                response.data.includes('<html') ||
                response.data.trim().startsWith('<')
            )) {
                console.error('Received HTML instead of JSON for related products');
                // Return mock data for development
                return [
                    // Empty array for now - could add mock data if needed
                ];
            }
            
            // Add array check
            if (!Array.isArray(response.data)) {
                console.error("Related products response was not an array", response.data);
                return [];
            }
            
            // Add formatting for pinned items as suggested
            return response.data.map(p => ({ 
                ...p, 
                isPinned: p.tags?.includes("pinned") 
            }));
        } catch (error) {
            console.error('Error fetching related products:', error);
            return [];
        }
    },

    // Toggle related product (pin/unpin)
    toggleRelatedProduct: async (productId: number, relatedProductId: number, isPinned: boolean): Promise<boolean> => {
        try {
            // This would normally call an API endpoint like:
            // const url = `${PRODUCTS_PATH}/products/${productId}/related/${relatedProductId}/`;
            // const response = await axiosInstance.patch(url, { isPinned });
            
            // Since the backend endpoint might not exist yet, we'll mock success
            console.log(`Toggling related product ${relatedProductId} for product ${productId} to isPinned=${isPinned}`);
            
            // Simulate API call success
            await new Promise(resolve => setTimeout(resolve, 300));
            
            return true;
        } catch (error) {
            console.error('Error toggling related product:', error);
            return false;
        }
    },

    // Search products with debouncing support
    searchProducts: async (query: string, limit: number = 10): Promise<Product[]> => {
        if (!query || query.length < 2) {
            return [];
        }
        
        try {
            // Use the existing products endpoint with search parameter
            const url = `${PRODUCTS_PATH}/?search=${encodeURIComponent(query)}&limit=${limit}`;
            const response = await axiosInstance.get(url);
            
            // Handle paginated response format
            if (response.data && typeof response.data === 'object' && 'results' in response.data) {
                return response.data.results;
            }
            
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    },

    getAttributeSet,
    getAttributeValues,
    updateAttributeValue,
    createAttributeValue,
    logAttributeActivity,
    createAttribute,
}; 