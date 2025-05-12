import axiosInstance from '@/lib/axiosInstance'
import { PriceFormValues } from '@/components/products/PricingForm'

export interface RawPrice {
  id: number
  priceType: string
  channel: string
  currencyCode: string
  value: number
}

export interface PriceResponse {
  data?: RawPrice[]
  results?: RawPrice[]
}

export default {
  getPrices(productId: number) {
    return axiosInstance.get<PriceResponse>(`/api/products/${productId}/prices/`)
  },
  createPrice(productId: number, payload: PriceFormValues) {
    return axiosInstance.post(`/api/products/${productId}/prices/`, payload)
  },
  updatePrice(productId: number, priceId: number, payload: PriceFormValues) {
    return axiosInstance.put(`/api/products/${productId}/prices/${priceId}/`, payload)
  },
  deletePrice(productId: number, priceId: number) {
    return axiosInstance.delete(`/api/products/${productId}/prices/${priceId}/`)
  },
} 