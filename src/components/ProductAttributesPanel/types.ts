export interface Attribute {
  id: string
  group: string
  name: string
  type: string
  locale: string
  channel: string
  value: string | null
  product: number
  attribute_label?: string
  attribute_code?: string
  attribute_type?: string
}

export interface AttributesResponse {
  attributes: Attribute[]
}

export interface UpdateAttributePayload {
  value: string | null
}

export interface AttributeGroup {
  id: number
  name: string
  items: { attribute: number }[]
} 