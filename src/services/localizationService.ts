import axiosInstance from '@/lib/axiosInstance'
import { analyticsLocalizationQuality, analyticsLocalizationMissing } from '@/lib/apiPaths'
import type { ReportFiltersState } from '@/domains/reports/components/filters/ReportFilters'
import logger from '@/domains/core/lib/logger'

/**
 * Interface for the response from the localization quality endpoint
 */
export interface LocalizationCoverageResponse {
  overall: {
    total_attributes: number
    translated_attributes: number
    translated_pct: number
  }
  locale_stats: Array<{
    locale: string
    translated_pct: number
    total_attributes: number
    translated_attributes: number
  }>
  pagination?: {
    total_pages: number
    current_page: number
    total_items: number
    page_size: number
    has_next: boolean
    has_previous: boolean
  }
}

/**
 * Interface for localization coverage data returned from the API
 */
export interface LocalizationCoverageData {
  locale_stats: Array<{
    locale: string
    translated_pct: number
    total_attributes: number
    translated_attributes: number
  }>
}

/**
 * Interface for heatmap data showing missing attributes by group and locale
 */
export interface HeatmapData {
  attribute_group: string
  locale: string
  translated_pct: number // 0-100
  total: number
  translated: number
}

/**
 * Fetches localization quality analytics with filtering support
 * 
 * @param filters - Report filters state object including locale, category, etc.
 * @returns Promise resolving to the localization quality data
 */
export async function getLocalizationQuality(
  filters: ReportFiltersState
): Promise<LocalizationCoverageResponse> {
  try {
    const params = {
      from_date: filters.from ? new Date(filters.from).toISOString() : undefined,
      to_date: filters.to ? new Date(filters.to).toISOString() : undefined,
      locale: filters.locale,
      category: filters.category,
      channel: filters.channel,
      family: filters.family
    }
    
    logger.info('Fetching localization quality data with params:', params)
    
    const { data } = await axiosInstance.get<LocalizationCoverageResponse>(
      analyticsLocalizationQuality(),
      { params }
    )
    
    return data
  } catch (error) {
    logger.error('Failed to fetch localization quality data', error)
    throw error
  }
}

/**
 * Fetches localization coverage data with filtering support
 * 
 * @param filters - Report filters state object including locale, category, etc.
 * @returns Promise resolving to the localization coverage data
 */
export async function getLocalizationCoverage(
  filters: ReportFiltersState
): Promise<LocalizationCoverageData> {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams()
    
    if (filters.locale) queryParams.append('locale', filters.locale)
    if (filters.category) queryParams.append('category', filters.category)
    if (filters.channel) queryParams.append('channel', filters.channel)
    if (filters.family) queryParams.append('family', filters.family)
    if (filters.from) queryParams.append('date_from', filters.from)
    if (filters.to) queryParams.append('date_to', filters.to)
    
    // Get the base URL
    const baseUrl = analyticsLocalizationQuality()
    
    // Add query params if any exist
    const url = queryParams.toString() 
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl
      
    logger.info(`Fetching localization coverage data with URL: ${url}`)
    
    const response = await axiosInstance.get<LocalizationCoverageData>(url)
    return response.data
  } catch (error) {
    logger.error('Failed to fetch localization coverage data', error)
    throw error
  }
}

/**
 * Fetches missing attributes heatmap data with filtering support
 * 
 * @param filters - Report filters state object including locale, category, etc.
 * @returns Promise resolving to the heatmap data
 */
export async function getMissingAttributesHeatmap(
  filters: ReportFiltersState
): Promise<HeatmapData[]> {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams()
    
    if (filters.locale) queryParams.append('locale', filters.locale)
    if (filters.category) queryParams.append('category', filters.category)
    if (filters.channel) queryParams.append('channel', filters.channel)
    if (filters.family) queryParams.append('family', filters.family)
    if (filters.from) queryParams.append('date_from', filters.from)
    if (filters.to) queryParams.append('date_to', filters.to)
    
    // Get the base URL
    const baseUrl = analyticsLocalizationMissing()
    
    // Add query params if any exist
    const url = queryParams.toString() 
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl
      
    logger.info(`Fetching missing attributes heatmap data with URL: ${url}`)
    
    const response = await axiosInstance.get<any>(url)
    
    // Validate the response structure
    const responseData = response.data
    
    // If the API returns results property containing the array (common pattern)
    if (responseData && typeof responseData === 'object') {
      if (Array.isArray(responseData)) {
        return responseData as HeatmapData[]
      } else if (responseData.results && Array.isArray(responseData.results)) {
        return responseData.results as HeatmapData[]
      } else if (responseData.data && Array.isArray(responseData.data)) {
        return responseData.data as HeatmapData[]
      }
    }
    
    // If we couldn't find a valid array in the response, log an error and return empty array
    logger.error('Unexpected API response format for heatmap data:', responseData)
    return []
  } catch (error) {
    logger.error('Failed to fetch missing attributes heatmap data', error)
    throw error
  }
}

/**
 * Service exports for localization data
 */
const localizationService = {
  getLocalizationCoverage,
  getMissingAttributesHeatmap
}

export default localizationService 