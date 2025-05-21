import { ProductsApi } from '@/services/productsClient';
import { PRODUCTS_API_BASE } from '@/services/productsClient/config';
import { AttributeValue, Product } from '@/services/productsClient/models';
import logger from '@/domains/core/lib/logger';

// Define ReportFiltersState interface to match the expected filter format
export interface ReportFiltersState {
  from?: string;
  to?: string;
  locale?: string;
  category?: string;
  channel?: string;
  family?: string;
}

// Create an instance of the ProductsApi
const api = new ProductsApi({ basePath: PRODUCTS_API_BASE });

/**
 * Normalized attribute value format for analytics
 */
export interface NormalizedAttributeValue {
  attributeId: number;
  attributeCode?: string;
  locale: string | null;
  channel: string | null;
  value: any;
  productId: number;
  productSku?: string;
}

/**
 * Fetch all products' attribute values, applying filters
 * 
 * @param filters Report filters to apply
 * @returns Promise resolving to an array of all attribute values
 */
export async function fetchAllAttributeValues(
  filters: ReportFiltersState
): Promise<NormalizedAttributeValue[]> {
  try {
    logger.info('Fetching all attribute values with filters:', filters);

    // Convert filters to product API parameters
    const params: Record<string, any> = {};
    
    if (filters.category) {
      params.category = filters.category;
    }
    
    if (filters.family) {
      params.family = filters.family;
    }

    // We'll filter by channel after fetching data as it's applied to attribute values, not products
    
    // Fetch all products with pagination
    const products = await api.fetchAllProducts(params);
    logger.info(`Fetched ${products.length} products`);

    // Collect all attribute values
    const allAttributeValues: NormalizedAttributeValue[] = [];
    
    // Get attribute values for each product
    for (const product of products) {
      try {
        const attributeValues = await api.productAttributesList(product.id);
        
        // Normalize and filter attribute values
        const normalizedValues = attributeValues
          .filter(av => {
            // Apply locale filter if specified
            if (filters.locale && av.locale_code !== filters.locale) {
              return false;
            }
            
            // Apply channel filter if specified
            if (filters.channel && av.channel !== filters.channel) {
              return false;
            }
            
            return true;
          })
          .map(av => ({
            attributeId: av.attribute,
            attributeCode: av.attribute_code,
            locale: av.locale_code,
            channel: av.channel,
            value: av.value,
            productId: product.id,
            productSku: product.sku
          }));
        
        allAttributeValues.push(...normalizedValues);
      } catch (error) {
        logger.error(`Error fetching attributes for product ${product.id}:`, error);
        // Continue with next product even if one fails
      }
    }
    
    logger.info(`Collected ${allAttributeValues.length} attribute values after filtering`);
    return allAttributeValues;
  } catch (error) {
    logger.error('Error in fetchAllAttributeValues:', error);
    throw error;
  }
}

/**
 * Fetch all products matching the given filters
 * 
 * @param filters Report filters to apply
 * @returns Promise resolving to an array of products
 */
export async function fetchFilteredProducts(
  filters: ReportFiltersState
): Promise<Product[]> {
  try {
    // Convert filters to product API parameters
    const params: Record<string, any> = {};
    
    if (filters.category) {
      params.category = filters.category;
    }
    
    if (filters.family) {
      params.family = filters.family;
    }
    
    // Fetch all products with pagination
    return await api.fetchAllProducts(params);
  } catch (error) {
    logger.error('Error fetching filtered products:', error);
    throw error;
  }
}

/**
 * Calculate attribute completeness by product family
 * 
 * @param filters Report filters to apply
 * @returns Promise resolving to completeness data by family
 */
export async function calculateAttributeCompleteness(
  filters: ReportFiltersState
): Promise<Record<string, { total: number; filled: number; percentage: number }>> {
  try {
    const products = await fetchFilteredProducts(filters);
    const result: Record<string, { total: number; filled: number; percentage: number }> = {};
    
    // Group products by family
    const familyGroups: Record<string, Product[]> = {};
    
    for (const product of products) {
      const familyId = product.family ? product.family.toString() : 'no_family';
      if (!familyGroups[familyId]) {
        familyGroups[familyId] = [];
      }
      familyGroups[familyId].push(product);
    }
    
    // Calculate completeness for each family
    for (const [familyId, familyProducts] of Object.entries(familyGroups)) {
      let totalAttributes = 0;
      let filledAttributes = 0;
      
      for (const product of familyProducts) {
        // Calculate from product's completeness data
        if (typeof product.completeness_percent === 'number') {
          const productTotal = 100; // Assuming 100% means all required attributes
          const productFilled = product.completeness_percent;
          
          totalAttributes += productTotal;
          filledAttributes += productFilled;
        }
      }
      
      const percentage = totalAttributes > 0 
        ? (filledAttributes / totalAttributes) * 100 
        : 0;
        
      result[familyId] = {
        total: totalAttributes,
        filled: filledAttributes,
        percentage
      };
    }
    
    return result;
  } catch (error) {
    logger.error('Error calculating attribute completeness:', error);
    throw error;
  }
}

export default {
  fetchAllAttributeValues,
  fetchFilteredProducts,
  calculateAttributeCompleteness,
  api // Export the API instance for direct access if needed
}; 