import { describe, it, expect } from 'vitest'
import { parseShares, parsePriceToVnd, sanitizeNumInput } from './parse.js'

describe('parseShares', () => {
  it.each([
    ['dấu chấm phân cách nghìn', '1.000', 1000],
    ['số trần không phân cách', '1500', 1500],
    ['nhiều nhóm nghìn', '1.234.567', 1234567],
    ['có khoảng trắng xen giữa', ' 1 000 ', 1000],
    ['dấu phẩy là thập phân', '1,5', 1.5],
  ])('parseShares_%s_parsesToNumber', (_name, input, expected) => {
    expect(parseShares(input), `input=${JSON.stringify(input)}`).toBe(expected)
  })

  it.each([
    ['chuỗi rỗng', ''],
    ['toàn khoảng trắng', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('parseShares_%s_returnsNaN', (_name, input) => {
    expect(parseShares(input), `input=${JSON.stringify(input)}`).toBeNaN()
  })

  it.each([
    ['chữ cái', 'abc'],
    ['lẫn chữ vào số', '12a'],
    ['chỉ có dấu phẩy', ','],
    ['số âm', '-5'],
  ])('parseShares_%s_returnsNaN', (_name, input) => {
    expect(parseShares(input), `input=${JSON.stringify(input)}`).toBeNaN()
  })
})

describe('parsePriceToVnd', () => {
  it.each([
    ['phẩy thập phân', '71,25', 71250],
    ['chấm cũng là thập phân', '71.25', 71250],
    ['giá lẻ nửa nghìn', '58,50', 58500],
    ['số nguyên nghìn đồng', '10', 10000],
  ])('parsePriceToVnd_%s_multipliesBy1000', (_name, input, expected) => {
    expect(parsePriceToVnd(input), `input=${JSON.stringify(input)}`).toBe(expected)
  })

  it('parsePriceToVnd_fractionalDong_roundsToWholeDong', () => {
    // 71,2555 nghìn = 71255,5đ → làm tròn lên 71256đ (không để lẻ xu).
    expect(parsePriceToVnd('71,2555')).toBe(71256)
  })

  it.each([
    ['chuỗi rỗng', ''],
    ['chữ cái', 'abc'],
    ['hai dấu thập phân', '1.2.3'],
    ['null', null],
  ])('parsePriceToVnd_%s_returnsNaN', (_name, input) => {
    expect(parsePriceToVnd(input), `input=${JSON.stringify(input)}`).toBeNaN()
  })
})

describe('sanitizeNumInput', () => {
  it('sanitizeNumInput_mixedChars_keepsDigitsAndSeparators', () => {
    expect(sanitizeNumInput('1a2.b3,4đ')).toBe('12.3,4')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('sanitizeNumInput_%s_returnsEmptyString', (_name, input) => {
    expect(sanitizeNumInput(input), `input=${JSON.stringify(input)}`).toBe('')
  })
})
