import data from './holidays.kr.json'

// 대한민국 관공서 공휴일 조회 (UI·UX 통합 개선 9절, chagok-frontend#110).
// - 데이터는 holidays.kr.json 한 곳(공식 출처·조회일·적용 연도·갱신 방법은 그 파일 meta). 컴포넌트에 날짜를 적지 않는다.
// - 표시용이다. 정비소 영업일·휴무와 따로이고, 공휴일이라고 예약을 막지 않는다(지시서 9.6).
// - 날짜는 서울 기준 'YYYY-MM-DD' 문자열로만 비교한다(시간대 변환 없음, 08 0.1).
// - 데이터에 없는 연도는 "공휴일 없음"이 아니라 "확인하지 않음"이다(isHolidayYearCovered). 화면은 평일로 단정하지 않는다.
// - 나중에 서버(특일 정보 API)로 바꿀 때는 이 파일의 함수 모양만 유지하면 화면은 그대로 둔다.

export type HolidayKind = '공휴일' | '대체공휴일' | '임시공휴일' | '선거일'

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string // 공식 명칭
  kind: HolidayKind
  isHoliday: boolean
}

const HOLIDAYS = (data.holidays as Holiday[]).filter((h) => h.isHoliday)
const COVERED_YEARS = new Set<number>(data.meta.coveredYears)

const BY_DATE = new Map<string, Holiday[]>()
for (const holiday of HOLIDAYS) {
  const list = BY_DATE.get(holiday.date) ?? []
  list.push(holiday)
  BY_DATE.set(holiday.date, list)
}

/** 그 날짜의 공휴일들(같은 날 여러 개면 모두). 없으면 빈 배열 — 확인하지 않은 연도도 빈 배열이므로 isHolidayYearCovered로 구분한다 */
export function holidaysOn(date: string): Holiday[] {
  return BY_DATE.get(date) ?? []
}

/** 그 날짜가 속한 연도의 공휴일 데이터를 확인했는지 */
export function isHolidayYearCovered(date: string): boolean {
  return COVERED_YEARS.has(Number(date.slice(0, 4)))
}

/** 확인한 연도 목록(오름차순) — 안내 문구용 */
export function coveredHolidayYears(): number[] {
  return [...COVERED_YEARS].sort((a, b) => a - b)
}

/** 날짜들 가운데 공휴일을 확인하지 않은 연도가 있으면 안내 문구, 없으면 null */
export function uncoveredHolidayNotice(dates: string[]): string | null {
  if (dates.every(isHolidayYearCovered)) return null
  const years = coveredHolidayYears()
  const range = years.length > 1 ? `${years[0]}~${years[years.length - 1]}년` : `${years[0]}년`
  return `공휴일은 ${range}만 표시합니다. 그 밖의 연도는 공휴일을 확인하지 않았습니다.`
}
