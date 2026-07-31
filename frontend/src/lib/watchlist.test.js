import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadWatch, saveWatch, WATCH_DEFAULT, WATCH_KEY } from './watchlist.js'

beforeEach(() => {
  localStorage.clear()
})

describe('loadWatch', () => {
  it('loadWatch_noStoredValue_returnsVn30Default', () => {
    expect(loadWatch()).toEqual(WATCH_DEFAULT)
  })

  it('loadWatch_storedLowercase_returnsUppercased', () => {
    localStorage.setItem(WATCH_KEY, JSON.stringify(['fpt', 'hpg']))
    expect(loadWatch()).toEqual(['FPT', 'HPG'])
  })

  it('loadWatch_storedEmptyArray_returnsDefault', () => {
    localStorage.setItem(WATCH_KEY, JSON.stringify([]))
    expect(loadWatch()).toEqual(WATCH_DEFAULT)
  })

  it('loadWatch_corruptedJson_returnsDefaultWithoutThrowing', () => {
    localStorage.setItem(WATCH_KEY, '{oops')
    expect(loadWatch()).toEqual(WATCH_DEFAULT)
  })

  it('loadWatch_storedNonArray_returnsDefault', () => {
    localStorage.setItem(WATCH_KEY, JSON.stringify('FPT'))
    expect(loadWatch()).toEqual(WATCH_DEFAULT)
  })
})

describe('saveWatch', () => {
  it('saveWatch_storageThrows_doesNotPropagateError', () => {
    // Trình duyệt hết quota / chặn storage - lưu hụt thì thôi, không được làm sập UI.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveWatch(['FPT'])).not.toThrow()
  })
})
