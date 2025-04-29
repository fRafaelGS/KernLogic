import axiosInstance from '@/lib/axiosInstance';

export interface ImportTask {
  id: number;
  status: string;
  processed: number;
  total_rows: number | null;
  error_file?: string;
  created_at: string;
}

export const createImport = (file: File, mapping: Record<string, string>) => {
  const fd = new FormData();
  fd.append("csv_file", file);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>("/api/imports/", fd);
};

export const getImport = (id: number) => axiosInstance.get<ImportTask>(`/api/imports/${id}/`); 