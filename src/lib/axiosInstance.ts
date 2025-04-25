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

// Interceptor to handle token refresh on 401 errors
axiosInstance.interceptors.response.use(
    (response) => response, // Pass through successful responses
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
            console.log('[Response Interceptor] Received 401, attempting token refresh...');
            originalRequest._retry = true; // Mark to prevent infinite refresh loops

            // Check if this is a dashboard endpoint - if so, just pass the error
            // This prevents logout loops when dashboard endpoints are unauthorized
            const url = originalRequest.url || '';
            if (url.includes('/dashboard/')) {
                console.log('[Response Interceptor] Dashboard endpoint unauthorized:', url);
                // Don't attempt token refresh for dashboard endpoints to prevent logout loops
                return Promise.reject(error);
            }

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    console.error('[Refresh] No refresh token found.');
                    throw new Error('No refresh token available');
                }

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
                
                // Only clear tokens and redirect for non-dashboard requests
                if (!originalRequest.url?.includes('/dashboard/')) {
                    // Clear tokens and redirect to login on refresh failure
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    // Use a more robust way to navigate if possible, but window.location is a fallback
                    window.location.href = '/login?sessionExpired=true';
                }
                return Promise.reject(refreshError); // Reject the promise to prevent original request from proceeding
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