import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/config';

// Create the single Axios instance
const axiosInstance = axios.create({
    baseURL: API_URL, // Base for all API calls (/api)
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor to add the Authorization token to requests
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            // Ensure proper format: "Bearer " + token
            const authHeader = token.startsWith('Bearer ') 
                ? token 
                : `Bearer ${token}`;
            config.headers.Authorization = authHeader;
            
            console.log('[Request Interceptor] Added token to request:', {
                url: config.url,
                method: config.method,
                authHeader: authHeader.substring(0, 20) + '...',
            });
        } else {
            console.log('[Request Interceptor] No token found for request:', config.url);
        }
        return config;
    },
    (error) => {
        console.error('[Request Interceptor Error]', error);
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
        console.error('[Response Interceptor] HTML response detected instead of JSON data');
        return true;
    }
    return false;
};

// Interceptor to handle token refresh on 401 errors
axiosInstance.interceptors.response.use(
    (response) => {
        // Check if response is HTML when expecting JSON
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html') || isHtmlResponse(response.data)) {
            console.error('[Response Interceptor] Received HTML instead of JSON:', {
                url: response.config.url,
                status: response.status,
            });
            
            // For GET requests, we'll return empty data instead of failing
            if (response.config.method?.toLowerCase() === 'get') {
                // Return empty array or object based on expected response type
                if (Array.isArray(response.data)) {
                    return { ...response, data: [] };
                } else {
                    return { ...response, data: {} };
                }
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

        // Check if there's an HTML response in the error (DRF browsable API)
        if (error.response && typeof error.response.data === 'string' && 
            isHtmlResponse(error.response.data)) {
            
            console.error('[Response Interceptor] HTML error response detected');
            
            // If this is a GET request, return empty data
            if (originalRequest.method?.toLowerCase() === 'get') {
                console.log('[Response Interceptor] Returning empty data for HTML response');
                return Promise.resolve({ 
                    ...error.response, 
                    data: originalRequest.url?.includes('categories') ? [] : {} 
                });
            }
        }

        // Check if it's a 401, not from a refresh attempt, and the request exists
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            console.log('[Response Interceptor] Received 401, attempting token refresh...');
            originalRequest._retry = true; // Mark to prevent infinite refresh loops

            // Check if refresh token exists
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                console.error('[Refresh] No refresh token found.');
                localStorage.removeItem('access_token');
                window.location.href = '/login?sessionExpired=true';
                return Promise.reject(new Error('No refresh token available'));
            }

            try {
                // Use fetch for refresh to bypass this interceptor
                const refreshUrl = `${API_URL}/auth/token/refresh/`; 
                console.log('[Refresh] Calling refresh URL:', refreshUrl);

                const refreshResponse = await fetch(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh: refreshToken }),
                });

                if (!refreshResponse.ok) {
                    const errorText = await refreshResponse.text();
                    console.error(`[Refresh] Failed: ${refreshResponse.status}`, errorText);
                    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
                }

                const data = await refreshResponse.json();
                const newToken = data.access;
                console.log('[Refresh] Success, received new access token.');

                // Store the new token
                localStorage.setItem('access_token', newToken);

                // Update the header of the original failed request
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }

                // Retry the original request with the new token
                console.log('[Refresh] Retrying original request to:', originalRequest.url);
                return axiosInstance(originalRequest);

            } catch (refreshError: any) {
                console.error('[Refresh] Error during token refresh:', refreshError.message);
                
                // Clear tokens and redirect to login on refresh failure
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                
                // Only redirect if we're not already on the login page to avoid loops
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?sessionExpired=true';
                }
                
                return Promise.reject(refreshError);
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

export default axiosInstance; 