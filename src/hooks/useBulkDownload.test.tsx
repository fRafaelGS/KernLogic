import { renderHook, act } from '@testing-library/react'
import axios from 'axios'
import { useBulkDownload } from './useBulkDownload'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('useBulkDownload', () => {
  const productId = 1
  const assetIds = [2, 3, 4]
  let createObjectURLSpy: jest.SpyInstance
  let revokeObjectURLSpy: jest.SpyInstance
  let appendChildSpy: jest.SpyInstance
  let removeChildSpy: jest.SpyInstance
  let clickMock: jest.Mock

  beforeEach(() => {
    createObjectURLSpy = jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url')
    revokeObjectURLSpy = jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
    clickMock = jest.fn()
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(node => node)
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(node => node)
    jest.spyOn(document, 'createElement').mockReturnValue({ click: clickMock, setAttribute: jest.fn() } as any)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('downloads ZIP on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: new Blob(['zip']),
      headers: { 'content-disposition': 'attachment; filename="assets-bulk.zip"' }
    })
    const { result } = renderHook(() => useBulkDownload(productId, assetIds))
    await act(async () => {
      await result.current.download()
    })
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `/api/products/${productId}/assets/bulk-download/`,
      { assetIds },
      { responseType: 'blob' }
    )
    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalled()
  })

  it('retries on error and fails after 3 attempts', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useBulkDownload(productId, assetIds))
    await act(async () => {
      await result.current.download()
    })
    expect(mockedAxios.post).toHaveBeenCalledTimes(3)
    expect(result.current.error).toBe('Failed to download assets')
  })
}) 