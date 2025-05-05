export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: Category;
  brand?: Brand;
  tags?: Tag[];
  gtin?: string;
  price?: number;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  description?: string;
  dataCompleteness?: DataCompleteness;
  primaryImage?: Image;
  attributeGroups?: AttributeGroup[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Image {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface DataCompleteness {
  score: number;
  missingFields?: string[];
}

export interface AttributeGroup {
  id: string;
  name: string;
  attributes?: Attribute[];
}

export interface Attribute {
  id: string;
  name: string;
  value: string;
  unit?: string;
} 