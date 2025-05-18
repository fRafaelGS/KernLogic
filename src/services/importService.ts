import axiosInstance from '@/lib/axiosInstance';

export interface ImportTask {
  id: number;
  status: string;
  status_display?: string;
  processed: number;
  total_rows: number | null;
  row_count?: number;
  progress_percentage?: number;
  error_file?: string;
  error_file_url?: string;
  error_count?: number;
  execution_time?: number;
  created_at: string;
}

export interface ImportFieldSchemaEntry {
  id: string;
  label: string;
  required: boolean;
  type: string;
}

export interface FieldSchemaResponse {
  fields: ImportFieldSchemaEntry[];
  attribute_header_pattern?: string;
}

export type DuplicateStrategy = 'skip' | 'overwrite' | 'abort';

export interface ImportOptions {
  overwrite_policy?: DuplicateStrategy;
}

export const createImport = (
  file: File, 
  mapping: Record<string, string>, 
  options: ImportOptions = { overwrite_policy: 'overwrite' }
) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  fd.append("duplicate_strategy", options.overwrite_policy || 'overwrite');
  return axiosInstance.post<ImportTask>("/api/imports/", fd);
};

export const createAttributeGroupImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>("/api/attribute-groups-import/", fd);
};

export const createAttributeImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>("/api/attributes-import/", fd);
};

export const createFamilyImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>("/api/families-import/", fd);
};

export const getImport = (id: number) => axiosInstance.get<ImportTask>(`/api/imports/${id}/`);

export const getImportFieldSchema = (version?: number) => {
  const url = version === 2 
    ? "/api/imports/field-schema/?v=2"
    : "/api/imports/field-schema/";
  return axiosInstance.get<FieldSchemaResponse>(url);
};

export const getAttributeGroupSchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>("/api/imports/attribute-groups-schema/");

export const getAttributeSchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>("/api/imports/attributes-schema/");

export const getFamilySchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>("/api/imports/families-schema/");

export const getFamilyAttributes = (familyCode: string) => 
  axiosInstance.get(`/api/families/${familyCode}/attributes/`); 