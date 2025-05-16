import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'

export interface IncompleteProductRaw {
  id: number
  name: string
  sku: string
  completeness: number
  missing_fields: { field: string; weight: number }[]
}

export interface IncompleteProduct {
  id: number
  name: string
  sku: string
  completeness: number
  missingCount: number  // missing_fields.length
  missing_fields: { field: string; weight: number }[]
}

const fetchTopIncompleteProducts = async (): Promise<IncompleteProduct[]> => {
  const { data } = await axiosInstance.get<IncompleteProductRaw[]>('/api/dashboard/incomplete-products')
  
  // Transform the raw data to include missingCount
  return data.map(product => ({
    ...product,
    missingCount: product.missing_fields.length
  }))
}

export function useTopIncompleteProducts() {
  return useQuery<IncompleteProduct[], Error>({
    queryKey: ['dashboard', 'incomplete-products'],
    queryFn: fetchTopIncompleteProducts,
    staleTime: 60_000,
    retry: 1
  })
} 