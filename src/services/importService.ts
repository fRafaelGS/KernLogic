import axiosInstance from '@/lib/axiosInstance';
import { API_ENDPOINTS, config } from '@/config/config';

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
  options: ImportOptions = { overwrite_policy: config.imports.defaults.duplicateStrategy as DuplicateStrategy }
) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  fd.append("duplicate_strategy", options.overwrite_policy || config.imports.defaults.duplicateStrategy);
  return axiosInstance.post<ImportTask>(API_ENDPOINTS.imports.create, fd);
};

export const createAttributeGroupImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>(API_ENDPOINTS.imports.attributeGroups, fd);
};

export const createAttributeImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>(API_ENDPOINTS.imports.attributes, fd);
};

export const createFamilyImport = (file: File, mapping: Record<string, string>) => {
  if (!(file instanceof File)) {
    throw new Error('The file is not a real File object. Please re-select the file before uploading.');
  }
  const fd = new FormData();
  fd.append("csv_file", file, file.name);
  fd.append("mapping", JSON.stringify(mapping));
  return axiosInstance.post<ImportTask>(API_ENDPOINTS.imports.families, fd);
};

export const getImport = (id: number) => 
  axiosInstance.get<ImportTask>(API_ENDPOINTS.imports.details(id));

export const getImportFieldSchema = (version?: number) => {
  const url = version === 2 
    ? API_ENDPOINTS.imports.fieldSchemaV2
    : API_ENDPOINTS.imports.fieldSchema;
  return axiosInstance.get<FieldSchemaResponse>(url);
};

export const getAttributeGroupSchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>(API_ENDPOINTS.imports.attributeGroupsSchema);

export const getAttributeSchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>(API_ENDPOINTS.imports.attributesSchema);

export const getFamilySchemaFields = () => 
  axiosInstance.get<ImportFieldSchemaEntry[]>(API_ENDPOINTS.imports.familiesSchema);

export const getFamilyAttributes = (familyCode: string) => 
  axiosInstance.get(API_ENDPOINTS.imports.familyAttributes(familyCode)); 