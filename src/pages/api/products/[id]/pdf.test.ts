import { createMocks } from 'node-mocks-http';
import handler from './pdf';
import puppeteer from 'puppeteer';
import { getProductById } from '@/lib/services/productService';

// Mock dependencies
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

jest.mock('@/lib/services/productService', () => ({
  getProductById: jest.fn(),
}));

describe('PDF Generation API', () => {
  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    sku: 'TEST123',
    price: 99.99,
    status: 'active',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
  };
  
  const mockPdfBuffer = Buffer.from('PDF content');
  
  // Mock Puppeteer objects
  const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    addStyleTag: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(mockPdfBuffer),
  };
  
  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getProductById as jest.Mock).mockResolvedValue(mockProduct);
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });
  
  it('returns 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'product-123' },
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Method not allowed' });
  });
  
  it('returns 400 for invalid product ID', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: '' },
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Invalid product ID' });
  });
  
  it('returns 404 when product is not found', async () => {
    (getProductById as jest.Mock).mockResolvedValue(null);
    
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'non-existent-product' },
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Product not found' });
  });
  
  it('generates and returns PDF successfully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'product-123' },
    });
    
    await handler(req, res);
    
    // Check product service was called
    expect(getProductById).toHaveBeenCalledWith('product-123');
    
    // Check Puppeteer was used correctly
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalled();
    expect(mockPage.addStyleTag).toHaveBeenCalled();
    expect(mockPage.pdf).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
    
    // Check response headers and content
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()).toMatchObject({
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="product-TEST123.pdf"',
    });
    
    // Check PDF content
    expect(res._getData()).toEqual(mockPdfBuffer);
  });
  
  it('handles PDF generation errors', async () => {
    const mockError = new Error('PDF generation failed');
    mockPage.pdf.mockRejectedValue(mockError);
    
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'product-123' },
    });
    
    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await handler(req, res);
    
    // Check error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Check response
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Failed to generate PDF' });
    
    // Verify browser was closed (cleanup)
    expect(mockBrowser.close).toHaveBeenCalled();
  });
}); 