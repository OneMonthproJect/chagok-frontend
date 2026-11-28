import { holidaysOn, type Holiday } from '@/shared/lib/holidays'
import { weekdayIndex } from './dates'

// 캘린더 날짜의 요일·공휴일 표시 클래스 (#110 9절). 월·주 캘린더가 같이 쓴다.
// 일요일 'is-sunday' · 토요일 'is-saturday' · 공휴일 'is-holiday'(요일과 함께 붙고, CSS에서 공휴일 색이 우선한다).
// 표시용일 뿐 예약 가능 여부와 무관하다.
export function dayToneClasses(date: string, holidays: Holiday[] = holidaysOn(date)): string[] {
  const classes: string[] = []
  const weekday = weekdayIndex(date)
  if (weekday === 0) classes.push('is-sunday')
  if (weekday === 6) classes.push('is-saturday')
  if (holidays.length > 0) classes.push('is-holiday')
  return classes
}
