import { AxiosResponse } from 'axios';
import axiosInstance from '@/lib/axiosInstance';
import { getApiUrl } from '@/config';

// Constants
export const IMPORTS_API_URL = getApiUrl('imports');

export interface ImportTask {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'partial_success' | 'success';
  file_name: string;
  created_at: string;
  processed: number;
  total_rows: number;
  errors?: Array<{ row: number; message: string }>;
}

export const createImport = (formData: FormData) => {
  return axiosInstance.post<ImportTask>(IMPORTS_API_URL, formData);
};

export const getImport = (id: number) => axiosInstance.get<ImportTask>(`${IMPORTS_API_URL}/${id}/`); 