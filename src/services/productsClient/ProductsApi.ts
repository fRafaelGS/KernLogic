import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  Product,
  ProductListParams,
  PaginatedProductList,
  ProductRequest,
  AttributeValue,
  AttributeValueDetail,
  ProductEvent,
  PaginatedProductEventList,
  ProductAsset
} from './models';
import { 
  PRODUCTS_API_BASE, 
  SERVICE_JWT, 
  REQUEST_TIMEOUT, 
  MAX_RETRIES,
  DEFAULT_PAGE_SIZE,
  PRODUCTS_PATH
} from './config';
import logger from '@/lib/logger';

/**
 * API client for interacting with products endpoints
 */
export class ProductsApi {
  private instance: AxiosInstance;
  private basePath: string;

  constructor(config: { basePath?: string } = {}) {
    this.basePath = config.basePath || PRODUCTS_API_BASE;
    
    // Create Axios instance with default config
    this.instance = axios.create({
      baseURL: this.basePath,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add auth interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (SERVICE_JWT) {
          config.headers['Authorization'] = `Bearer ${SERVICE_JWT}`;
        }
        return config;
      },
      (error) => {
        logger.error('Request error in ProductsApi:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for retry logic
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Only retry on network errors or 5xx server errors
        if (!config || !shouldRetry(error) || config.retryCount >= MAX_RETRIES) {
          return Promise.reject(error);
        }

        // Implement exponential backoff
        config.retryCount = config.retryCount || 0;
        config.retryCount += 1;
        
        const delay = Math.pow(2, config.retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
        logger.warn(`Retrying request (${config.retryCount}/${MAX_RETRIES}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.instance(config);
      }
    );
  }

  /**
   * List products with pagination and filtering
   */
  async productsList(params: ProductListParams = {}): Promise<PaginatedProductList> {
    try {
      const response = await this.instance.get<PaginatedProductList>(`/products/`, {
        params: {
          page_size: DEFAULT_PAGE_SIZE,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching products list:', error);
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  async productsRetrieve(id: number): Promise<Product> {
    try {
      const response = await this.instance.get<Product>(`/products/${id}/`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async productsCreate(productRequest: ProductRequest): Promise<Product> {
    try {
      const response = await this.instance.post<Product>(`/products/`, productRequest);
      return response.data;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product (partial update)
   */
  async productsPartialUpdate(id: number, productRequest: Partial<ProductRequest>): Promise<Product> {
    try {
      const response = await this.instance.patch<Product>(`/products/${id}/`, productRequest);
      return response.data;
    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async productsDestroy(id: number): Promise<void> {
    try {
      await this.instance.delete(`/products/${id}/`);
    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  /**
   * List attribute values for a product
   */
  async productAttributesList(productId: number): Promise<AttributeValueDetail[]> {
    try {
      const response = await this.instance.get<AttributeValueDetail[]>(`/products/${productId}/attributes/`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching attributes for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Create attribute value for a product
   */
  async productAttributesCreate(
    productId: number, 
    attributeValue: Omit<AttributeValue, 'id' | 'organization' | 'created_by'>
  ): Promise<AttributeValue> {
    try {
      const response = await this.instance.post<AttributeValue>(
        `/products/${productId}/attributes/`, 
        attributeValue
      );
      return response.data;
    } catch (error) {
      logger.error(`Error creating attribute for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Update attribute value
   */
  async productAttributesUpdate(
    productId: number,
    attributeId: number,
    attributeValue: Partial<Omit<AttributeValue, 'id' | 'organization' | 'created_by'>>
  ): Promise<AttributeValue> {
    try {
      const response = await this.instance.patch<AttributeValue>(
        `/products/${productId}/attributes/${attributeId}/`,
        attributeValue
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating attribute ${attributeId} for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get product history/events with pagination
   */
  async productsHistoryList(
    productId: number,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedProductEventList> {
    try {
      const response = await this.instance.get<PaginatedProductEventList>(
        `/products/${productId}/history/`,
        {
          params: {
            page,
            page_size: pageSize || DEFAULT_PAGE_SIZE
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching history for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * List product assets
   */
  async productAssetsList(productId: number): Promise<ProductAsset[]> {
    try {
      const response = await this.instance.get<ProductAsset[]>(`/products/${productId}/assets/`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching assets for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all products (automatically handles pagination)
   * 
   * Warning: This can be resource-intensive for large datasets
   */
  async fetchAllProducts(params: ProductListParams = {}): Promise<Product[]> {
    try {
      let allProducts: Product[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      // First request
      const initialResponse = await this.productsList({
        ...params,
        page
      });
      
      allProducts = [...initialResponse.results];
      nextUrl = initialResponse.next;
      
      // Continue fetching if there are more pages
      while (nextUrl) {
        page++;
        const response = await this.productsList({
          ...params,
          page
        });
        
        allProducts = [...allProducts, ...response.results];
        nextUrl = response.next;
      }
      
      return allProducts;
    } catch (error) {
      logger.error('Error fetching all products:', error);
      throw error;
    }
  }
}

/**
 * Determine if a request should be retried based on the error
 */
function shouldRetry(error: any): boolean {
  // Retry on network errors
  if (!error.response) {
    return true;
  }
  
  // Retry on 5xx server errors
  const status = error.response.status;
  return status >= 500 && status < 600;
} 