import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import LicensePlate from '@/shared/ui/LicensePlate.jsx'

// 차량번호판 (#110 2절): 번호는 받은 그대로, 일반형·compact형
describe('LicensePlate', () => {
  it('일반형', () => {
    expect(renderToStaticMarkup(<LicensePlate number="12가3456" />)).toBe('<span class="license-plate">12가3456</span>')
  })
  it('compact형 + 추가 클래스, 긴 번호도 자르지 않는다', () => {
    expect(renderToStaticMarkup(<LicensePlate number="서울12가3456" compact className="x" />)).toBe(
      '<span class="license-plate license-plate--compact x">서울12가3456</span>',
    )
  })
})
