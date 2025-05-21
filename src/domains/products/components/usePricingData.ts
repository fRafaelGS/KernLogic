import { useState, useEffect, useMemo } from 'react'
import { usePriceMetadata } from '@/hooks/usePriceMetadata'
import priceService from '@/services/priceService'
import { PriceFormValues } from '@/domains/products/components/PricingForm'

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
  const [rawPrices, setRawPrices] = useState<any[]>([])
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
      // Use priceService to fetch prices
      const response = await priceService.getPrices(productId)
      
      
      // Handle different response formats
      let priceData: any[] = []
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          // Direct array in response.data
          priceData = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Nested data property (response.data.data)
          priceData = response.data.data
        } else if (Array.isArray(response.data.results)) {
          // DRF paginated response
          priceData = response.data.results
        }
      }
      
      // Default to empty array if no data found in expected formats
      if (!priceData || !Array.isArray(priceData)) {
        console.warn('No price data found or unexpected format:', response.data)
        priceData = []
      }
      
      setRawPrices(priceData)
      
      // Transform the API response to match our Price interface
      const fetchedPrices: Price[] = priceData.map(price => ({
        id: price.id,
        priceType: price.priceType || price.price_type || '',
        channel: price.channel || (price.channel_id ? price.channel_id.toString() : ''),
        currencyCode: price.currencyCode || price.currency || 'USD',
        value: typeof price.value === 'number' ? price.value : (Number(price.amount) || 0),
        formattedValue: formatPrice(
          typeof price.value === 'number' ? price.value : (Number(price.amount) || 0),
          price.currencyCode || price.currency || 'USD'
        )
      }))
      
      setPrices(fetchedPrices)
    } catch (err) {
      setError('Failed to load prices')
      console.error('Error fetching prices:', err)
      setPrices([]) // Ensure prices is always an array even on error
      setRawPrices([])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to add a price
  const add = async (values: PriceFormValues) => {
    const payload = {
      price_type: values.priceType,
      currency: values.currencyCode,
      amount: values.value,
      valid_from: values.validFrom
    }
    if (values.validTo) payload.valid_to = values.validTo
    if (values.channel) payload.channel_id = values.channel
    
    try {
      await priceService.createPrice(productId, payload)
      await fetchPrices() // Refresh prices after adding
      return true
    } catch (err) {
      console.error('Error adding price:', err)
      throw err
    }
  }

  // Function to update a price
  const update = async (priceId: number, values: PriceFormValues) => {
    try {
      await priceService.updatePrice(productId, priceId, values)
      await fetchPrices() // Refresh prices after updating
      return true
    } catch (err) {
      console.error('Error updating price:', err)
      throw err
    }
  }

  // Function to remove a price
  const remove = async (priceId: number) => {
    try {
      await priceService.deletePrice(productId, priceId)
      await fetchPrices() // Refresh prices after deleting
      return true
    } catch (err) {
      console.error('Error removing price:', err)
      throw err
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
    rawPrices, // full, unfiltered from API
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
    currencies,
    add,
    update,
    remove
  }
} 