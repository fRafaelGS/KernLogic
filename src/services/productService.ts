import axios from 'axios';
import { API_URL } from '@/config';

// Set up global Authorization header if token exists
const token = localStorage.getItem('access_token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Set global Authorization header from saved token');
}

// Configure axios to include credentials
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        console.log('Adding authorization header with token');
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.log('No token available for request');
    }
    console.log('Request URL:', config.url);
    console.log('Request headers:', config.headers);
    return config;
});

// Handle token refresh on 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }
                
                console.log('Attempting to refresh token...');
                
                // Use direct fetch API to bypass interceptors
                const refreshResponse = await fetch(`${API_URL}/auth/refresh/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        refresh: refreshToken
                    })
                });
                
                if (!refreshResponse.ok) {
                    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
                }
                
                const data = await refreshResponse.json();
                console.log('Token refresh successful');
                
                // Save the new token
                const newToken = data.access;
                localStorage.setItem('access_token', newToken);
                
                // Apply new token to global axios defaults
                axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                
                // Create a completely new request with the new token
                console.log('Creating new request with the fresh token');
                const newRequest = {
                    ...originalRequest,
                    headers: {
                        ...originalRequest.headers,
                        Authorization: `Bearer ${newToken}`
                    },
                    _retry: true
                };
                
                // Make the request directly with axios to bypass any interceptor issues
                return axios(newRequest);
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

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
}

export const productService = {
    // Get all products
    getProducts: async (): Promise<Product[]> => {
        console.log('Fetching products from API URL:', `${API_URL}/products/`);
        try {
            // Log token before request
            const token = localStorage.getItem('access_token');
            console.log('Current access token:', token ? `${token.substring(0, 15)}...` : 'none');
            
            const response = await api.get('/products/');
            console.log('Products API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            if (axios.isAxiosError(error)) {
                console.error('Response status:', error.response?.status);
                console.error('Response data:', error.response?.data);
            }
            throw error;
        }
    },

    // Get a single product
    getProduct: async (id: number): Promise<Product> => {
        const response = await api.get(`/products/${id}/`);
        return response.data;
    },

    // Create a new product
    createProduct: async (product: Omit<Product, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Product> => {
        console.log('Creating product:', product);
        try {
            // Ensure price and stock are numbers
            const formattedProduct = {
                ...product,
                price: Number(product.price),
                stock: Number(product.stock)
            };
            
            console.log('Formatted product data:', formattedProduct);
            const response = await api.post('/products/', formattedProduct);
            console.log('Create product response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },

    // Update a product
    updateProduct: async (id: number, product: Partial<Product>): Promise<Product> => {
        const response = await api.patch(`/products/${id}/`, product);
        return response.data;
    },

    // Delete a product
    deleteProduct: async (id: number): Promise<void> => {
        await api.delete(`/products/${id}/`);
    },

    // Get product categories
    getCategories: async (): Promise<string[]> => {
        const response = await api.get('/products/categories/');
        return response.data;
    },

    // Get product statistics
    getStats: async (): Promise<{
        total_products: number;
        total_value: number;
        low_stock: number;
    }> => {
        const response = await api.get('/products/stats/');
        return response.data;
    },
}; 