import { describe, expect, it } from 'vitest'
import { ITEM_ICON_FALLBACK, itemIconKey } from './itemIconKey'

// 항목 아이콘 매핑 (#110 20절): code 우선, 없으면 기본 이름, 모르면 공구
describe('itemIconKey', () => {
  it.each([
    ['ENGINE_OIL', '엔진오일', 'oil'],
    ['AIR_CLEANER', '에어클리너', 'air'],
    ['AC_FILTER', '에어컨필터', 'ac'],
    ['BRAKE_PAD', '브레이크패드', 'brake'],
    ['TIRE', '타이어 상태 점검', 'tire'],
    ['BATTERY', '배터리', 'battery'],
  ])('%s / %s → %s (code로도 이름으로도 같은 아이콘)', (code, name, key) => {
    expect(itemIconKey({ code })).toBe(key)
    expect(itemIconKey({ name })).toBe(key)
  })

  it('code가 이름보다 우선하고, 모르는 항목·빈 값은 공구', () => {
    expect(itemIconKey({ code: 'BATTERY', name: '엔진오일' })).toBe('battery')
    expect(itemIconKey({ name: '와이퍼' })).toBe(ITEM_ICON_FALLBACK)
    expect(itemIconKey({ code: 'UNKNOWN' })).toBe('tool')
    expect(itemIconKey()).toBe('tool')
  })
})
