import { useState, useEffect, useMemo } from 'react'
import { usePriceMetadata } from '@/hooks/usePriceMetadata'

// Define interfaces for metadata objects
export interface PriceType {
  id: string
  name: string
}

export interface SalesChannel {
  id: string
  name: string
}

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
}

export interface Price {
  id: number
  priceType: string
  channel: string
  currencyCode: string
  value: number
  formattedValue: string
}

interface PriceSummary {
  min: number | null
  max: number | null
  avg: number | null
  total: number
}

interface PriceFilters {
  search: string
  currency: string
  channel: string
}

export function usePricingData(productId: number) {
  const metadataHook = usePriceMetadata()
  
  // Adapt metadata to our expected shape
  const priceTypes: PriceType[] = useMemo(() => {
    return (metadataHook.priceTypes || []).map((pt: any) => ({
      id: pt.id || pt.value || '',
      name: pt.name || pt.label || '',
    }))
  }, [metadataHook.priceTypes])
  
  const channels: SalesChannel[] = useMemo(() => {
    return (metadataHook.channels || []).map((ch: any) => ({
      id: ch.id || ch.value || '',
      name: ch.name || ch.label || '',
    }))
  }, [metadataHook.channels])
  
  const currencies: Currency[] = useMemo(() => {
    return (metadataHook.currencies || []).map((cur: any) => ({
      id: cur.id || cur.value || cur.code || '',
      code: cur.code || cur.value || '',
      name: cur.name || cur.label || '',
      symbol: cur.symbol || '',
    }))
  }, [metadataHook.currencies])
  
  const [prices, setPrices] = useState<Price[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PriceFilters>({
    search: '',
    currency: 'all',
    channel: 'all'
  })

  // Function to fetch prices
  const fetchPrices = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Mock implementation - replace with actual API call
      // const response = await productService.getProductPrices(productId)
      
      // Simulate API response with mock data
      const mockPrices: Price[] = [
        {
          id: 1,
          priceType: 'retail',
          channel: 'online',
          currencyCode: 'USD',
          value: 19.99,
          formattedValue: '$19.99'
        },
        {
          id: 2,
          priceType: 'wholesale',
          channel: 'store',
          currencyCode: 'USD',
          value: 15.99,
          formattedValue: '$15.99'
        },
        {
          id: 3,
          priceType: 'msrp',
          channel: 'online',
          currencyCode: 'EUR',
          value: 18.99,
          formattedValue: '€18.99'
        }
      ]
      
      // Simulate API delay
      setTimeout(() => {
        setPrices(mockPrices)
        setIsLoading(false)
      }, 800)
    } catch (err) {
      setError('Failed to load prices')
      console.error(err)
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchPrices()
  }, [productId])

  // Filter prices based on current filters
  const filteredPrices = useMemo(() => {
    return prices.filter(price => {
      const matchesSearch = !filters.search || 
        price.priceType.toLowerCase().includes(filters.search.toLowerCase()) ||
        price.formattedValue.includes(filters.search)
      
      const matchesCurrency = filters.currency === 'all' || price.currencyCode === filters.currency
      const matchesChannel = filters.channel === 'all' || price.channel === filters.channel
      
      return matchesSearch && matchesCurrency && matchesChannel
    })
  }, [prices, filters])

  // Calculate summary statistics
  const summary = useMemo<PriceSummary>(() => {
    if (filteredPrices.length === 0) {
      return { min: null, max: null, avg: null, total: 0 }
    }
    
    const values = filteredPrices.map(p => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    
    return {
      min,
      max,
      avg,
      total: filteredPrices.length
    }
  }, [filteredPrices])

  // Get price type label
  const getPriceTypeLabel = (value: string): string => {
    const priceType = priceTypes.find(pt => pt.id === value)
    return priceType ? priceType.name : value
  }

  // Format price for display
  const formatPrice = (value: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(value)
  }

  return {
    prices: filteredPrices,
    isLoading,
    error,
    summary,
    filters,
    setFilters,
    refresh: fetchPrices,
    getPriceTypeLabel,
    formatPrice,
    priceTypes,
    channels,
    currencies
  }
} 