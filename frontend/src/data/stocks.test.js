import { describe, it, expect } from 'vitest'
import {
  STOCKS, formatVND, upDown, pctStr, chgStr, decimal,
  tickerBadge, candles, sliceByTf, aiSource,
} from './stocks.js'

describe('formatVND', () => {
  it.each([
    ['không', 0, '0'],
    ['nghìn tròn', 1000, '1,000'],
    ['số lớn', 1234567, '1,234,567'],
    ['số âm', -350, '-350'],
  ])('formatVND_%s_usesEnUsCommas', (_name, input, expected) => {
    expect(formatVND(input), `input=${input}`).toBe(expected)
  })
})

describe('upDown', () => {
  it('upDown_zero_returnsGreen', () => {
    // Mốc 0 tính là tăng (>=0) theo quy ước bảng giá.
    expect(upDown(0)).toBe('#16A34A')
  })

  it('upDown_negative_returnsRed', () => {
    expect(upDown(-0.01)).toBe('#DC2626')
  })
})

describe('pctStr', () => {
  it('pctStr_positive_prefixesPlus', () => {
    expect(pctStr(2.31)).toBe('+2.31%')
  })

  it('pctStr_zero_prefixesPlus', () => {
    expect(pctStr(0)).toBe('+0.00%')
  })

  it('pctStr_negative_keepsMinusOnly', () => {
    expect(pctStr(-1.2)).toBe('-1.20%')
  })

  it('pctStr_decimalSeparatorIsDotNotComma', () => {
    // Quy ước hiển thị số của dự án: thập phân = dấu chấm (en-US).
    expect(pctStr(1.5)).not.toContain(',')
    expect(pctStr(1.5)).toContain('.')
  })
})

describe('chgStr', () => {
  it('chgStr_positive_prefixesPlusWithCommas', () => {
    expect(chgStr(3100)).toBe('+3,100')
  })

  it('chgStr_negative_hasSingleMinusSign', () => {
    expect(chgStr(-350)).toBe('-350')
  })
})

describe('decimal', () => {
  it.each([
    ['làm tròn lên', 2.35, '2.4'],
    ['số nguyên vẫn có 1 chữ số lẻ', 2, '2.0'],
  ])('decimal_%s_returnsOnePlace', (_name, input, expected) => {
    expect(decimal(input), `input=${input}`).toBe(expected)
  })
})

describe('tickerBadge', () => {
  it('tickerBadge_knownTicker_returnsStockOwnColors', () => {
    expect(tickerBadge('FPT')).toEqual({ bg: STOCKS.FPT.logoBg, fg: STOCKS.FPT.logoFg })
  })

  it('tickerBadge_unknownTicker_isStableAcrossCalls', () => {
    // Màu sinh theo hash mã - phải ổn định để UI không nhấp nháy đổi màu giữa các lần render.
    expect(tickerBadge('XYZ')).toEqual(tickerBadge('XYZ'))
  })

  it('tickerBadge_unknownTicker_returnsHexColorPair', () => {
    const badge = tickerBadge('XYZ')
    expect(badge.bg).toMatch(/^#[0-9A-F]{6}$/i)
    expect(badge.fg).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('tickerBadge_nullCode_returnsValidColorPairWithoutThrowing', () => {
    const badge = tickerBadge(null)
    expect(badge.bg).toMatch(/^#[0-9A-F]{6}$/i)
    expect(badge.fg).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe('candles', () => {
  it('candles_sameTicker_producesIdenticalSeries', () => {
    // Sinh có seed theo mã - hai lần gọi phải ra y hệt, nếu không biểu đồ sẽ nhảy mỗi lần render.
    expect(candles('FPT').candles).toEqual(candles('FPT').candles)
  })

  it('candles_generatedSeries_excludesWeekends', () => {
    const weekendBars = candles('FPT').candles.filter((c) => {
      const day = new Date(c.time + 'T00:00:00Z').getUTCDay()
      return day === 0 || day === 6
    })
    expect(weekendBars, 'không được có nến vào Thứ 7 / Chủ nhật').toEqual([])
  })

  it('candles_lastClose_matchesListedPriceInThousands', () => {
    const { candles: bars } = candles('FPT')
    // FPT niêm yết 137500đ → chuỗi được scale để đóng cửa cuối ~137.5 (đơn vị nghìn).
    expect(bars[bars.length - 1].close).toBeCloseTo(137.5, 1)
  })

  it('candles_unknownTicker_fallsBackToFptPriceLevel', () => {
    const { candles: bars } = candles('ZZZ')
    expect(bars[bars.length - 1].close).toBeCloseTo(137.5, 1)
  })

  it('candles_everyBar_hasHighAtOrAboveLow', () => {
    const broken = candles('HPG').candles.filter((c) => c.high < c.low)
    expect(broken, 'mọi nến phải có high >= low').toEqual([])
  })

  it('candles_volumes_alignOneToOneWithCandleTimes', () => {
    const { candles: bars, vols } = candles('VNM')
    expect(vols).toHaveLength(bars.length)
    expect(vols.map((v) => v.time)).toEqual(bars.map((c) => c.time))
  })
})

describe('sliceByTf', () => {
  const long = Array.from({ length: 500 }, (_, i) => i)

  it.each([
    ['1D', '1D', 6],
    ['1W', '1W', 12],
    ['1M', '1M', 26],
  ])('sliceByTf_timeframe%s_returnsMappedLength', (_name, tf, expected) => {
    expect(sliceByTf(long, tf), `tf=${tf}`).toHaveLength(expected)
  })

  it('sliceByTf_unknownTimeframe_defaultsTo22', () => {
    expect(sliceByTf(long, '3M')).toHaveLength(22)
  })

  it('sliceByTf_arrayShorterThanWindow_returnsWholeArray', () => {
    expect(sliceByTf([1, 2, 3], '1M')).toEqual([1, 2, 3])
  })

  it('sliceByTf_returnsTailNotHead', () => {
    // Biểu đồ cần phiên GẦN NHẤT, nên phải cắt phần đuôi.
    expect(sliceByTf(long, '1D')).toEqual([494, 495, 496, 497, 498, 499])
  })
})

describe('aiSource', () => {
  it('aiSource_unknownTicker_fallsBackToFptText', () => {
    expect(aiSource('ZZZ')).toBe(aiSource('FPT'))
  })
})
