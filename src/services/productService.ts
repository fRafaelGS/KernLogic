    import axios, { AxiosError, AxiosProgressEvent } from 'axios';
    import { API_URL } from '@/config';
    import axiosInstance from '@/lib/axiosInstance';

    // PRODUCTS_PATH should be empty string to work with the backend URL structure
    // The backend routes 'api/' to products.urls which registers the viewset at ''
    const PRODUCTS_PATH = '/api/products'; // Add /api prefix since API_URL is now empty

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

    // Helper function to check for HTML responses
    const isHtmlResponse = (data: any): boolean => {
    if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE html>')) {
        console.error('HTML response detected instead of JSON data');
        // This could trigger a re-login if needed
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?sessionExpired=true';
        }
        return true;
    }
    return false;
    };

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
        attributes?: Record<string, string> | ProductAttribute[];
        
        // Assets
        assets?: ProductAsset[];
    }

    export const PRODUCTS_API_URL = `/api/products`;

    export interface ProductAttribute {
        id: number;
        name: string;
        value?: string;
        group?: string;
        locale?: string;
        updated_at?: string;
        isMandatory?: boolean;
        // Properties for attribute group structure
        order?: number;
        items?: any[];
        // Properties for attribute items
        attribute?: number;
        attribute_label?: string;
        attribute_code?: string;
        attribute_type?: string;
        channel?: string;
        value_id?: number;
    }

    export interface ProductAsset {
        id: number;
        name: string;
        type: string;
        asset_type?: string; // Added for compatibility with backend responses
        url: string;
        size: string;
        resolution?: string;
        uploaded_by: string;
        uploaded_at: string;
        is_primary?: boolean;
        is_archived?: boolean;
        parent_asset_id?: number;
        version?: string;
        order?: number;
        archived?: boolean;
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

    // Type for explicit product relations
    export interface ProductRelation {
    id: number;
    product_id: number;
    related_product_id: number;
    relationship_type: RelationshipType;
    is_pinned: boolean;
    created_at: string;
    created_by?: string;
    source: 'manual' | 'algorithm';
    notes?: string;
    }

    export type RelationshipType = 'accessory' | 'variant' | 'frequently_bought_together' | 'replacement' | 'similar' | 'general';

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

    export interface ProductEvent {
        id: number;
        event_type: string;
        summary: string;
        payload: Record<string, any>;
        created_at: string;        // ISO
        created_by_name: string;
    }

    export interface PaginatedResponse<T> {
        count: number;
        next: string | null;
        previous: string | null;
        results: T[];
    }

    export const productService = {
        // Get all products with optional pagination support
        getProducts: async (
            filters: Record<string, any> = {},
            fetchAll: boolean = true,
            includeAssets: boolean = true
        ): Promise<Product[] | PaginatedResponse<Product>> => {
            /* ------------------------------------------------------------------ *
             * 1️⃣ build the first-page URL with page & page_size if provided
             * ------------------------------------------------------------------ */
            const qs = new URLSearchParams();
            if (filters.page)       qs.append('page',       String(filters.page));
            if (filters.page_size)  qs.append('page_size',  String(filters.page_size));
            if (filters.search)     qs.append('search',     String(filters.search));

            let nextPageUrl: string | null =
              qs.toString().length
                ? `${PRODUCTS_PATH}/?${qs.toString()}`
                : `${PRODUCTS_PATH}/`;

            console.log('[getProducts] first request →', nextPageUrl);

            let allProducts: Product[] = [];
            
            try {
                /* ------------------------------------------------------------------ *
                 * 2️⃣ fetch one page (or all pages if fetchAll=true)
                 * ------------------------------------------------------------------ */
                while (nextPageUrl && (fetchAll || allProducts.length === 0)) {
                    console.log(`[getProducts] GET ${nextPageUrl}`);
                    const response = await axiosInstance.get(nextPageUrl);
                    
                    console.log(`[productService.getProducts] Response from: ${nextPageUrl}`, response.data);
                    
                    // Check for HTML response
                    if (isHtmlResponse(response.data)) {
                        console.error('[productService.getProducts] Received HTML response instead of JSON');
                        return allProducts;
                    }
                    
                    // Handle DRF browsable API response format
                    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                        // If it contains a "products" URL property instead of actual data
                        if (response.data.products && allProducts.length === 0) {
                            console.log('[productService.getProducts] Detected API root, fetching actual products list...');
                            // Make a second request to get the actual products list
                            const productsResponse = await axiosInstance.get(response.data.products);
                            
                            // Handle paginated response from second request
                            if (productsResponse.data && 'results' in productsResponse.data) {
                                if (!fetchAll) {
                                    // For single page request, return paginated response
                                    return productsResponse.data;
                                }
                                allProducts = [...allProducts, ...productsResponse.data.results];
                                nextPageUrl = productsResponse.data.next;
                                continue;
                            } else if (Array.isArray(productsResponse.data)) {
                                // If it's an array, we have all products
                                return productsResponse.data;
                            } else {
                                console.error('[productService.getProducts] Unexpected response format from products URL');
                                return allProducts;
                            }
                        }
                        
                        // Handle paginated response format
                        if ('results' in response.data) {
                            console.log('[productService.getProducts] Detected paginated response, processing results');
                            
                            // For single page requests, return the full paginated response with count, next, etc.
                            if (!fetchAll) {
                                return response.data;
                            }
                            
                            // For fetch all, accumulate results
                            allProducts = [...allProducts, ...response.data.results];
                            nextPageUrl = response.data.next;
                            continue;
                        }
                    }
                    
                    // If we get an array directly, return it
                    if (Array.isArray(response.data)) {
                        return response.data;
                    }
                    
                    // Break the loop if we've processed this page but couldn't determine the next page
                    break;
                }
                
                console.log(`[productService.getProducts] Total products fetched: ${allProducts.length}`);
                
                // Enrich with assets only when the caller asks for it
                if (includeAssets) {
                    console.log('[productService.getProducts] Including assets for products');
                    for (const product of allProducts) {
                        try {
                            if (!product.id) continue;
                            const assets = await productService.getProductAssets(product.id);
                            product.assets = assets;
                            
                            // Find primary image or first image for thumbnails
                            if (!product.primary_image_thumb && Array.isArray(assets) && assets.length > 0) {
                                const primaryAsset = 
                                    assets.find(a => 
                                        a.is_primary && 
                                        ((a.type || a.asset_type) || '').toLowerCase().includes('image')
                                    ) || 
                                    assets.find(a => 
                                        ((a.type || a.asset_type) || '').toLowerCase().includes('image')
                                    );
                                
                                if (primaryAsset?.url) {
                                    // Build images array for consistency
                                    const images = assets
                                        .filter(a => 
                                            ((a.type || a.asset_type) || '')
                                            .toLowerCase()
                                            .includes('image')
                                        )
                                        .map((a, idx) => ({
                                            id: typeof a.id === 'string' ? parseInt(a.id, 10) : Number(a.id),
                                            url: a.url,
                                            order: idx,
                                            is_primary: a.id === primaryAsset.id,
                                        }));
                                    
                                    product.images = images;
                                    product.primary_image_thumb = primaryAsset.url;
                                    product.primary_image_large = primaryAsset.url;
                                }
                            }
                        } catch (assetErr) {
                            console.error(`[productService.getProducts] Error loading assets for product ${product.id}:`, assetErr);
                        }
                    }
                } else {
                    console.log('[productService.getProducts] Skipping assets loading (includeAssets=false)');
                }
                
                return allProducts;
            } catch (error) {
                console.error('Error fetching products:', error);
                // Type checking for AxiosError can still be useful
                if (axios.isAxiosError(error)) { 
                    console.error('Response status:', error.response?.status);
                    console.error('Response data:', error.response?.data);
                }
                return allProducts; // Return what we have so far instead of an empty array
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
                
                // Handle HTML response
                if (isHtmlResponse(response.data)) {
                    console.error('[getCategories] Received HTML response instead of JSON');
                    return [];
                }
                
                // Handle DRF browsable API response format
                if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                    // If it contains a "categories" URL property instead of actual data
                    if (response.data.categories) {
                        console.log('[getCategories] Detected API root, fetching actual categories list...');
                        // Make a second request to get the actual categories list
                        const categoriesResponse = await axiosInstance.get(response.data.categories);
                        
                        if (Array.isArray(categoriesResponse.data)) {
                            // Transform the response to Category objects
                            return categoriesResponse.data.map((categoryName: string) => ({
                                id: categoryName,
                                name: categoryName
                            }));
                        } else {
                            console.error('[getCategories] Unexpected response format from categories URL');
                            return [];
                        }
                    }
                    return [];
                }
                
                // The API returns an array of category names, we need to convert to objects
                if (Array.isArray(response.data)) {
                    return response.data.map((categoryName: string) => ({
                        id: categoryName,
                        name: categoryName
                    }));
                }
                
                console.error('[getCategories] Unexpected response format', response.data);
                return [];
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
                // Use more consistent URL path
                const url = `${PRODUCTS_API_URL}/${productId}/attributes/`;
                console.log(`[getProductAttributes] Fetching attributes from ${url}`);
                
                const response = await axiosInstance.get(url);
                
                // Check for HTML response (which would indicate an error)
                if (isHtmlResponse(response.data)) {
                    console.error('[getProductAttributes] Received HTML response instead of JSON');
                    return [];
                }
                
                // Handle different response formats
                let attributes: ProductAttribute[] = [];
                
                if (Array.isArray(response.data)) {
                    console.log(`[getProductAttributes] Successfully fetched ${response.data.length} attributes in array format`);
                    console.log(`[getProductAttributes] Attribute data structure for product ${productId}:`, JSON.stringify(response.data, null, 2));
                    attributes = response.data;
                } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
                    console.log(`[getProductAttributes] Successfully fetched ${response.data.results.length} attributes in paginated format`);
                    attributes = response.data.results;
                } else if (response.data && typeof response.data === 'object') {
                    // If response is an object with attribute data, transform it to an array
                    console.log(`[getProductAttributes] Received object format, converting to attributes array`);
                    attributes = Object.entries(response.data).map(([key, value]) => {
                        // Handle if value is a string
                        if (typeof value === 'string') {
                            return {
                                id: Math.random(), // Generate a unique ID
                                name: key,
                                value: value,
                                group: 'General',
                                locale: 'en',
                                updated_at: new Date().toISOString(),
                                isMandatory: false
                            } as ProductAttribute;
                        }
                        
                        // Handle if value is an object
                        const attrValue = value as any;
                        return {
                            id: attrValue.id || Math.random(),
                            name: attrValue.name || key,
                            value: attrValue.value || '',
                            group: attrValue.group || 'General',
                            locale: attrValue.locale || 'en',
                            updated_at: attrValue.updated_at || new Date().toISOString(),
                            isMandatory: !!attrValue.isMandatory
                        } as ProductAttribute;
                    });
                } else {
                    console.error('[getProductAttributes] Unexpected response format:', typeof response.data);
                    console.log('[getProductAttributes] Response data sample:', 
                        typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 100) : response.data);
                    
                    // Create some mock attributes for debugging if real ones aren't available
                    if (process.env.NODE_ENV === 'development') {
                        return [
                            {
                                id: 1,
                                name: 'Weight',
                                value: '2.5 kg',
                                group: 'Physical',
                                locale: 'en',
                                updated_at: new Date().toISOString(),
                                isMandatory: true
                            },
                            {
                                id: 2,
                                name: 'Color',
                                value: 'Red',
                                group: 'Appearance',
                                locale: 'en',
                                updated_at: new Date().toISOString(),
                                isMandatory: false
                            }
                        ];
                    }
                    return [];
                }
                
                // Do some basic validation of the attributes
                for (const attr of attributes) {
                    if (!attr.group) attr.group = 'General';
                    if (!attr.locale) attr.locale = 'en';
                    if (attr.isMandatory === undefined) attr.isMandatory = false;
                    if (!attr.updated_at) attr.updated_at = new Date().toISOString();
                }
                
                console.log(`[getProductAttributes] Processed ${attributes.length} attributes for product ${productId}`);
                return attributes;
            } catch (error) {
                console.error('[getProductAttributes] Error fetching product attributes:', error);
                // For development, return mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    return [
                        {
                            id: 1,
                            name: 'Width',
                            value: '30 cm',
                            group: 'Dimensions',
                            locale: 'en',
                            updated_at: new Date().toISOString(),
                            isMandatory: true
                        },
                        {
                            id: 2,
                            name: 'Material',
                            value: 'Aluminum',
                            group: 'Specifications',
                            locale: 'en',
                            updated_at: new Date().toISOString(),
                            isMandatory: false
                        }
                    ];
                }
                return [];
            }
        },

        // Get product attribute groups (NEW FUNCTION)
        getProductAttributeGroups: async (
            productId: number,
            locale: string = 'en_US',
            channel: string = 'ecommerce'
          ): Promise<ProductAttribute[]> => {
            try {
              /* 1. build { id: { label, code } } map */
              const { data: attrDefs } = await axiosInstance.get('/api/attributes/');
              const attrMap = Array.isArray(attrDefs)
                ? attrDefs.reduce<Record<number, { label: string; code: string }>>(
                    (acc, a: any) => {
                      acc[a.id] = { label: a.label, code: a.code };
                      return acc;
                    },
                    {}
                  )
                : {};
          
              /* 2. fetch groups for the product */
              const url = `${PRODUCTS_API_URL}/${productId}/attribute-groups/`;
              const { data } = await axiosInstance.get(url, { params: { locale, channel } });
          
              if (isHtmlResponse(data) || !Array.isArray(data)) return [];
          
              /* 3. inject missing label/code into each item */
              return data.map((g: any) => ({
                ...g,
                items: (g.items || []).map((it: any) => ({
                  ...it,
                  attribute_label: it.attribute_label ?? attrMap[it.attribute]?.label ?? '',
                  attribute_code:  it.attribute_code  ?? attrMap[it.attribute]?.code  ?? ''
                }))
              }));
            } catch (err) {
              console.error('[getProductAttributeGroups] Error:', err);
              return [];
            }
          },          

        // Get product assets
        getProductAssets: async (productId: number): Promise<ProductAsset[]> => {
            const url = `${PRODUCTS_API_URL}/${productId}/assets/`;
            console.log(`[getProductAssets] Fetching product assets from ${url}`);
            
            try {
                const response = await axiosInstance.get(url);
                
                if (isHtmlResponse(response.data)) {
                    console.error('[getProductAssets] Received HTML response instead of JSON');
                    return [];
                }
                
                // Handle different response formats
                let data: any[] = [];
                if (Array.isArray(response.data)) {
                    data = response.data;
                } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
                    data = response.data.results;
                } else {
                    console.error('[getProductAssets] Unexpected response format:', typeof response.data);
                    console.log('[getProductAssets] Response data sample:', 
                        typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 100) : response.data);
                    return [];
                }
                
                console.log(`[getProductAssets] Successfully fetched ${data.length} assets`);
                
                // Helper function to ensure URL is absolute
                const ensureAbsoluteUrl = (fileUrl: string) => {
                    if (!fileUrl) return '';
                    // If URL is already absolute, return as is
                    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                        return fileUrl;
                    }
                    // Otherwise prepend backend server URL
                    // For development, use http://localhost:8000
                    return `http://localhost:8000${fileUrl}`;
                };
                
                // Transform the data to match our expected format
                const assets = data.map((asset: any) => ({
                    id: asset.id,
                    name: asset.name || (asset.file ? asset.file.split('/').pop() : 'Unknown'),
                    type: asset.asset_type || asset.type || 'image',
                    asset_type: asset.asset_type || asset.type || 'image', // Add both fields for consistency
                    url: ensureAbsoluteUrl(asset.file || asset.url || ''),
                    size: asset.file_size || '0',  // Ensure size is always a string for consistent handling
                    uploaded_by: asset.uploaded_by_name || asset.uploaded_by || 'System',
                    uploaded_at: asset.uploaded_at || new Date().toISOString(),
                    is_primary: !!asset.is_primary, // Ensure boolean type
                    order: asset.order || 0,
                    archived: asset.archived || false
                }));
                
                // Save the fetched assets to localStorage for caching
                try {
                    localStorage.setItem(`product_assets_${productId}`, JSON.stringify(assets));
                } catch (cacheError) {
                    console.error('[getProductAssets] Error caching assets to localStorage:', cacheError);
                }
                
                return assets;
            } catch (error) {
                console.error('[getProductAssets] Error fetching product assets:', error);
                
                // Try to get cached assets from localStorage if API fails
                try {
                    const cachedAssetsJSON = localStorage.getItem(`product_assets_${productId}`);
                    if (cachedAssetsJSON) {
                        const cachedAssets = JSON.parse(cachedAssetsJSON);
                        console.log(`[getProductAssets] Using ${cachedAssets.length} cached assets from localStorage`);
                        return cachedAssets;
                    }
                } catch (cacheError) {
                    console.error('[getProductAssets] Error reading from localStorage:', cacheError);
                }
                
                return [];
            }
        },

        // Get product activity log
        getProductActivities: async (productId: number): Promise<ProductActivity[]> => {
            try {
                const url = `/api/products/${productId}/activities/`;
                console.log('[getProductActivities] Requesting activities from URL:', url);
                
                const response = await axiosInstance.get(url);
                
                // Check if response is HTML first
                if (typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE')) {
                    console.error("[getProductActivities] Received HTML response instead of JSON. Try using a different endpoint.");
                    return [];
                }
                
                // Check if response is an array
                if (!Array.isArray(response.data)) {
                    console.error("[getProductActivities] Invalid response format for product activities:", 
                        typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE') 
                            ? "HTML response received instead of JSON" 
                            : response.data
                    );
                    return [];
                }
                
                return response.data;
            } catch (error) {
                console.error('Error fetching product activities:', error);
                return [];
            }
        },

        // Get product versions
        getProductVersions: async (productId: number): Promise<ProductVersion[]> => {
            try {
                const url = `/api/products/${productId}/versions/`;
                console.log('[getProductVersions] Requesting versions from URL:', url);
                
                const response = await axiosInstance.get(url);
                
                // Check if response is HTML first
                if (typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE')) {
                    console.error("[getProductVersions] Received HTML response instead of JSON. Try using a different endpoint.");
                    return [];
                }
                
                // Check if response is an array
                if (!Array.isArray(response.data)) {
                    console.error("[getProductVersions] Invalid response format for product versions:", 
                        typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE') 
                            ? "HTML response received instead of JSON" 
                            : response.data
                    );
                    return [];
                }
                
                return response.data;
            } catch (error) {
                console.error('Error fetching product versions:', error);
                return [];
            }
        },

        // Get product price history
        getPriceHistory: async (productId: number): Promise<PriceHistory[]> => {
            try {
                const url = `/api/products/${productId}/price-history/`;
                console.log('[getPriceHistory] Requesting price history from URL:', url);
                
                const response = await axiosInstance.get(url);
                
                // Check if response is HTML first
                if (typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE')) {
                    console.error("[getPriceHistory] Received HTML response instead of JSON. Try using a different endpoint.");
                    return [];
                }
                
                // Check if response is an array
                if (!Array.isArray(response.data)) {
                    console.error("[getPriceHistory] Invalid response format for price history:", 
                        typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE') 
                            ? "HTML response received instead of JSON" 
                            : response.data
                    );
                    return [];
                }
                
                return response.data;
            } catch (error) {
                console.error('Error fetching price history:', error);
                return [];
            }
        },

        // Get related products
        getRelatedProducts: async (productId: number): Promise<Product[]> => {
            try {
                const url = `${PRODUCTS_API_URL}/${productId}/related-list/`;
                
                const response = await axiosInstance.get(url);
                
                // Simple validation - if it's not an array, log error and return empty array
                if (!Array.isArray(response.data)) {
                    console.error("Invalid response format for related products:", response.data);
                    return [];
                }
                
                return response.data;
            } catch (error) {
                console.error('Error fetching related products:', error);
                return [];
            }
        },

        // Add or update related product relationship
        toggleRelatedProduct: async (
            productId: number, 
            relatedProductId: number, 
            isPinned: boolean,
            relationshipType: RelationshipType = 'general',
            notes: string = ''
        ): Promise<boolean> => {
            try {
                const url = `${PRODUCTS_API_URL}/${productId}/related-add/`;
                
                const response = await axiosInstance.post(url, {
                    related_product_id: relatedProductId,
                    is_pinned: isPinned,
                    relationship_type: relationshipType,
                    notes: notes
                });
                
                return true;
            } catch (error) {
                // If it's already related and we're trying to update the status,
                // we should use PATCH instead
                if (axios.isAxiosError(error) && 
                    error.response?.status === 400 && 
                    error.response.data?.error?.includes('already exists')) {
                    
                    try {
                        // Try updating the existing relationship
                        const updateUrl = `${PRODUCTS_API_URL}/${productId}/related/${relatedProductId}/`;
                        await axiosInstance.patch(updateUrl, { 
                            is_pinned: isPinned,
                            relationship_type: relationshipType,
                            notes: notes
                        });
                        return true;
                    } catch (updateError) {
                        console.error('Error updating related product:', updateError);
                        return false;
                    }
                }
                
                console.error('Error adding related product:', error);
                return false;
            }
        },

        // Remove related product
        removeRelatedProduct: async (productId: number, relatedProductId: number): Promise<boolean> => {
            if (!productId || !relatedProductId) {
                console.error('Invalid product IDs for removing relation');
                return false;
            }
            
            try {
                // Keep the original "related" path since the backend still uses this URL pattern for DELETE
                const url = `${PRODUCTS_API_URL}/${productId}/related/${relatedProductId}/`;
                await axiosInstance.delete(url);
                return true;
            } catch (error) {
                console.error('Error removing related product:', error);
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

        // Get explicit product relations
        getExplicitRelations: async (productId: number): Promise<ProductRelation[]> => {
            try {
                const url = `${PRODUCTS_API_URL}/${productId}/explicit-relations/`;
                const response = await axiosInstance.get(url);
                return response.data;
            } catch (error) {
                console.error('Error fetching explicit relations:', error);
                return [];
            }
        },

        // Update relationship type and notes
        updateRelationship: async (
            productId: number, 
            relatedProductId: number, 
            updates: {
                relationship_type?: RelationshipType;
                notes?: string;
                is_pinned?: boolean;
            }
        ): Promise<boolean> => {
            try {
                const url = `${PRODUCTS_API_URL}/${productId}/related/${relatedProductId}/`;
                // Include product and related_product fields to match backend serializer expectations
                await axiosInstance.patch(url, { 
                    ...updates,
                    product: productId,
                    related_product: relatedProductId
                });
                return true;
            } catch (error) {
                console.error('Error updating relationship:', error);
                return false;
            }
        },
        
        // Add multiple products as related
        addMultipleRelatedProducts: async (
            productId: number,
            relatedIds: number[],
            relationship_type: RelationshipType = 'general',
            notes: string = ''
        ): Promise<{
            success: boolean;
            processed: number;
            failed: number;
        }> => {
            if (!productId || !relatedIds.length) {
                return { success: false, processed: 0, failed: 0 };
            }
            
            try {
                // Instead of using the bulk endpoint, we'll use individual requests
                // to the working endpoint we already have
                let processed = 0;
                let failed = 0;
                
                // Process each related product ID one by one
                for (const relatedId of relatedIds) {
                    try {
                        // Add the relationship with the proper relationship type in a single call
                        const success = await productService.toggleRelatedProduct(
                            productId,
                            relatedId,
                            false, // Not pinned by default
                            relationship_type, // Pass relationship type
                            notes // Pass notes
                        );
                        
                        if (success) {
                            processed++;
                        } else {
                            failed++;
                        }
                    } catch (err) {
                        console.error(`Error adding related product ${relatedId}:`, err);
                        failed++;
                    }
                }
                
                return {
                    success: processed > 0,
                    processed,
                    failed
                };
            } catch (error) {
                console.error('Error adding multiple related products:', error);
                return { success: false, processed: 0, failed: relatedIds.length };
            }
        },

        // Upload asset (image) for a product
        uploadAsset: async (
            productId: number,
            file: File,
            onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
        ): Promise<ProductAsset> => {
            const url = `${PRODUCTS_API_URL}/${productId}/assets/`;
            console.log(`[uploadAsset] Uploading asset to ${url}`, { fileName: file.name, fileType: file.type, fileSize: file.size });
            
            // Create FormData object for multipart upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);  // Add name explicitly to match backend expectation

            /* ------------------------------------------------------------------ *
             * infer a short asset_type label; keep it ≤20 chars (serializer limit)
             * ------------------------------------------------------------------ */
            const mime = file.type.toLowerCase();
            let assetType: string = 'other';
            if (mime.startsWith('image/'))                assetType = 'image';
            else if (mime.includes('pdf'))                assetType = 'pdf';
            else if (mime.match(/(xlsx|xls|csv|spreadsheet|excel)/)) assetType = 'spreadsheet';
            else if (mime.match(/(doc|docx|text|word)/))  assetType = 'document';

            formData.append('asset_type', assetType);
            console.log(`[uploadAsset] Determined asset_type: ${assetType} for file type: ${mime}`);
            
            try {
                // Let Axios set the correct boundary in the Content-Type header automatically
                const response = await axiosInstance.post(url, formData, { 
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress 
                });
                
                if (response.status !== 201 && response.status !== 200) {
                    throw new Error(`Unexpected response status: ${response.status}`);
                }
                
                const data = response.data;
                console.log('[uploadAsset] Successful upload response:', data);
                
                // Ensure URL is absolute
                let fileUrl = data.file || '';
                if (fileUrl && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                    fileUrl = `http://localhost:8000${fileUrl}`;
                }
                
                return {
                    id: data.id,
                    name: data.name || file.name,
                    type: data.asset_type || assetType,
                    url: fileUrl,
                    size: data.file_size || file.size.toString(),
                    uploaded_by: data.uploaded_by_name || 'You',
                    uploaded_at: data.uploaded_at || new Date().toISOString(),
                    is_primary: data.is_primary || false,
                    order: data.order || 0
                };
            } catch (error) {
                console.error('[uploadAsset] Error uploading file:', error);
                
                // Enhanced error handling with specific messages
                if (axios.isAxiosError(error)) {
                    const response = error.response;
                    
                    // Log detailed error information
                    console.error('[uploadAsset] Error response:', {
                        status: response?.status,
                        statusText: response?.statusText,
                        data: response?.data
                    });

                    // Handle specific error cases
                    if (response?.status === 400) {
                        const errorMsg = typeof response.data === 'object' 
                            ? (response.data.file || response.data.error || JSON.stringify(response.data))
                            : 'Invalid file format';
                        throw new Error(`Upload failed: ${errorMsg}`);
                    }
                    else if (response?.status === 413) {
                        throw new Error('File too large: The server rejected this file due to its size');
                    }
                    else if (response?.status === 415) {
                        throw new Error('Unsupported file type');
                    }
                    else if (response?.status === 401 || response?.status === 403) {
                        // Authentication/authorization issue
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        throw new Error('Authentication error: Please log in again');
                    }
                    // Detect HTML response instead of JSON (often means server error page)
                    else if (response?.data && typeof response.data === 'string' && 
                             response.data.includes('<!DOCTYPE html>')) {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        throw new Error('Invalid server response: Session may have expired');
                    }
                }
                // Re-throw the error after logging
                throw error;
            }
        },

        // Delete an asset
        deleteAsset: async (productId: number, assetId: number): Promise<void> => {
            const url = `${PRODUCTS_API_URL}/${productId}/assets/${assetId}/`;
            console.log('[deleteAsset] Deleting asset at:', url);
            
            try {
                await axiosInstance.delete(url);
            } catch (error) {
                console.error('Error deleting asset:', error);
                throw error;
            }
        },

        // Set an asset as primary
        setAssetPrimary: async (productId: number, assetId: number): Promise<boolean> => {
            try {
                console.log(`[setAssetPrimary] Setting asset ${assetId} as primary for product ${productId}`);
                
                // First get the asset details to get its URL
                const assetUrl = `${PRODUCTS_API_URL}/${productId}/assets/${assetId}/`;
                const assetResponse = await axiosInstance.get(assetUrl);
                const asset = assetResponse.data;
                
                if (!asset) {
                    console.error('[setAssetPrimary] Asset not found');
                    return false;
                }
                
                // Get the image URL from the asset
                const imageUrl = asset.file || asset.url;
                if (!imageUrl) {
                    console.error('[setAssetPrimary] Asset has no URL');
                    return false;
                }
                
                console.log(`[setAssetPrimary] Using image URL: ${imageUrl}`);
                
                // Update all assets to set this one as primary
                try {
                    // 1. Get all assets for this product
                    const allAssetsResponse = await axiosInstance.get(`${PRODUCTS_API_URL}/${productId}/assets/`);
                    let allAssets = allAssetsResponse.data;
                    
                    // Handle both array and paginated response formats
                    if (allAssets && allAssets.results) {
                        allAssets = allAssets.results;
                    }
                    
                    if (!Array.isArray(allAssets)) {
                        console.error('[setAssetPrimary] Unexpected assets response format', allAssets);
                        allAssets = [];
                    }
                    
                    console.log(`[setAssetPrimary] Found ${allAssets.length} assets for product ${productId}`);
                    
                    // 2. Update each asset's is_primary status
                    let updatedCount = 0;
                    for (const assetItem of allAssets) {
                        if (assetItem.id === assetId) {
                            // This is the one we want to make primary
                            if (!assetItem.is_primary) {
                                console.log(`[setAssetPrimary] Setting asset ${assetId} to primary=true`);
                                await axiosInstance.patch(
                                    `${PRODUCTS_API_URL}/${productId}/assets/${assetItem.id}/`, 
                                    { is_primary: true }
                                );
                                updatedCount++;
                            }
                        } else if (assetItem.is_primary) {
                            // Set any other primary assets to non-primary
                            console.log(`[setAssetPrimary] Setting asset ${assetItem.id} to primary=false`);
                            await axiosInstance.patch(
                                `${PRODUCTS_API_URL}/${productId}/assets/${assetItem.id}/`, 
                                { is_primary: false }
                            );
                            updatedCount++;
                        }
                    }
                    
                    console.log(`[setAssetPrimary] Updated ${updatedCount} assets' primary status`);
                    
                    // Clear the cached assets to force a refresh from server next time
                    localStorage.removeItem(`product_assets_${productId}`);
                    
                } catch (assetUpdateError) {
                    console.error('[setAssetPrimary] Error updating asset primary status:', assetUpdateError);
                    // Continue anyway to update the product
                }
                
                // 3. Update the product's primary_image fields directly
                try {
                    await productService.updateProduct(productId, {
                        primary_image_thumb: imageUrl,
                        primary_image_large: imageUrl
                    });
                    console.log(`[setAssetPrimary] Updated product ${productId} with primary image: ${imageUrl}`);
                    return true;
                } catch (productUpdateError) {
                    console.error('[setAssetPrimary] Error updating product with primary image:', productUpdateError);
                    return false;
                }
                
            } catch (error) {
                console.error('[setAssetPrimary] Error setting asset as primary:', error);
                return false;
            }
        },

        getAttributeSet,
        getAttributeValues,
        updateAttributeValue,
        createAttributeValue,
        logAttributeActivity,
        createAttribute,

        getProductHistory: async (
            productId: number,
            page = 1,
            pageSize = 20
        ): Promise<PaginatedResponse<ProductEvent>> => {
            try {
                const res = await axiosInstance.get(
                    `${PRODUCTS_API_URL}/${productId}/history/`,
                    { params: { page, page_size: pageSize } }
                );
                
                // Handle different response formats
                const data = res.data;
                
                // If response is empty array or object
                if (
                    (Array.isArray(data) && data.length === 0) || 
                    (typeof data === 'object' && Object.keys(data).length === 0)
                ) {
                    console.log('Empty history response, returning formatted empty data');
                    return {
                        count: 0,
                        next: null,
                        previous: null,
                        results: []
                    };
                }
                
                // If response is array but not paginated (backend didn't format properly)
                if (Array.isArray(data) && !('results' in data)) {
                    console.log('Non-paginated array response, formatting to paginated structure');
                    return {
                        count: data.length,
                        next: null,
                        previous: null,
                        results: data
                    };
                }
                
                // Normal paginated response
                if (data && typeof data === 'object' && 'results' in data) {
                    return data;
                }
                
                // Fallback for unexpected formats
                console.warn('Unexpected response format from history API:', data);
                return {
                    count: 0,
                    next: null,
                    previous: null,
                    results: []
                };
            } catch (error) {
                console.error('Error fetching product history:', error);
                // Return empty paginated response on error
                return {
                    count: 0,
                    next: null,
                    previous: null,
                    results: []
                };
            }
        },

        // Bulk operation: Update status for multiple products
        bulkSetStatus: async (ids: number[], isActive: boolean): Promise<void> => {
            try {
                const url = `${PRODUCTS_API_URL}/bulk_update/`;
                await axiosInstance.post(url, { ids, field: 'is_active', value: isActive });
            } catch (error) {
                console.error('Error in bulk status update:', error);
                throw error;
            }
        },
        
        // Bulk operation: Delete multiple products
        bulkDelete: async (ids: number[]): Promise<void> => {
            try {
                const url = `${PRODUCTS_API_URL}/bulk_delete/`;
                await axiosInstance.post(url, { ids });
            } catch (error) {
                console.error('Error in bulk delete:', error);
                throw error;
            }
        },
        
        // Bulk operation: Assign category to multiple products
        bulkAssignCategory: async (ids: number[], category: string): Promise<void> => {
            try {
                const url = `${PRODUCTS_API_URL}/bulk_update/`;
                await axiosInstance.post(url, { ids, field: 'category', category });
            } catch (error) {
                console.error('Error in bulk category assignment:', error);
                throw error;
            }
        },
        
        // Alias for bulkAssignCategory for backward compatibility
        bulkUpdateCategory: async (ids: number[], category: string): Promise<void> => {
            return productService.bulkAssignCategory(ids, category);
        },
        
        // Bulk operation: Add tags to multiple products
        bulkAddTags: async (ids: number[], tags: string[]): Promise<void> => {
            try {
                const url = `${PRODUCTS_API_URL}/bulk_update/`;
                await axiosInstance.post(url, { ids, field: 'tags', tags });
            } catch (error) {
                console.error('Error in bulk tag addition:', error);
                throw error;
            }
        },
        
        // Get product suggestions for autocomplete
        suggestProducts: async (q: string): Promise<{ sku?: string; brand?: string; id?: number }[]> => {
            if (!q || q.length < 2) return [];
            
            try {
                const url = `${PRODUCTS_API_URL}/suggestions/`;
                const response = await axiosInstance.get(url, { params: { q } });
                
                // If backend not ready, provide a placeholder response
                // Replace with actual response parsing once backend is ready
                if (!response.data || !Array.isArray(response.data)) {
                    console.warn('Backend not ready or unexpected response format for suggestions');
                    
                    // Temporary placeholder with 1s delay for testing UI
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Return mock data for now
                    if (q.toLowerCase().includes('eax')) {
                        return [
                            { sku: 'D15332439', id: 1 },
                            { sku: 'D14691291', id: 2 },
                            { brand: 'Ecco' }
                        ];
                    }
                    return [];
                }
                
                return response.data;
            } catch (error) {
                console.error('Error getting product suggestions:', error);
                return [];
            }
        },
    }; 