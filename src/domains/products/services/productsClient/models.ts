/**
 * Product models generated from OpenAPI specification
 */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  prices: ProductPrice[];
  category: string;
  brand: string | null;
  barcode: string | null;
  tags: string[];
  attribute_values: AttributeValue[];
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  completeness_percent: number;
  missing_fields: string[];
  assets: ProductAsset[];
  primary_asset: ProductAsset | null;
  organization: number | null;
  created_by: string;
  family: number | null;
  family_overrides: ProductFamilyOverride[];
  effective_attribute_groups: AttributeGroup[];
}

export interface ProductRequest {
  name: string;
  sku: string;
  description?: string | null;
  category_id?: number | null;
  brand?: string | null;
  barcode?: string | null;
  tags?: string[];
  is_active?: boolean;
  is_archived?: boolean;
  family?: number | null;
}

export interface ProductPrice {
  id: number;
  price_type: string;
  price_type_display: string;
  label: string;
  channel: SalesChannel;
  currency: string;
  amount: string;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesChannel {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ProductAsset {
  id: number;
  file: string;
  file_url: string;
  asset_type: string;
  name: string | null;
  order: number;
  is_primary: boolean;
  content_type: string | null;
  file_size: number;
  file_size_formatted: string;
  uploaded_by: number | null;
  uploaded_by_name: string;
  uploaded_at: string;
  product: number;
  tags: string[];
}

export interface AttributeValue {
  id: number;
  locale_code: string | null;
  channel: string | null;
  value: any;
  organization: number;
  product: number;
  attribute: number;
  locale: number | null;
  created_by: number | null;
}

export interface AttributeValueDetail extends AttributeValue {
  attribute_code: string;
  attribute_label: string;
  attribute_type: string;
}

export interface ProductFamilyOverride {
  id: number;
  attribute_group: number;
  removed: boolean;
}

export interface AttributeGroup {
  id: number;
  name: string;
  order: number;
  items: AttributeGroupItem[];
}

export interface AttributeGroupItem {
  id: number;
  attribute: number;
  order: number;
}

export interface Attribute {
  id: number;
  options: string;
  code: string;
  label: string;
  data_type: string;
  is_localisable: boolean;
  is_scopable: boolean;
  organization: number;
  created_by: number | null;
}

export interface ProductListParams {
  ordering?: string;
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  family?: string;
  channel?: string;
  is_active?: boolean;
}

export interface ProductEvent {
  id: number;
  event_type: string;
  summary: string;
  payload: any | null;
  created_at: string;
  created_by_name: string;
}

export interface PaginatedProductEventList extends PaginatedResponse<ProductEvent> {}

export interface PaginatedProductList extends PaginatedResponse<Product> {} 