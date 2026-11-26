// 08 14 GET /api/targets — 재점검 대상 목록. 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다.
// P0-나머지 필드(targetItems[]의 lastDecline·lastCaution)는 그 이슈가 더한다.

/** 08 0.4 점검 주기 상태. 대상 목록에는 도래·임박만 온다 */
export type TargetItemStatus = 'DUE' | 'SOON'

export interface TargetItem {
  itemId: number
  name: string
  status: TargetItemStatus
  nextDueDate: string // YYYY-MM-DD
  baseDate: string // 기준 기록일 (10의 baseRecord.date)
}

/** 유효 예약 ("예약 있음") */
export interface ActiveReservation {
  reservationId: number
  reservedAt: string // 오프셋 없는 일시 (08 0.1)
}

export interface Target {
  customerId: number
  customerName: string
  phone: string // P0-나머지부터 서버가 마스킹
  vehicleId: number
  plateNumber: string
  targetItems: TargetItem[]
  activeReservation: ActiveReservation | null
}

export interface TargetListResponse {
  asOf: string // 판정 기준일(오늘)
  items: Target[]
}
