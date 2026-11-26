// S-04 재점검 대상의 표시 규칙 (09 S-04, 08 14, chagok-frontend#27). 화면 없이 테스트하도록 순수 함수.
// 상태·정렬·대상 판정은 서버 값 그대로 — 여기서는 글자로 바꾸기만 한다.

import type { ActiveReservation, Target, TargetItem } from './types'

/** 빈 상태 문구 (09 S-04·5장) */
export const NO_TARGETS_MESSAGE = '지금 연락할 고객이 없습니다.'
export const LOAD_FAILED_MESSAGE = '재점검 대상을 불러오지 못했습니다.'

const STATUS_WORD: Record<TargetItem['status'], string> = { DUE: '도래', SOON: '임박' }

/** "2026-11-14" → "2026.11.14" */
export function dotDate(date: string): string {
  return date.replaceAll('-', '.')
}

/** 줄 요약 꼬리표: 상태별 개수 (디자인 "도래 1"·"임박 1"), 도래 먼저 */
export function statusCounts(items: TargetItem[]): { status: TargetItem['status']; label: string }[] {
  return (['DUE', 'SOON'] as const)
    .map((status) => ({ status, count: items.filter((i) => i.status === status).length }))
    .filter((c) => c.count > 0)
    .map((c) => ({ status: c.status, label: `${STATUS_WORD[c.status]} ${c.count}` }))
}

/** 펼침: ItemStatusList variant target 모양 (다음 정비일·기준 기록일) */
export function itemRows(items: TargetItem[]) {
  return items.map((i) => ({
    id: i.itemId,
    name: i.name,
    status: i.status,
    details: [
      { label: '다음 정비일', value: dotDate(i.nextDueDate) },
      { label: '기준 기록일', value: dotDate(i.baseDate) },
    ],
  }))
}

/** "예약 있음 · 11/26 10:00" */
export function activeReservationText(active: ActiveReservation): string {
  const [, m, d] = active.reservedAt.slice(0, 10).split('-').map(Number)
  return `예약 있음 · ${m}/${d} ${active.reservedAt.slice(11, 16)}`
}

/** S-02 패널로 가는 쿼리 (?date=&reservation=) */
export function reservationQuery(active: ActiveReservation): { date: string; reservation: string } {
  return { date: active.reservedAt.slice(0, 10), reservation: String(active.reservationId) }
}

/** M-02에 채울 차량 */
export function vehicleOf(target: Target) {
  return { vehicleId: target.vehicleId, plateNumber: target.plateNumber, customerName: target.customerName }
}
