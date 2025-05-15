import { z } from 'zod'
import { Product, ProductAttribute } from '@/services/productService'
import { Category as ProductCategory } from '@/types/categories'

/**
 * Validates if a string is a valid GTIN (EAN-8, EAN-13, UPC-A, GTIN-14)
 * @param code - The code to validate
 * @returns Whether the code is a valid GTIN
 */
export const isValidGTIN = (code: string): boolean => {
  // Remove any spaces or dashes
  code = code.replace(/[\s-]/g, '')
  
  // Check if the code contains only digits
  if (!/^\d+$/.test(code)) return false
  
  // Check for valid length
  if (![8, 12, 13, 14].includes(code.length)) return false
  
  // Checksum validation (Luhn algorithm for GTIN/EAN/UPC)
  let sum = 0
  const parity = code.length % 2
  
  for (let i = 0; i < code.length - 1; i++) {
    let digit = parseInt(code[i], 10)
    if (i % 2 === parity) digit *= 3
    sum += digit
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(code[code.length - 1], 10)
}

/**
 * Schema for product form validation using Zod
 */
export const productEditSchema = z.object({
  /**
   * Product name (required)
   * Must be non-empty
   */
  name: z.string().min(1, 'Name is required'),
  
  /**
   * Product description (optional)
   * Can be empty or undefined
   */
  description: z.string().optional(),
  
  /**
   * Product SKU (required)
   * Must be non-empty and unique within the system
   */
  sku: z.string().min(1, 'SKU is required'),
  
  /**
   * Product price (required)
   * Must be at least 0.01
   */
  price: z.coerce
    .number({ required_error: 'Price is required' })
    .min(0.01, 'Price must be at least 0.01'),
  
  /**
   * Product category (optional)
   * Can be a category object from react-select or undefined
   */
  category: z.any().optional(),
  
  /**
   * Product active status
   * Defaults to true
   */
  is_active: z.boolean().default(true),
  
    // Legacy primary_image field removed
  
  /**
   * Product brand (optional)
   */
  brand: z.string().optional(),
  
  /**
   * Product barcode / GTIN (optional)
   * Must be a valid EAN-8, EAN-13, UPC-A, or GTIN-14 if provided
   */
  barcode: z.string()
    .refine(val => val === '' || isValidGTIN(val), {
      message: 'Invalid GTIN format. Please enter a valid EAN-8, EAN-13, UPC-A, or GTIN-14 code',
    })
    .optional(),
  
  /**
   * Product tags (array of tag IDs)
   * Defaults to empty array
   */
  tags: z.array(z.string()).default([]),
  
  /**
   * Product custom attributes (key-value pairs)
   * Defaults to empty object
   */
  attributes: z.record(z.string(), z.string()).default({})
})

/**
 * Type definition for product form values
 */
export type ProductFormValues = z.infer<typeof productEditSchema>

/**
 * Helper to convert ProductAttribute[] to Record<string, string>
 * @param attributes - Array of product attributes
 * @returns Record with attribute names as keys and values as values
 */
const attributesToRecord = (attributes: ProductAttribute[] | Record<string, string> | undefined): Record<string, string> => {
  if (!attributes) return {}
  
  if (Array.isArray(attributes)) {
    // Convert attribute array to record
    return attributes.reduce((acc, attr) => {
      if (attr.name && attr.value) {
        acc[attr.name] = attr.value
      }
      return acc
    }, {} as Record<string, string>)
  }
  
  // Already a record
  return attributes
}

/**
 * Extract price from a product
 * @param product - Product object
 * @returns Price value or default
 */
const extractPrice = (product?: Product): number => {
  if (!product) return 0.01
  
  // Check if there's a prices array with values
  if (product.prices && product.prices.length > 0) {
    // Return the first price's amount or fallback to default
    return product.prices[0].amount || 0.01
  }
  
  // Fallback to default value
  return 0.01
}

/**
 * Extract category label and value from various category formats
 * @param category - Category data in different possible formats
 * @returns Object with label and value properties for the form
 */
export const extractCategoryInfo = (category: ProductCategory[] | ProductCategory | string): { label: string, value: string | number } => {
  // Handle string category
  if (typeof category === 'string') {
    return { label: category, value: category }
  }
  
  // Handle array of categories (take the last one, which is the leaf)
  if (Array.isArray(category) && category.length > 0) {
    const leafCategory = category[category.length - 1]
    return { 
      label: leafCategory.name || '', 
      value: leafCategory.id || '' 
    }
  }
  
  // Handle single category object
  if (category && typeof category === 'object' && !Array.isArray(category)) {
    return { 
      label: (category as ProductCategory).name || '', 
      value: (category as ProductCategory).id || '' 
    }
  }
  
  // Default fallback if none of the above
  return { label: '', value: '' }
}

/**
 * Returns default values for the product form
 * @param initialProduct - Optional product data to initialize with
 * @returns Default values for the product form
 */
export const getDefaultProductValues = (initialProduct?: Product): ProductFormValues => {
  return {
    name: initialProduct?.name || '',
    description: initialProduct?.description || '',
    sku: initialProduct?.sku || '',
    price: extractPrice(initialProduct),
    category: initialProduct?.category ? extractCategoryInfo(initialProduct.category) : undefined,
    is_active: initialProduct?.is_active ?? true,
    brand: initialProduct?.brand || '',
    barcode: initialProduct?.barcode || '',
    tags: initialProduct?.tags || [],
    attributes: attributesToRecord(initialProduct?.attributes)
  }
}

/**
 * Usage example:
 * 
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 * import { productEditSchema, getDefaultProductValues, ProductFormValues } from '@/schemas/product'
 * 
 * // Inside your component:
 * const form = useForm<ProductFormValues>({
 *   resolver: zodResolver(productEditSchema),
 *   defaultValues: getDefaultProductValues(initialProduct)
 * })
 */ 