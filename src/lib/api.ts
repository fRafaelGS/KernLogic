import axios from 'axios';

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors (e.g., 401 unauthorized, 403 forbidden)
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Redirect to login or refresh token
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
); 