export interface Attribute {
  id: number
  code: string
  label: string
  data_type: string
  description?: string
  organization?: number
  created_by?: number
  created_at?: string
  updated_at?: string
  options?: AttributeOption[]
  is_required?: boolean
  default_value?: string
  unit?: string
}

export interface AttributeOption {
  id: number
  attribute: number
  value: string
  label: string
  order?: number
} 