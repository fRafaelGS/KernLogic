import axios, { AxiosError } from 'axios';
import { API_URL } from '@/config';
import axiosInstance from '@/lib/axiosInstance';

// PRODUCTS_PATH should be empty string to work with the backend URL structure
// The backend routes 'api/' to products.urls which registers the viewset at ''
const PRODUCTS_PATH = ''; 

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
    stock: number;
    category: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    images?: ProductImage[] | null; // Add images array (optional)
}

export const productService = {
    // Get all products - Use axiosInstance and adjust path
    getProducts: async (): Promise<Product[]> => {
        const url = `${PRODUCTS_PATH}/`;
        console.log('Fetching products from:', url); 
        try {
            const token = localStorage.getItem('access_token');
            console.log('Current access token (from productService):', token ? `${token.substring(0, 15)}...` : 'none');
            
            const response = await axiosInstance.get(url); 
            // --- DEBUG LOGS --- 
            console.log('[productService.getProducts] Raw API response data:', response.data); 
            console.log('[productService.getProducts] Is response.data an array?:', Array.isArray(response.data)); 
            // --- END DEBUG LOGS ---
            console.log('Products API response:', response.data); // Original log
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
    createProduct: async (product: Omit<Product, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Product> => {
        const url = `${PRODUCTS_PATH}/`;
        console.log('Creating product at:', url);
        try {
            const formattedProduct = {
                ...product,
                price: Number(product.price),
                stock: Number(product.stock)
            };
            console.log('Formatted product data:', formattedProduct);
            const response = await axiosInstance.post(url, formattedProduct);
            console.log('Create product response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },

    // Update a product
    updateProduct: async (id: number, product: Partial<Product>): Promise<Product> => {
        const url = `${PRODUCTS_PATH}/${id}/`;
        const response = await axiosInstance.patch(url, product);
        return response.data;
    },

    // Delete a product
    deleteProduct: async (id: number): Promise<void> => {
        const url = `${PRODUCTS_PATH}/${id}/`;
        await axiosInstance.delete(url);
    },

    // Get product categories
    getCategories: async (): Promise<string[]> => {
        const url = `${PRODUCTS_PATH}/categories/`;
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Get product statistics
    getStats: async (): Promise<{
        total_products: number;
        total_value: number;
        low_stock: number;
    }> => {
        const url = `${PRODUCTS_PATH}/stats/`;
        const response = await axiosInstance.get(url);
        return response.data;
    },
}; 