import { useQuery } from '@tanstack/react-query'
import { 
  getImportFieldSchema, 
  getAttributeGroupSchemaFields, 
  getAttributeSchemaFields, 
  getFamilySchemaFields,
  getFamilyAttributes,
  ImportFieldSchemaEntry
} from '@/domains/imports/services/importService'

// Combined hook to fetch all schema types at once
export const useImportFieldSchema = () => {
  const productSchemaQuery = useQuery({
    queryKey: ['import-field-schema', 2], // Always use v2 schema
    queryFn: async () => (await getImportFieldSchema(2)).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

  const attributeGroupSchemaQuery = useQuery({
    queryKey: ['attribute-group-schema'],
    queryFn: async () => (await getAttributeGroupSchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

  const attributeSchemaQuery = useQuery({
    queryKey: ['attribute-schema'],
    queryFn: async () => (await getAttributeSchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

  const familySchemaQuery = useQuery({
    queryKey: ['family-schema'],
    queryFn: async () => (await getFamilySchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

  return {
    // Extract fields from the product schema response (v2 format)
    productFieldSchema: productSchemaQuery.data?.fields ?? null,
    attributeHeaderPattern: productSchemaQuery.data?.attribute_header_pattern ?? null,
    // Other schema fields
    attributeGroupSchema: attributeGroupSchemaQuery.data ?? null,
    attributeSchema: attributeSchemaQuery.data ?? null,
    familySchema: familySchemaQuery.data ?? null,
    // Loading states
    isLoading: 
      productSchemaQuery.isLoading || 
      attributeGroupSchemaQuery.isLoading || 
      attributeSchemaQuery.isLoading || 
      familySchemaQuery.isLoading,
    // Error states
    isError:
      productSchemaQuery.isError || 
      attributeGroupSchemaQuery.isError || 
      attributeSchemaQuery.isError || 
      familySchemaQuery.isError
  }
}

export const useAttributeGroupSchema = () =>
  useQuery({
    queryKey: ['attribute-group-schema'],
    queryFn: async () => (await getAttributeGroupSchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

export const useAttributeSchema = () =>
  useQuery({
    queryKey: ['attribute-schema'],
    queryFn: async () => (await getAttributeSchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

export const useFamilySchema = () =>
  useQuery({
    queryKey: ['family-schema'],
    queryFn: async () => (await getFamilySchemaFields()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  })

export const useFamilyAttributes = (familyCode: string | null) =>
  useQuery({
    queryKey: ['family-attributes', familyCode],
    queryFn: async () => {
      if (!familyCode) return { data: [] };
      return await getFamilyAttributes(familyCode);
    },
    enabled: !!familyCode, // Only run query when familyCode is provided
    staleTime: 1000 * 60 * 10, // 10 min
  }) 