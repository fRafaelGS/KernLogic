import axiosInstance from '@/lib/axiosInstance';

export interface ImportTask {
  id: number;
  status: string;
  processed: number;
  total_rows: number | null;
  error_file?: string;
  created_at: string;
}

export interface ImportFieldSchemaEntry {
  id: string;
  label: string;
  required: boolean;
  type: string;
}

export const createImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>("/api/imports/", fd);
};

export const getImport = (id: number) => axiosInstance.get<ImportTask>(`/api/imports/${id}/`);

export const getImportFieldSchema = () => axiosInstance.get<ImportFieldSchemaEntry[]>("/api/field-schema/"); 