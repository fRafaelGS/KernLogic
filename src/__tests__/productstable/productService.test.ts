import { jest } from '@jest/globals';

// Mock config first to avoid import.meta issues
jest.mock('@/config/config', () => ({
  API_ENDPOINTS: {
    products: {
      create: '/api/products/',
    },
  },
  PRODUCTS_API_URL: '/api/products',
  PRODUCTS_PATH: '/api/products',
}));

// Mock categoryService
jest.mock('@/services/categoryService', () => ({
  getCategories: jest.fn(),
  createCategory: jest.fn(),
}));

// Mock dashboardService
jest.mock('@/services/dashboardService', () => ({}));

// Mock axiosInstance
jest.mock('@/lib/axiosInstance', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock axios for error checking
jest.mock('axios', () => ({
  isAxiosError: jest.fn(),
}));

import { productService } from '@/services/productService';
import type { Product, PaginatedResponse } from '@/services/productService';
import axiosInstance from '@/lib/axiosInstance';
import axios from 'axios';

const mockAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>;
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock data for testing
const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  sku: 'TEST-001',
  category: { id: 1, name: 'Electronics' },
  is_active: true,
  tags: ['tech', 'test'],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockPaginatedResponse: PaginatedResponse<Product> = {
  count: 100,
  next: 'http://api.example.com/products?page=2',
  previous: null,
  results: [mockProduct],
};

const mockTagOptions = [
  { label: 'tech', value: 'tech' },
  { label: 'mobile', value: 'mobile' },
];

const mockCreatedTag = {
  id: 'new-tag',
  name: 'new-tag',
};

describe('ProductService API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    test('should return products array on successful fetch with fetchAll=true', async () => {
      const mockResponse = { data: [mockProduct] };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await productService.getProducts({}, true, false);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/products/');
      expect(result).toEqual([mockProduct]);
    });

    test('should return paginated response when fetchAll=false', async () => {
      const mockResponse = { data: mockPaginatedResponse };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await productService.getProducts({}, false, false);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/products/');
      expect(result).toEqual(mockPaginatedResponse);
    });

    test('should handle query parameters correctly', async () => {
      const mockResponse = { data: [mockProduct] };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const filters = {
        search: 'test',
        category: 'electronics',
        page: 1,
        page_size: 10,
      };

      await productService.getProducts(filters, true, false);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('category=electronics')
      );
    });

    test('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      mockAxios.isAxiosError.mockReturnValue(true);

      const result = await productService.getProducts();

      expect(result).toEqual([]);
    });

    test('should include assets when includeAssets=true', async () => {
      const mockResponse = { data: [mockProduct] };
      const mockAssets = [{ id: 1, name: 'asset1', type: 'image', url: 'test.jpg' }];
      
      mockAxiosInstance.get
        .mockResolvedValueOnce(mockResponse) // getProducts call
        .mockResolvedValueOnce({ data: mockAssets }); // getProductAssets call

      const result = await productService.getProducts({}, true, true);

      expect(result).toEqual([expect.objectContaining({
        ...mockProduct,
        assets: mockAssets,
      })]);
    });
  });

  describe('searchTags', () => {
    test('should return transformed tag options on successful search', async () => {
      const mockResponse = { data: ['tech', 'mobile', 'electronics'] };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await productService.searchTags('tech');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/products/tags/', {
        params: { search: 'tech' }
      });
      expect(result).toEqual([
        { label: 'tech', value: 'tech' },
        { label: 'mobile', value: 'mobile' },
        { label: 'electronics', value: 'electronics' },
      ]);
    });

    test('should handle empty search term', async () => {
      const mockResponse = { data: ['tag1', 'tag2'] };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await productService.searchTags('');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/products/tags/', {
        params: {}
      });
      expect(result).toEqual([
        { label: 'tag1', value: 'tag1' },
        { label: 'tag2', value: 'tag2' },
      ]);
    });

    test('should return empty array on API error', async () => {
      const mockError = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      mockAxios.isAxiosError.mockReturnValue(true);

      const result = await productService.searchTags('test');

      expect(result).toEqual([]);
    });

    test('should handle non-array response', async () => {
      const mockResponse = { data: 'invalid-response' };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await productService.searchTags('test');

      expect(result).toEqual([]);
    });
  });

  describe('createTag', () => {
    test('should create tag and return formatted response on success', async () => {
      const mockResponse = { data: 'new-tag' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await productService.createTag({ name: 'new-tag' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/products/tags/', {
        name: 'new-tag'
      });
      expect(result).toEqual({
        id: 'new-tag',
        name: 'new-tag'
      });
    });

    test('should throw error on API failure', async () => {
      const mockError = new Error('Create tag failed');
      mockAxiosInstance.post.mockRejectedValueOnce(mockError);

      await expect(productService.createTag({ name: 'new-tag' }))
        .rejects.toThrow('Create tag failed');
    });
  });

  describe('bulkAddTags', () => {
    test('should successfully add tags to multiple products', async () => {
      const mockResponse = { status: 200, data: 'success' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const productIds = [1, 2, 3];
      const tags = ['new-tag', 'bulk-tag'];

      await productService.bulkAddTags(productIds, tags);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/products/bulk_update/', {
        ids: productIds,
        field: 'tags',
        tags: tags
      });
    });

    test('should throw error when API returns non-200 status', async () => {
      const mockResponse = { status: 400, data: 'Bad Request' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const productIds = [1, 2];
      const tags = ['tag1'];

      await expect(productService.bulkAddTags(productIds, tags))
        .rejects.toThrow('Unexpected response status: 400');
    });

    test('should handle API errors with proper error logging', async () => {
      const mockError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValueOnce(mockError);
      mockAxios.isAxiosError.mockReturnValue(true);

      const productIds = [1];
      const tags = ['tag1'];

      await expect(productService.bulkAddTags(productIds, tags))
        .rejects.toThrow('Network Error');
    });
  });

  describe('bulkRemoveTags', () => {
    test('should successfully remove tags from multiple products', async () => {
      const mockResponse = { status: 200, data: 'success' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const productIds = [1, 2, 3];
      const tags = ['old-tag', 'remove-tag'];

      await productService.bulkRemoveTags(productIds, tags);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/products/bulk_update/', {
        ids: productIds,
        field: 'tags',
        tags: tags,
        operation: 'remove'
      });
    });

    test('should throw error when API returns non-200 status', async () => {
      const mockResponse = { status: 500, data: 'Internal Server Error' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const productIds = [1];
      const tags = ['tag1'];

      await expect(productService.bulkRemoveTags(productIds, tags))
        .rejects.toThrow('Unexpected response status: 500');
    });

    test('should handle network errors properly', async () => {
      const mockError = new Error('Connection failed');
      mockAxiosInstance.post.mockRejectedValueOnce(mockError);
      mockAxios.isAxiosError.mockReturnValue(true);

      const productIds = [1, 2];
      const tags = ['tag1'];

      await expect(productService.bulkRemoveTags(productIds, tags))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('updateProduct', () => {
    test('should update product with regular object data', async () => {
      const mockResponse = { data: { ...mockProduct, name: 'Updated Product' } };
      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);

      const updateData = { name: 'Updated Product', description: 'Updated Description' };
      const result = await productService.updateProduct(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/products/1/', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    test('should handle FormData updates with correct headers', async () => {
      const mockResponse = { data: mockProduct };
      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);

      const formData = new FormData();
      formData.append('name', 'Updated via FormData');

      const result = await productService.updateProduct(1, formData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/api/products/1/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result).toEqual(mockProduct);
    });

    test('should handle core field changes with activity tracking', async () => {
      const mockResponse = { data: mockProduct };
      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);

      // Assuming 'name' is a core field
      const updateData = { name: 'Core Field Update' };

      await productService.updateProduct(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/products/1/', 
        expect.objectContaining({
          name: 'Core Field Update',
          _activity_type: 'PRODUCT_CORE_EDIT'
        })
      );
    });

    test('should throw error on update failure', async () => {
      const mockError = new Error('Update failed');
      mockAxiosInstance.patch.mockRejectedValueOnce(mockError);

      const updateData = { name: 'Failed Update' };

      await expect(productService.updateProduct(1, updateData))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteProduct', () => {
    test('should successfully delete product', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ status: 204 });

      await productService.deleteProduct(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/products/1/');
    });

    test('should handle delete errors', async () => {
      const mockError = new Error('Delete failed - Product not found');
      mockAxiosInstance.delete.mockRejectedValueOnce(mockError);

      await expect(productService.deleteProduct(999))
        .rejects.toThrow('Delete failed - Product not found');
    });

    test('should handle permission errors', async () => {
      const mockError = new Error('Permission denied');
      mockAxiosInstance.delete.mockRejectedValueOnce(mockError);

      await expect(productService.deleteProduct(1))
        .rejects.toThrow('Permission denied');
    });
  });
}); 