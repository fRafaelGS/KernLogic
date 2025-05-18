import { getImportFieldSchema } from '@/services/importService';
import axiosInstance from '@/lib/axiosInstance';

jest.mock('@/lib/axiosInstance', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('importService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getImportFieldSchema', () => {
    it('calls the correct endpoint', async () => {
      // Arrange
      const mockResponse = {
        data: [
          { id: 'sku', label: 'SKU', required: true, type: 'string' },
          { id: 'name', label: 'Name', required: false, type: 'string' },
        ],
      };
      (axiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await getImportFieldSchema();

      // Assert
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/field-schema/');
      expect(result).toEqual(mockResponse);
    });

    it('handles errors correctly', async () => {
      // Arrange
      const errorMessage = 'Network Error';
      (axiosInstance.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(getImportFieldSchema()).rejects.toThrow(errorMessage);
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/field-schema/');
    });
  });
}); 