import { describe, it, expect, afterEach, vi } from 'vitest'
import { isMarketHours } from './marketHours.js'

// Đồng hồ giả: mọi mốc dưới đây ghi theo UTC, chú thích kèm giờ VN (UTC+7, không DST).
afterEach(() => {
  vi.useRealTimers()
})

function atUtc(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('isMarketHours', () => {
  it('isMarketHours_weekdayMidSession_returnsTrue', () => {
    atUtc('2026-07-29T03:30:00Z') // Wed 10:30 VN
    expect(isMarketHours()).toBe(true)
  })

  it('isMarketHours_weekdayAt0859_returnsFalse', () => {
    atUtc('2026-07-29T01:59:00Z') // Wed 08:59 VN - trước giờ mở cửa 1 phút
    expect(isMarketHours()).toBe(false)
  })

  it('isMarketHours_weekdayAt0900_returnsTrue', () => {
    atUtc('2026-07-29T02:00:00Z') // Wed 09:00 VN - đúng mốc mở cửa (bao gồm)
    expect(isMarketHours()).toBe(true)
  })

  it('isMarketHours_weekdayAt1515_returnsTrue', () => {
    atUtc('2026-07-29T08:15:00Z') // Wed 15:15 VN - đúng mốc đóng cửa (bao gồm)
    expect(isMarketHours()).toBe(true)
  })

  it('isMarketHours_weekdayAt1516_returnsFalse', () => {
    atUtc('2026-07-29T08:16:00Z') // Wed 15:16 VN - sau đóng cửa 1 phút
    expect(isMarketHours()).toBe(false)
  })

  it('isMarketHours_saturdayDuringHours_returnsFalse', () => {
    atUtc('2026-08-01T03:00:00Z') // Sat 10:00 VN
    expect(isMarketHours()).toBe(false)
  })

  it('isMarketHours_sundayDuringHours_returnsFalse', () => {
    atUtc('2026-08-02T03:00:00Z') // Sun 10:00 VN
    expect(isMarketHours()).toBe(false)
  })

  it('isMarketHours_utcSundayNightButVietnamMondayPreOpen_returnsFalse', () => {
    // Bẫy múi giờ: UTC còn là Chủ nhật, VN đã sang Thứ 2 nhưng mới 06:30 - chưa mở cửa.
    atUtc('2026-08-02T23:30:00Z') // Mon 06:30 VN
    expect(isMarketHours()).toBe(false)
  })

  it('isMarketHours_utcMondayEarlyVietnamMonday0930_returnsTrue', () => {
    atUtc('2026-08-03T02:30:00Z') // Mon 09:30 VN
    expect(isMarketHours()).toBe(true)
  })
})
