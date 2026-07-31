import { describe, it, expect } from 'vitest'
import { priceColor, volShort, ratioStr, ratioStyle } from './priceFormat.js'

describe('priceColor', () => {
  it('priceColor_nullPrice_returnsMutedGrey', () => {
    expect(priceColor({ price: null, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#94A3B8')
  })

  it('priceColor_atCeiling_returnsCeilingPurple', () => {
    expect(priceColor({ price: 107, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#8B5CF6')
  })

  it('priceColor_atFloor_returnsFloorCyan', () => {
    expect(priceColor({ price: 93, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#06B6D4')
  })

  it('priceColor_aboveRefWithinBands_returnsUpGreen', () => {
    expect(priceColor({ price: 103, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#16A34A')
  })

  it('priceColor_belowRefWithinBands_returnsDownRed', () => {
    expect(priceColor({ price: 97, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#DC2626')
  })

  it('priceColor_equalsRef_returnsRefYellow', () => {
    expect(priceColor({ price: 100, ref: 100, ceiling: 107, floorPrice: 93 })).toBe('#CA8A04')
  })

  it('priceColor_atCeilingAndAboveRef_ceilingTakesPrecedenceOverUp', () => {
    // Cùng lúc thoả "trần" và "tăng" - phải ra tím (trần), không phải lá (tăng).
    expect(priceColor({ price: 107, ref: 100, ceiling: 107 })).toBe('#8B5CF6')
  })

  it('priceColor_noRefOrBands_returnsRefYellow', () => {
    expect(priceColor({ price: 100 })).toBe('#CA8A04')
  })
})

describe('volShort', () => {
  it.each([
    ['null', null, '—'],
    ['không', 0, '0'],
    ['dưới nghìn', 999, '999'],
    ['đúng mốc nghìn', 1000, '1K'],
    ['chục nghìn', 12345, '12K'],
    ['đúng mốc triệu', 1000000, '1.00tr'],
    ['vài triệu', 4120000, '4.12tr'],
  ])('volShort_%s_formatsWithUnit', (_name, input, expected) => {
    expect(volShort(input), `input=${input}`).toBe(expected)
  })
})

describe('ratioStyle', () => {
  it('ratioStyle_nullRatio_returnsMutedTransparent', () => {
    // Chưa có TB20 phiên - không tô nền.
    expect(ratioStyle(null)).toEqual({ color: '#94A3B8', background: 'transparent' })
  })

  it('ratioStyle_atLeast2x_returnsStrongGreen', () => {
    expect(ratioStyle(2).color).toBe('#15803D')
    expect(ratioStyle(3.5).color).toBe('#15803D')
  })

  it('ratioStyle_between1And2_returnsUpGreen', () => {
    expect(ratioStyle(1).color).toBe('#16A34A')
    expect(ratioStyle(1.99).color).toBe('#16A34A')
  })

  it('ratioStyle_below1_returnsMutedTransparent', () => {
    expect(ratioStyle(0.99)).toEqual({ color: '#94A3B8', background: 'transparent' })
  })
})

describe('ratioStr', () => {
  it('ratioStr_nullRatio_returnsDash', () => {
    expect(ratioStr(null)).toBe('—')
  })

  it('ratioStr_number_formatsWithTwoDecimalsAndTimesSign', () => {
    expect(ratioStr(1.5)).toBe('1.50×')
  })
})
