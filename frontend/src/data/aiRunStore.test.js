import { describe, it, expect, afterEach, vi } from 'vitest'
import { patchRun, getRun, resetAllRuns } from './aiRunStore.js'

// Store sống ở cấp module - dọn sau mỗi test để không rò trạng thái sang test kế.
afterEach(() => {
  resetAllRuns()
})

describe('patchRun', () => {
  it('patchRun_objectPatch_shallowMergesIntoExistingState', () => {
    patchRun('k', { text: 'a', analyzing: true })

    patchRun('k', { analyzing: false })

    expect(getRun('k')).toEqual({ text: 'a', analyzing: false })
  })

  it('patchRun_updaterFunction_receivesCurrentState', () => {
    patchRun('k', { text: 'xin ' })

    patchRun('k', (cur) => ({ ...cur, text: cur.text + 'chào' }))

    expect(getRun('k').text).toBe('xin chào')
  })
})

describe('resetAllRuns', () => {
  it('resetAllRuns_runsWithAbort_callsEveryAbort', () => {
    const abortA = vi.fn()
    const abortB = vi.fn()
    patchRun('a', { abort: abortA })
    patchRun('b', { abort: abortB })

    resetAllRuns()

    expect(abortA).toHaveBeenCalledTimes(1)
    expect(abortB).toHaveBeenCalledTimes(1)
  })

  it('resetAllRuns_afterClear_getRunReturnsUndefined', () => {
    patchRun('a', { text: 'phân tích của người dùng cũ' })

    resetAllRuns()

    expect(getRun('a')).toBeUndefined()
  })

  it('resetAllRuns_abortThrows_stillClearsStore', () => {
    // Bảo mật: đăng xuất mà abort lỗi thì vẫn PHẢI xoá sạch, không để lộ
    // phân tích của người dùng trước sang người dùng sau.
    patchRun('a', { abort: () => { throw new Error('abort lỗi') } })
    patchRun('b', { text: 'dữ liệu riêng tư' })

    resetAllRuns()

    expect(getRun('b')).toBeUndefined()
  })
})
