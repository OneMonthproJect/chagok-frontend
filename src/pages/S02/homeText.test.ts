import { describe, expect, it } from 'vitest'
import { emptyDayMessage, listTitle } from './homeText'

// S-02 문구 (09 S-02·5장, chagok-frontend#24)
describe('S-02 문구', () => {
  it('오늘이면 "오늘 예약", 다른 날은 "예약 목록"', () => {
    expect(listTitle('2026-11-24', '2026-11-24')).toBe('오늘 예약')
    expect(listTitle('2026-11-25', '2026-11-24')).toBe('예약 목록')
  })

  it('빈 목록 문구는 날짜에 따라', () => {
    expect(emptyDayMessage('2026-11-24', '2026-11-24')).toBe('오늘 예약이 없습니다.')
    expect(emptyDayMessage('2026-11-20', '2026-11-24')).toBe('이 날 예약이 없습니다.')
  })
})
