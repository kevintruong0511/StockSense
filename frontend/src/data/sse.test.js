import { describe, it, expect, vi } from 'vitest'
import { streamSSE } from './sse.js'

// Stream giả: phát lần lượt các chunk (chuỗi) rồi đóng.
function bodyOf(chunks, { onCancel } = {}) {
  const enc = new TextEncoder()
  let i = 0
  return {
    getReader: () => ({
      read: async () => (i < chunks.length ? { value: enc.encode(chunks[i++]), done: false } : { done: true }),
      cancel: onCancel,
    }),
  }
}

function streamResponds(chunks) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body: bodyOf(chunks) }))
}

// streamSSE chạy nền (IIFE async) - nhường vài microtask cho nó đọc xong.
const settle = () => new Promise((r) => setTimeout(r, 0))

const frame = (obj) => `data: ${JSON.stringify(obj)}\n\n`

describe('streamSSE - đọc khung sự kiện', () => {
  it('streamSSE_eventSplitAcrossChunks_emitsOnceReassembled', async () => {
    // Khung bị cắt giữa chừng JSON - phải ghép lại rồi mới parse.
    streamResponds(['data: {"token":"xin ', 'chào"}\n\n'])
    const onEvent = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onEvent })
    await settle()

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent).toHaveBeenCalledWith({ token: 'xin chào' })
  })

  it('streamSSE_onEventReturnsTrue_stopsReadingRemainingFrames', async () => {
    streamResponds([frame({ n: 1 }) + frame({ n: 2 }) + frame({ n: 3 })])
    const onEvent = vi.fn().mockReturnValue(true)

    streamSSE({ path: '/ai/analyze', body: {}, onEvent })
    await settle()

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent).toHaveBeenCalledWith({ n: 1 })
  })

  it('streamSSE_malformedJsonFrame_isSkippedAndStreamContinues', async () => {
    streamResponds(['data: {khong-phai-json\n\n' + frame({ token: 'ok' })])
    const onEvent = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onEvent })
    await settle()

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent).toHaveBeenCalledWith({ token: 'ok' })
  })

  it('streamSSE_naturalEndWithoutDoneEvent_callsOnEnd', async () => {
    streamResponds([frame({ token: 'a' })])
    const onEnd = vi.fn()
    const onError = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onEvent: () => false, onEnd, onError })
    await settle()

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('streamSSE - đường lỗi', () => {
  it('streamSSE_preStreamErrorWithCode_passesStatusAndCodeToOnError', async () => {
    // Hết lượt theo gói → backend trả 429 kèm code để FE hiện nút nâng cấp.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      body: null,
      json: () => Promise.resolve({ error: 'Bạn đã hết lượt phân tích hôm nay.', code: 'quota_exceeded' }),
    }))
    const onError = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onError })
    await settle()

    expect(onError).toHaveBeenCalledWith(
      'Bạn đã hết lượt phân tích hôm nay.',
      { status: 429, code: 'quota_exceeded' },
    )
  })

  it('streamSSE_preStreamErrorNonJson_usesDefaultHttpMessage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      body: null,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    }))
    const onError = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onError })
    await settle()

    expect(onError).toHaveBeenCalledWith('Có lỗi xảy ra (HTTP 502).', { status: 502, code: null })
  })

  it('streamSSE_fetchThrows_callsOnErrorWithConnectionMessage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const onError = vi.fn()

    streamSSE({ path: '/ai/analyze', body: {}, onError })
    await settle()

    expect(onError).toHaveBeenCalledWith('Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.')
  })

  it('streamSSE_abortedMidStream_doesNotReportAsError', async () => {
    // Người dùng rời màn / bấm dừng - không được hiện thông báo lỗi đỏ.
    let abortSignal
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      abortSignal = opts.signal
      return Promise.resolve({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: () => new Promise((_res, rej) => {
              abortSignal.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')))
            }),
          }),
        },
      })
    }))
    const onError = vi.fn()

    const abort = streamSSE({ path: '/ai/analyze', body: {}, onError })
    await settle()
    abort()
    await settle()

    expect(onError).not.toHaveBeenCalled()
  })
})
