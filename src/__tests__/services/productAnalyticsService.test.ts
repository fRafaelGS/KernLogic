import { ProductsApi } from '@/services/productsClient';
import { 
  fetchAllAttributeValues, 
  fetchFilteredProducts,
  calculateAttributeCompleteness,
  ReportFiltersState
} from '@/services/productAnalyticsService';
import { 
  Product, 
  PaginatedProductList, 
  AttributeValueDetail 
} from '@/services/productsClient/models';

// Mock the ProductsApi
jest.mock('@/services/productsClient', () => {
  return {
    ProductsApi: jest.fn().mockImplementation(() => ({
      productsList: jest.fn(),
      fetchAllProducts: jest.fn(),
      productAttributesList: jest.fn()
    }))
  };
});

describe('productAnalyticsService', () => {
  let mockProductsApi: jest.Mocked<ProductsApi>;
  
  // Sample data for tests
  const mockProducts: Product[] = [
    {
      id: 1,
      name: 'Test Product 1',
      sku: 'TP1',
      description: 'Test description 1',
      prices: [],
      category: 'Electronics',
      brand: 'Test Brand',
      barcode: '12345',
      tags: ['test', 'electronics'],
      attribute_values: [],
      is_active: true,
      is_archived: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      completeness_percent: 75,
      missing_fields: ['description'],
      assets: [],
      primary_asset: null,
      organization: 1,
      created_by: 'user@example.com',
      family: 1,
      family_overrides: [],
      effective_attribute_groups: []
    },
    {
      id: 2,
      name: 'Test Product 2',
      sku: 'TP2',
      description: 'Test description 2',
      prices: [],
      category: 'Furniture',
      brand: 'Test Brand',
      barcode: '54321',
      tags: ['test', 'furniture'],
      attribute_values: [],
      is_active: true,
      is_archived: false,
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      completeness_percent: 85,
      missing_fields: [],
      assets: [],
      primary_asset: null,
      organization: 1,
      created_by: 'user@example.com',
      family: 2,
      family_overrides: [],
      effective_attribute_groups: []
    }
  ];
  
  const mockAttributeValues: AttributeValueDetail[] = [
    {
      id: 1,
      attribute: 1,
      attribute_code: 'color',
      attribute_label: 'Color',
      attribute_type: 'text',
      product: 1,
      organization: 1,
      value: 'Red',
      locale: 1,
      locale_code: 'en_US',
      channel: 'web',
      created_by: 1
    },
    {
      id: 2,
      attribute: 2,
      attribute_code: 'size',
      attribute_label: 'Size',
      attribute_type: 'text',
      product: 1,
      organization: 1,
      value: 'Large',
      locale: 2,
      locale_code: 'fr_FR',
      channel: 'web',
      created_by: 1
    },
    {
      id: 3,
      attribute: 3,
      attribute_code: 'weight',
      attribute_label: 'Weight',
      attribute_type: 'number',
      product: 1,
      organization: 1,
      value: 2.5,
      locale: null,
      locale_code: null,
      channel: 'mobile',
      created_by: 1
    }
  ];
  
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    
    // Get a reference to the mocked ProductsApi instance
    mockProductsApi = new ProductsApi() as jest.Mocked<ProductsApi>;
    
    // Setup default mock implementations
    mockProductsApi.fetchAllProducts.mockResolvedValue(mockProducts);
    mockProductsApi.productAttributesList.mockResolvedValue(mockAttributeValues);
  });
  
  describe('fetchAllAttributeValues', () => {
    it('should fetch products and their attribute values', async () => {
      // Arrange
      const filters: ReportFiltersState = {};
      
      // Act
      const result = await fetchAllAttributeValues(filters);
      
      // Assert
      expect(mockProductsApi.fetchAllProducts).toHaveBeenCalledWith({});
      expect(mockProductsApi.productAttributesList).toHaveBeenCalledWith(1);
      expect(mockProductsApi.productAttributesList).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(6); // 3 attributes for each of the 2 products
      
      // Check that attribute values are normalized correctly
      expect(result[0]).toEqual(expect.objectContaining({
        attributeId: 1,
        attributeCode: 'color',
        locale: 'en_US',
        channel: 'web',
        value: 'Red',
        productId: 1,
        productSku: 'TP1'
      }));
    });
    
    it('should apply category filters to product queries', async () => {
      // Arrange
      const filters: ReportFiltersState = {
        category: 'Electronics'
      };
      
      // Act
      await fetchAllAttributeValues(filters);
      
      // Assert
      expect(mockProductsApi.fetchAllProducts).toHaveBeenCalledWith({
        category: 'Electronics'
      });
    });
    
    it('should apply family filters to product queries', async () => {
      // Arrange
      const filters: ReportFiltersState = {
        family: '1'
      };
      
      // Act
      await fetchAllAttributeValues(filters);
      
      // Assert
      expect(mockProductsApi.fetchAllProducts).toHaveBeenCalledWith({
        family: '1'
      });
    });
    
    it('should filter attribute values by locale', async () => {
      // Arrange
      const filters: ReportFiltersState = {
        locale: 'fr_FR'
      };
      
      // Act
      const result = await fetchAllAttributeValues(filters);
      
      // Assert
      // Should only include attributes with fr_FR locale
      expect(result).toHaveLength(2); // 1 attribute with fr_FR locale for each product
      expect(result[0]).toEqual(expect.objectContaining({
        attributeCode: 'size',
        locale: 'fr_FR'
      }));
    });
    
    it('should filter attribute values by channel', async () => {
      // Arrange
      const filters: ReportFiltersState = {
        channel: 'mobile'
      };
      
      // Act
      const result = await fetchAllAttributeValues(filters);
      
      // Assert
      // Should only include attributes with mobile channel
      expect(result).toHaveLength(2); // 1 attribute with mobile channel for each product
      expect(result[0]).toEqual(expect.objectContaining({
        attributeCode: 'weight',
        channel: 'mobile'
      }));
    });
    
    it('should handle API errors gracefully', async () => {
      // Arrange
      mockProductsApi.fetchAllProducts.mockRejectedValue(new Error('API error'));
      
      // Act & Assert
      await expect(fetchAllAttributeValues({})).rejects.toThrow('API error');
    });
  });
  
  describe('calculateAttributeCompleteness', () => {
    it('should calculate completeness by family', async () => {
      // Arrange
      const filters: ReportFiltersState = {};
      
      // Act
      const result = await calculateAttributeCompleteness(filters);
      
      // Assert
      expect(result).toHaveProperty('1');
      expect(result).toHaveProperty('2');
      expect(result['1']).toEqual({
        total: 100,
        filled: 75,
        percentage: 75
      });
      expect(result['2']).toEqual({
        total: 100,
        filled: 85,
        percentage: 85
      });
    });
  });
}); 