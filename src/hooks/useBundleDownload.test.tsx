import { renderHook, act } from '@testing-library/react'
import axios from 'axios'
import { useBundleDownload } from './useBundleDownload'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('useBundleDownload', () => {
  const productId = 1
  const bundleId = 7
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

  it('downloads bundle ZIP on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: new Blob(['zip']),
      headers: { 'content-disposition': 'attachment; filename="bundle-7.zip"' }
    })
    const { result } = renderHook(() => useBundleDownload(productId, bundleId))
    await act(async () => {
      await result.current.download()
    })
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `/api/products/${productId}/asset-bundles/${bundleId}/download/`,
      { responseType: 'blob' }
    )
    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalled()
  })

  it('retries on error and fails after 3 attempts', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useBundleDownload(productId, bundleId))
    await act(async () => {
      await result.current.download()
    })
    expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    expect(result.current.error).toBe('Failed to download bundle')
  })
}) 