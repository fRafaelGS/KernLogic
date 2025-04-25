import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_URL } from '@/config';

// Create axios instance for auth API calls
const authAxios: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User type matching the one in AuthContext
export interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  name: string;
  password_confirm: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

// Register a new user
export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<AuthResponse> = await authAxios.post<AuthResponse>('/auth/register/', credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.error || 
        JSON.stringify(error.response.data) || 
        'Registration failed'
      );
    }
    throw new Error('Registration failed. Please try again later.');
  }
};

// Login a user
export const login = async (credentials: AuthCredentials): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<AuthResponse> = await authAxios.post<AuthResponse>('/auth/login/', credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Handle specific error messages from the backend
      if (error.response.data.error) {
        throw new Error(error.response.data.error);
      } else if (error.response.data.email) {
        throw new Error(error.response.data.email);
      } else if (error.response.data.password) {
        throw new Error(error.response.data.password);
      } else if (error.response.data.non_field_errors) {
        throw new Error(error.response.data.non_field_errors);
      }
      throw new Error(JSON.stringify(error.response.data) || 'Login failed');
    }
    throw new Error('Login failed. Please try again later.');
  }
};

// Logout a user
export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await authAxios.post('/auth/logout/', { refresh: refreshToken });
  } catch (error) {
    console.error('Logout error:', error);
    // We don't throw here since we want to clear local storage anyway
  }
};

// Get current user details
export const getCurrentUser = async (): Promise<User> => {
  const token = localStorage.getItem('access_token');
  const response: AxiosResponse<User> = await authAxios.get('/auth/user/', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Refresh the access token
export const refreshToken = async (refreshToken: string): Promise<{ access: string }> => {
  const response: AxiosResponse<{ access: string }> = await authAxios.post('/auth/token/refresh/', { refresh: refreshToken });
  return response.data;
}; 