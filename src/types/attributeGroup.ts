import type { Attribute } from './attribute.ts'

export interface AttributeGroup {
  id: number
  name: string
  description?: string
  organization?: number
  created_by?: number
  created_at?: string
  updated_at?: string
  attributes?: Attribute[]
  order?: number
}

export interface AttributeGroupItem {
  id: number
  attribute_group: number
  attribute: number
  order?: number
} 