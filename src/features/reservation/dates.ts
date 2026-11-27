// 예약 화면의 날짜 계산·표시 (S-02 날짜 이동). 오늘은 항상 서울 날짜(08 0.1, 앱과 서버가 같은 기준). 순수 함수.

const SEOUL = 'Asia/Seoul'
/** 요일 글자 (일요일 시작, 월 캘린더 머리줄) */
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 서울 기준 오늘 YYYY-MM-DD · 날짜 형식 검사 — 한 곳(shared/lib/date)의 것을 그대로 내보낸다(#23). 기존 호출부는 고치지 않는다 */
export { isValidDate, todaySeoul } from '@/shared/lib/date'

/** 서울 기준 지금 "YYYY-MM-DDTHH:mm:ss" (오프셋 없는 08 일시와 비교용) */
export function nowSeoul(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

/** 날짜에 일수를 더한다 (달·해 넘김 포함, 시간대 영향 없음) */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}

function weekday(date: string): string {
  return WEEKDAYS[weekdayIndex(date)]
}

/** "11월 24일 (화)" */
export function formatDayLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}월 ${d}일 (${weekday(date)})`
}

/** "2026년 11월 24일 (화)" */
export function formatFullDate(date: string): string {
  return `${Number(date.slice(0, 4))}년 ${formatDayLabel(date)}`
}

/** "2026-11-24T10:00:00" → "10:00" (일시 문자열을 바꾸지 않고 자른다, 08 0.1) */
export function formatTime(dateTime: string): string {
  return dateTime.slice(11, 16)
}

// ---- 월 캘린더 (F-RSV-05, #30). 날짜 문자열만 다룬다 — 시각(Date)으로 칸을 정하지 않는다(08 0.1, #30 시간대 확인) ----

/** 달력 한 장의 칸 수: 6주 × 7일 = 42 (08 15·42의 최대 조회 기간과 같다) */
export const MONTH_GRID_DAYS = 42

/** 그 날짜가 속한 달의 1일 "YYYY-MM-01" */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

/** 그 날짜가 속한 달에서 months 달 옮긴 달의 1일 (해 넘김 포함) */
export function shiftMonth(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number)
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
}

/** 일요일 0 ~ 토요일 6 */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * 그 날짜가 속한 달의 달력 칸 42개(일요일 시작, 앞뒤 달 날짜 포함)와 조회 기간.
 * from = 첫 칸, to = 마지막 칸 — 15·42의 최대 42일을 넘지 않는다.
 */
export function monthGrid(date: string): { month: string; days: string[]; from: string; to: string } {
  const first = monthStart(date)
  const from = addDays(first, -weekdayIndex(first))
  const days = Array.from({ length: MONTH_GRID_DAYS }, (_, i) => addDays(from, i))
  return { month: date.slice(0, 7), days, from, to: days[days.length - 1] }
}

/** "2026년 11월" */
export function formatMonthLabel(date: string): string {
  return `${Number(date.slice(0, 4))}년 ${Number(date.slice(5, 7))}월`
}
