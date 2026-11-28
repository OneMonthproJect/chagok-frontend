import { describe, expect, it } from 'vitest'
import data from './holidays.kr.json'
import { coveredHolidayYears, holidaysOn, isHolidayYearCovered, uncoveredHolidayNotice } from './holidays'

// 관공서 공휴일 데이터·조회 (#110 9절). 날짜는 우주항공청 2026·2027 월력요항과 같아야 한다(JSON meta.sources).
describe('holidays', () => {
  it('2027 공휴일 수는 월력요항과 같다: 일요일 52 + 공휴일 24 - 일요일 겹침 4 = 72', () => {
    const in2027 = data.holidays.filter((h) => h.date.startsWith('2027') && h.isHoliday)
    expect(in2027).toHaveLength(24)
    const sundays = in2027.filter((h) => new Date(`${h.date}T00:00:00Z`).getUTCDay() === 0)
    expect(sundays.map((h) => h.name)).toEqual(['설날', '현충일', '광복절', '개천절'])
  })

  it('2026 공휴일(노동절·제헌절 포함) = 일요일 52 + 22 - 일요일 겹침 2 = 72', () => {
    const in2026 = data.holidays.filter((h) => h.date.startsWith('2026') && h.isHoliday)
    expect(in2026).toHaveLength(22)
    const sundays = in2026.filter((h) => new Date(`${h.date}T00:00:00Z`).getUTCDay() === 0)
    expect(sundays.map((h) => h.name)).toEqual(['3·1절', '부처님오신날'])
  })

  it.each([
    ['2026-02-17', '설날'],
    ['2026-09-25', '추석'],
    ['2026-03-02', '대체공휴일(3·1절)'],
    ['2026-06-03', '전국동시지방선거'],
    ['2027-02-09', '대체공휴일(설날)'],
    ['2027-05-03', '대체공휴일(노동절)'],
    ['2027-07-19', '대체공휴일(제헌절)'],
    ['2027-12-27', '대체공휴일(기독탄신일)'],
  ])('%s → %s', (date, name) => {
    expect(holidaysOn(date).map((h) => h.name)).toEqual([name])
  })

  it('평일은 빈 배열, 날짜는 중복 없이 정렬되어 있다', () => {
    expect(holidaysOn('2026-11-24')).toEqual([])
    const dates = data.holidays.map((h) => h.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('데이터가 없는 연도는 "확인하지 않음" — 공휴일 없음으로 단정하지 않고 안내한다', () => {
    expect(coveredHolidayYears()).toEqual([2026, 2027])
    expect(isHolidayYearCovered('2027-12-31')).toBe(true)
    expect(isHolidayYearCovered('2028-01-01')).toBe(false)
    expect(holidaysOn('2028-01-01')).toEqual([])
    expect(uncoveredHolidayNotice(['2027-12-27', '2028-01-02'])).toBe('공휴일은 2026~2027년만 표시합니다. 그 밖의 연도는 공휴일을 확인하지 않았습니다.')
    expect(uncoveredHolidayNotice(['2026-11-01', '2026-12-12'])).toBeNull()
  })

  it('메타데이터에 출처 URL·조회일·갱신 방법이 있다', () => {
    expect(data.meta.retrievedAt).toBe('2026-11-28')
    expect(data.meta.timezone).toBe('Asia/Seoul')
    expect(data.meta.sources.every((s) => s.url.startsWith('https://'))).toBe(true)
    expect(data.meta.updateProcedure.length).toBeGreaterThan(0)
  })
})
