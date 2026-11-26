// 서울 기준 날짜 (08 0.1: API의 날짜·일시는 Asia/Seoul, 시간대 표기 없음). 순수 함수.
// 브라우저 시간대(UTC·America/Los_Angeles 등)와 관계없이 앱과 서버가 같은 "오늘"을 쓴다.
// 날짜 계산은 화면마다 만들지 않고 여기 한 곳에 둔다(chagok-frontend#23 시간대 확인).
// 날짜 값은 "YYYY-MM-DD" 문자열 그대로 주고받는다 — new Date(...)·toISOString()으로 바꾸지 않는다(하루 어긋남 방지).

const SEOUL = 'Asia/Seoul'

/** 서울 기준 오늘 YYYY-MM-DD */
export function todaySeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** 'YYYY-MM-DD' 이고 실제 있는 날짜인지 (2026-02-30 거부) */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}
