import { useQuery } from '@tanstack/react-query'
import { getImportFieldSchema } from '@/services/importService'

export const useImportFieldSchema = () =>
  useQuery({
    queryKey: ['import-field-schema'],
    queryFn: async () => (await getImportFieldSchema()).data,
    staleTime: 1000 * 60 * 30, // 30 min
  }) 