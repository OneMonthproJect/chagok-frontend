import { describe, expect, it } from 'vitest'
import { dayToneClasses } from './dayTone'

// 캘린더 요일·공휴일 표시 (#110 9절)
describe('dayToneClasses', () => {
  it('평일은 없음, 일요일·토요일', () => {
    expect(dayToneClasses('2026-11-24')).toEqual([])
    expect(dayToneClasses('2026-11-29')).toEqual(['is-sunday'])
    expect(dayToneClasses('2026-11-28')).toEqual(['is-saturday'])
  })

  it('평일 공휴일, 토요일과 겹친 공휴일(공휴일 색 우선은 CSS 순서), 일요일 공휴일', () => {
    expect(dayToneClasses('2026-02-17')).toEqual(['is-holiday'])
    expect(dayToneClasses('2026-06-06')).toEqual(['is-saturday', 'is-holiday'])
    expect(dayToneClasses('2026-03-01')).toEqual(['is-sunday', 'is-holiday'])
  })

  it('데이터가 없는 연도는 요일만 표시한다(공휴일로 단정하지 않음)', () => {
    expect(dayToneClasses('2028-01-01')).toEqual(['is-saturday'])
  })
})
