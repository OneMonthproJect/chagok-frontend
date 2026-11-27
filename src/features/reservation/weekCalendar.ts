// 주 캘린더 칸 배치 (04 F-RSV-05 「주 보기」, 09 S-02, D-63 B08, chagok-frontend#36). 순수 함수.
// - 30분 칸, 기본 표시 08:00~20:00(시작 칸 08:00~19:30).
// - 08:00 전에 시작하는 예약은 표 위(before), 20:00 이후에 시작하는 예약은 표 아래(after) 영역에 날짜별로 둔다(빠뜨리지 않음).
// - 칸은 예약 일시 문자열(08 0.1, 오프셋 없음)의 날짜·시각으로만 정한다. 시간대 변환 없음.
// - 같은 칸의 예약 여러 건은 15 응답 순서(시각 순) 그대로 쌓는다.

import { formatTime } from './dates'
import type { ReservationListItem } from './types'

/** 첫 칸 시각 · 표 아래 영역이 시작하는 시각 (D-63 B08) */
export const WEEK_START_TIME = '08:00'
export const WEEK_END_TIME = '20:00'

/** 시작 칸 "08:00" ~ "19:30" (24칸) */
export const WEEK_SLOTS: string[] = Array.from({ length: 24 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`
})

export type ItemsByDate = Record<string, ReservationListItem[]>

export interface WeekPlacement {
  before: ItemsByDate // 08:00 전 시작
  slots: Record<string, ItemsByDate> // 칸 시각 → 날짜 → 예약
  after: ItemsByDate // 20:00 이후 시작
}

/** "HH:mm" → 그 시각이 들어가는 30분 칸 (예약은 :00·:30이지만 다른 분이 와도 칸을 잃지 않게 내림) */
function slotOf(time: string): string {
  return `${time.slice(0, 2)}:${Number(time.slice(3, 5)) < 30 ? '00' : '30'}`
}

function push(target: ItemsByDate, date: string, item: ReservationListItem) {
  ;(target[date] ??= []).push(item)
}

/** 주의 예약을 위 영역·30분 칸·아래 영역으로 나눈다. 주(days) 밖 날짜의 예약은 버린다 */
export function placeWeek(items: ReservationListItem[], days: string[]): WeekPlacement {
  const inWeek = new Set(days)
  const placement: WeekPlacement = { before: {}, slots: {}, after: {} }
  for (const item of items) {
    const date = item.reservedAt.slice(0, 10)
    if (!inWeek.has(date)) continue
    const time = formatTime(item.reservedAt)
    if (time < WEEK_START_TIME) push(placement.before, date, item)
    else if (time >= WEEK_END_TIME) push(placement.after, date, item)
    else push((placement.slots[slotOf(time)] ??= {}), date, item)
  }
  return placement
}

/** 위·아래 영역에 예약이 하나라도 있는지 (없으면 그 영역 줄을 그리지 않는다) */
export function hasItems(byDate: ItemsByDate): boolean {
  return Object.values(byDate).some((list) => list.length > 0)
}
