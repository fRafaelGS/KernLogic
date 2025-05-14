import { z } from 'zod'

// Family interfaces
export interface Family {
  id: number
  code: string
  label: string
  description: string
  created_by: number
  created_at: string
  updated_at: string
  attribute_groups: FamilyAttributeGroup[]
}

export interface FamilyAttributeGroup {
  id: number
  family: number
  attribute_group: number
  attribute_group_object?: {
    id: number
    name: string
    description?: string
  }
  required: boolean
  order: number
}

// Zod schemas
export const familyAttributeGroupSchema = z.object({
  id: z.number().optional(),
  family: z.number(),
  attribute_group: z.number(),
  attribute_group_object: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional()
  }).optional(),
  required: z.boolean(),
  order: z.number()
})

export const familySchema = z.object({
  id: z.number().optional(),
  code: z.string().min(1, 'Code is required'),
  label: z.string().min(1, 'Label is required'),
  description: z.string().optional(),
  created_by: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  attribute_groups: z.array(familyAttributeGroupSchema).optional()
})

export type FamilyInput = z.infer<typeof familySchema>
export type FamilyAttributeGroupInput = z.infer<typeof familyAttributeGroupSchema> 