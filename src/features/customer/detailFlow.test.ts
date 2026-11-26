import { describe, expect, it } from 'vitest'
import { consentText, listSearchFrom, mileageText, modelYearText, parseCustomerId, vehicleCountText } from './detailFlow'

// S-06 판단 규칙 (09 S-06, 08 07). 도래·임박 수는 서버 값 그대로라 여기서 계산하는 함수가 없다.

describe('parseCustomerId — 주소 :customerId', () => {
  it('양의 정수만 받는다', () => {
    expect(parseCustomerId('10')).toBe(10)
    expect(parseCustomerId('1')).toBe(1)
  })

  it('그 밖은 null (요청하지 않고 찾을 수 없음)', () => {
    for (const value of [undefined, '', '0', '-1', '1.5', '12abc', 'abc', '010', ' 1', '99999999999999999999']) {
      expect(parseCustomerId(value)).toBeNull()
    }
  })
})

describe('표시 문구', () => {
  it('동의 꼬리표는 글자로 구분한다', () => {
    expect(consentText(true)).toBe('안내 수신 동의')
    expect(consentText(false)).toBe('안내 수신 미동의')
  })

  it('연식·최근 주행거리, 비었으면 null (08 07 nullable)', () => {
    expect(modelYearText(2019)).toBe('2019년식')
    expect(modelYearText(null)).toBeNull()
    expect(mileageText(97000)).toBe('97,000 km')
    expect(mileageText(0)).toBe('0 km')
    expect(mileageText(null)).toBeNull()
  })

  it('차량 건수', () => {
    expect(vehicleCountText(2)).toBe('등록 차량 2대 · 도래·임박은 오늘 기준')
    expect(vehicleCountText(0)).toBe('등록 차량 0대 · 도래·임박은 오늘 기준')
  })
})

describe('listSearchFrom — S-05로 돌아갈 검색', () => {
  it('?로 시작하는 문자열만', () => {
    expect(listSearchFrom({ listSearch: '?q=%EA%B9%80&page=2' })).toBe('?q=%EA%B9%80&page=2')
    expect(listSearchFrom({ listSearch: '' })).toBe('')
    expect(listSearchFrom({ listSearch: '//evil.example' })).toBe('')
    expect(listSearchFrom({ listSearch: 3 })).toBe('')
    expect(listSearchFrom(null)).toBe('')
    expect(listSearchFrom(undefined)).toBe('')
  })
})
