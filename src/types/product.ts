import { AttributeGroup } from '@/types/attributeGroup.ts'
import { Family, FamilyOverride } from '@/types/family'

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  stock?: number;
  is_active: boolean;
  is_archived?: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  primary_asset?: number;
  completeness_percent?: number;
  missing_fields?: string[];
  organization?: number;
  family?: Family | null;
  family_overrides?: FamilyOverride[];
  effective_attribute_groups?: AttributeGroup[];
  category?: any;
  brand?: string;
  barcode?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  dataCompleteness?: DataCompleteness;
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