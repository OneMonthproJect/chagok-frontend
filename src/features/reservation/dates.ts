// 예약 화면의 날짜 계산·표시 (S-02 날짜 이동). 오늘은 항상 서울 날짜(08 0.1, 앱과 서버가 같은 기준). 순수 함수.

const SEOUL = 'Asia/Seoul'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 서울 기준 오늘 YYYY-MM-DD */
export function todaySeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** 서울 기준 지금 "YYYY-MM-DDTHH:mm:ss" (오프셋 없는 08 일시와 비교용) */
export function nowSeoul(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

/** 'YYYY-MM-DD' 이고 실제 있는 날짜인지 (2026-02-30 거부) */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** 날짜에 일수를 더한다 (달·해 넘김 포함, 시간대 영향 없음) */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}

function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
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
