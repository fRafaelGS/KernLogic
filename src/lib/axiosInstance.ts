import axios, { AxiosError, InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { API_URL } from '@/config/config';

// Make sure the API URL doesn't end with /api to prevent double paths
const baseURL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

// Create the single Axios instance
const axiosInstance = axios.create({
    baseURL: baseURL,
    withCredentials: false, // Changed to false since we're using JWT in headers
    headers: {
        'Accept': 'application/json'
    }
});

// Interceptor to add the Authorization token to requests
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Ensure headers object exists
        if (!config.headers) {
            config.headers = {} as AxiosRequestHeaders;
        }
        
        // Always set Accept header
        config.headers['Accept'] = 'application/json';
        
        // Set auth token if available
        const token = localStorage.getItem('access_token');
        if (token) {
            // Ensure proper format: "Bearer " + token
            const authHeader = token.startsWith('Bearer ') 
                ? token 
                : `Bearer ${token}`;
            config.headers.Authorization = authHeader;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper function to check for HTML responses (DRF browsable API)
const isHtmlResponse = (data: any): boolean => {
    if (typeof data === 'string' && (
        data.trim().startsWith('<!DOCTYPE html>') || 
        data.trim().startsWith('<html>') ||
        data.includes('<head>') && data.includes('<body>')
    )) {
        return true;
    }
    return false;
};

// Interceptor to handle token refresh on 401 errors
axiosInstance.interceptors.response.use(
    (response) => {
        // Check if response is HTML when expecting JSON
        if (response.headers['content-type']?.includes('text/html') || isHtmlResponse(response.data)) {
            // For GET requests, we'll return empty data instead of failing
            if (response.config.method?.toLowerCase() === 'get') {
                return { ...response, data: response.config.url?.includes('categories') ? [] : {} };
            }
        }
        return response;
    }, 
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log all error responses in detail
        console.error('[Axios Error]', {
            status: error.response?.status,
            url: originalRequest?.url,
            method: originalRequest?.method,
            headers: originalRequest?.headers,
            errorMessage: error.message,
            responseData: error.response?.data,
        });

        // Check if it's a 401, not from a refresh attempt, and the request exists
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true; // Mark to prevent infinite refresh loops

            // Create refresh promise if it doesn't exist
            if (!window.tokenRefreshPromise) {
                window.tokenRefreshPromise = (async () => {
                    try {
                        // Check if refresh token exists
                        const refreshToken = localStorage.getItem('refresh_token');
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }
                        
                        // Use fetch for refresh to bypass this interceptor
                        const refreshUrl = `${baseURL}/token/refresh/`; 

                        const refreshResponse = await fetch(refreshUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ refresh: refreshToken }),
                        });

                        if (!refreshResponse.ok) {
                            const errorText = await refreshResponse.text();
                            throw new Error(`Token refresh failed: ${refreshResponse.status}`);
                        }

                        const data = await refreshResponse.json();
                        const newToken = data.access;

                        // Store the new token
                        localStorage.setItem('access_token', newToken);
                        
                        // Update axios default headers for future requests
                        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                        
                        return newToken;
                    } catch (refreshError: any) {
                        // Clear tokens on refresh failure
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        
                        // Only redirect if we're not already on the login page to avoid loops
                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login?sessionExpired=true';
                        }
                        
                        throw refreshError;
                    } finally {
                        // Clear the promise regardless of outcome
                        window.tokenRefreshPromise = null;
                    }
                })();
            }
            
            try {
                // Wait for the refresh token process to complete
                const newToken = await window.tokenRefreshPromise;
                
                // Update the header of the original failed request
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }

                // Retry the original request with the new token
                return axiosInstance(originalRequest);
            } catch (error) {
                return Promise.reject(error);
            }
        } else if (error.response?.status === 500) {
            // Better handling for server errors
            console.error('[Server Error] 500 response:', error.response?.data);
            // You could show a user-friendly toast message here
        }

        // For errors other than 401 or if retry failed, just reject
        return Promise.reject(error);
    }
);

// Add TypeScript declaration for the window object
declare global {
    interface Window {
        tokenRefreshPromise: Promise<string> | null;
    }
}

// Initialize the tokenRefreshPromise property
window.tokenRefreshPromise = null;

export default axiosInstance; 