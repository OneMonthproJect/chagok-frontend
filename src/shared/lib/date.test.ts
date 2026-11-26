import { describe, expect, it } from 'vitest'
import { todaySeoul } from './date'

// 08 0.1 날짜는 Asia/Seoul. 브라우저 시간대가 달라도 같은 날짜여야 한다(#23 시간대 확인).
describe('todaySeoul', () => {
  it('UTC 15:00 이후는 서울에서 다음 날', () => {
    expect(todaySeoul(new Date('2026-11-23T14:59:59Z'))).toBe('2026-11-23')
    expect(todaySeoul(new Date('2026-11-23T15:00:00Z'))).toBe('2026-11-24')
  })

  it('해 넘김도 서울 기준', () => {
    expect(todaySeoul(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
  })

  it('YYYY-MM-DD 형식(한 자리 월·일도 0을 채움)', () => {
    expect(todaySeoul(new Date('2026-03-04T00:00:00Z'))).toBe('2026-03-04')
  })
})
