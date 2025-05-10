jest.mock('@/lib/axiosInstance', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      post: jest.fn().mockResolvedValue({ data: { id: 99 } }),
    },
  };
});

import axiosInstance from '@/lib/axiosInstance';
import { productService, AddPricePayload } from '@/services/productService';

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe('productService.addPrice', () => {
  it('sends payload without read-only "channel" property', async () => {
    const payload: AddPricePayload = {
      price_type: 'list',
      currency: 'USD',
      amount: 12.34,
      valid_from: '2025-05-10',
      channel_id: null,
      valid_to: null,
    };

    await productService.addPrice(123, payload);

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/products/123/prices/', payload);
    // Ensure "channel" is NOT sent
    const sentPayload = (mockedAxios.post.mock.calls[0] as any[])[1];
    expect(sentPayload).not.toHaveProperty('channel');
  });
}); 