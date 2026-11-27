// 08 14 GET /api/targets — 재점검 대상 목록. 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다.
// P0-나머지 #29(F-CYC-02): targetItems[]의 lastDecline·lastCaution (10과 같은 모양·조건).

/** 08 0.4 점검 주기 상태. 대상 목록에는 도래·임박만 온다 */
export type TargetItemStatus = 'DUE' | 'SOON'

/** 08 10·14 lastDecline·lastCaution `{ date, memo }` */
export interface TargetItemNote {
  date: string // YYYY-MM-DD, 그 기록의 날짜
  memo: string | null
}

export interface TargetItem {
  itemId: number
  name: string
  status: TargetItemStatus
  nextDueDate: string // YYYY-MM-DD
  baseDate: string // 기준 기록일 (10의 baseRecord.date)
  /** P0-나머지. 지난 방문 거절 (조건이 아니면 null) */
  lastDecline: TargetItemNote | null
  /** P0-나머지. 지난 점검 주의 (조건이 아니면 null) */
  lastCaution: TargetItemNote | null
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
