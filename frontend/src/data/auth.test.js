import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api, setToken } from './auth.js'

beforeEach(() => {
  localStorage.clear()
})

// Phản hồi giả tối thiểu, đủ cho api(): ok/status + json().
function respond({ ok = true, status = 200, json = () => Promise.resolve({}) } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function headersOf(fetchMock) {
  return fetchMock.mock.calls[0][1].headers
}

describe('api - đính kèm token', () => {
  it('api_authTrueWithToken_sendsBearerHeader', async () => {
    setToken('tok-123')
    const fetchMock = respond({ json: () => Promise.resolve({ ok: true }) })

    await api('/auth/me', { auth: true })

    expect(headersOf(fetchMock).Authorization).toBe('Bearer tok-123')
  })

  it('api_authFalse_omitsAuthorizationHeader', async () => {
    setToken('tok-123')
    const fetchMock = respond()

    await api('/market/overview')

    expect(headersOf(fetchMock)).not.toHaveProperty('Authorization')
  })

  it('api_authTrueWithoutToken_omitsAuthorizationHeader', async () => {
    const fetchMock = respond()

    await api('/auth/me', { auth: true })

    expect(headersOf(fetchMock)).not.toHaveProperty('Authorization')
  })

  it('api_getRequest_sendsNoBody', async () => {
    const fetchMock = respond()

    await api('/auth/me')

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })
})

describe('api - đường thành công', () => {
  it('api_okResponse_returnsParsedBody', async () => {
    respond({ json: () => Promise.resolve({ user: { id: 1 } }) })

    await expect(api('/auth/me')).resolves.toEqual({ user: { id: 1 } })
  })
})

describe('api - đường lỗi', () => {
  it('api_networkFailure_throwsConnectionMessage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api('/auth/me')).rejects.toThrow('Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.')
  })

  it('api_status429_throwsRateLimitMessage', async () => {
    respond({ ok: false, status: 429, json: () => Promise.resolve({}) })

    await expect(api('/auth/login')).rejects.toThrow('Bạn thao tác quá nhanh, vui lòng thử lại sau giây lát.')
  })

  it('api_status429_attachesStatusToError', async () => {
    respond({ ok: false, status: 429, json: () => Promise.resolve({}) })

    // Nơi gọi cần `status` để phân biệt 401 (hết phiên) với lỗi tạm thời.
    await expect(api('/auth/login')).rejects.toMatchObject({ status: 429 })
  })

  it('api_status500_throwsServerErrorMessage', async () => {
    respond({ ok: false, status: 500, json: () => Promise.resolve({}) })

    await expect(api('/auth/me')).rejects.toThrow('Lỗi máy chủ (HTTP 500), vui lòng thử lại sau.')
  })

  it('api_status404_throwsApiConfigMessage', async () => {
    respond({ ok: false, status: 404, json: () => Promise.resolve({}) })

    await expect(api('/auth/me')).rejects.toThrow('Không tìm thấy dịch vụ máy chủ (HTTP 404). Kiểm tra cấu hình API.')
  })

  it('api_status400WithoutServerMessage_throwsGenericMessage', async () => {
    respond({ ok: false, status: 400, json: () => Promise.resolve({}) })

    await expect(api('/auth/register')).rejects.toThrow('Có lỗi xảy ra (HTTP 400), vui lòng thử lại.')
  })

  it('api_serverErrorBody_prefersServerMessageOverFallback', async () => {
    respond({ ok: false, status: 400, json: () => Promise.resolve({ error: 'Email đã tồn tại' }) })

    await expect(api('/auth/register')).rejects.toThrow('Email đã tồn tại')
  })

  it('api_nonJsonErrorBody_usesFallbackMessage', async () => {
    // Trang lỗi HTML từ proxy → res.json() ném lỗi, phải rơi về message theo mã HTTP.
    respond({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('Unexpected token <')) })

    await expect(api('/auth/me')).rejects.toThrow('Lỗi máy chủ (HTTP 502), vui lòng thử lại sau.')
  })
})
