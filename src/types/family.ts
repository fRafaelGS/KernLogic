import { z } from 'zod'
import { AttributeGroup } from '@/types/attributeGroup'

// Family interfaces
export interface Family {
  id: number
  code: string
  label: string
  description?: string
  created_at?: string
  updated_at?: string
  organization?: number
  created_by?: number
  attribute_groups?: FamilyAttributeGroup[]
}

export interface FamilyInput {
  code: string
  label: string
  description?: string
  attribute_groups?: Partial<FamilyAttributeGroup>[]
}

export interface FamilyAttributeGroup {
  id?: number
  family?: number
  attribute_group: number
  attribute_group_object?: AttributeGroup
  required: boolean
  order: number
}

export interface FamilyOverride {
  id?: number
  attribute_group: number
  removed: boolean
}

// Zod schemas
export const familyAttributeGroupSchema = z.object({
  attribute_group: z.number(),
  required: z.boolean().default(false),
  order: z.number().default(0)
})

export const familySchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .max(64, 'Code must be at most 64 characters')
    .regex(/^[a-zA-Z0-9-]+$/, {
      message: 'Code must contain only letters, numbers, and hyphens'
    }),
  label: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  description: z.string().optional(),
  attribute_groups: z.array(familyAttributeGroupSchema).optional()
})

// Export FamilyFormSchema type
export type FamilyFormValues = z.infer<typeof familySchema> 