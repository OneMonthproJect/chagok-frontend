// 08 15~19 (예약). 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다 (features/reservation 첫 이슈 #24).
// P0-나머지 필드(assignee, assigneeId, reassignReason, IN_PROGRESS)는 08에 맞춰 선택(optional)으로 둔다.

/** 08 0.4 예약 상태. IN_PROGRESS·NO_SHOW는 P0-나머지부터 */
export type ReservationStatus = 'RESERVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'

/** P0-나머지: 담당 정비사 (15·16·17·19 응답) */
export interface Assignee {
  staffId: number
  name: string
  colorIndex: number
}

// ---- 36 GET /api/staff/assignees (P0-나머지, 08 7.1 36 JSON 예시) ----
// 그 정비소의 사장·정비사(비활성 제외는 P1 V3부터). staffId 오름차순, 직원이 없으면 빈 배열. 쿼리 없음.
// S-08 담당 선택(#62)과 M-02 담당 선택(#37)이 같이 쓴다.

/** 08 36 items[] */
export interface AssigneeCandidate {
  staffId: number
  name: string
  role: 'OWNER' | 'MECHANIC'
  colorIndex: number
}

/** 08 36 응답 data */
export interface AssigneeListResponse {
  items: AssigneeCandidate[]
}

// ---- 15 GET /api/reservations?from=&to= ----

export interface ReservationPeriodQuery {
  from: string // YYYY-MM-DD
  to: string
  assigneeId?: number // P0-나머지
}

export interface ReservationListItem {
  reservationId: number
  reservedAt: string // 오프셋 없는 일시 "2026-11-23T15:00:00" (08 0.1)
  status: ReservationStatus
  needsAction: boolean
  version: number
  vehicleId: number
  plateNumber: string
  customerId: number
  customerName: string
  phone: string
  purposeSummary: string | null
  assignee?: Assignee
}

export interface ReservationPeriodResponse {
  from: string
  to: string
  items: ReservationListItem[]
}

// ---- 16 POST /api/reservations ----

export interface ReservationPurposeRequest {
  itemIds?: number[]
  other?: boolean
  memo?: string | null
}

export interface ReservationCreateRequest {
  vehicleId: number
  reservedAt: string
  purpose?: ReservationPurposeRequest
  assigneeId?: number // P0-나머지 필수, P0-핵심은 보내지 않음 (D-51)
}

export interface ReservationSaved {
  reservationId: number
  status: ReservationStatus
  reservedAt: string
  vehicleId: number
  version: number
  assignee?: Assignee
}

// ---- 17 GET /api/reservations/{id}/panel ----

export interface PanelPurposeItem {
  itemId: number
  name: string
}

export interface PanelReservation {
  reservationId: number
  reservedAt: string
  status: ReservationStatus
  needsAction: boolean
  version: number
  purpose: { items: PanelPurposeItem[]; other: boolean; memo: string | null }
  assignee?: Assignee
}

export interface PanelCustomer {
  customerId: number
  name: string
  phone: string
  consent: boolean
}

export interface PanelVehicle {
  vehicleId: number
  plateNumber: string
  model: string
  modelYear: number | null
  latestMileage: number | null
}

/** 08 11 방문 이력의 기록 한 줄 */
export interface VisitRecord {
  recordId: number
  itemId: number
  itemName: string
  type: 'REPLACE' | 'INSPECT' | 'EXTERNAL' | 'DECLINE'
  date: string
  memo: string | null
}

/** 08 11 방문 하나 */
export interface RecentVisit {
  visitKey: string
  visitDate: string
  mileage: number | null
  staffName: string
  records: VisitRecord[]
}

/** 08 0.4 점검 주기 상태 */
export type CycleStatus = 'UNKNOWN' | 'AHEAD' | 'SOON' | 'DUE'

/** 08 10 items 모양 + highlighted */
export interface PanelItemStatus {
  itemId: number
  code: string
  name: string
  status: CycleStatus
  dueReason: 'DATE' | 'KM' | null // 08 0.4. 17은 주행거리 없이 부른 결과라 DATE·null만 온다
  baseRecord: { date: string; mileage: number | null; type: VisitRecord['type'] } | null
  nextDueDate: string | null
  nextDueMileage: number | null
  highlighted: boolean
}

export interface ReservationPanel {
  reservation: PanelReservation
  customer: PanelCustomer
  vehicle: PanelVehicle
  recentVisits: RecentVisit[]
  totalVisitCount: number
  itemStatuses: PanelItemStatus[]
}

// ---- 18 POST /api/reservations/{id}/complete ----

export interface ReservationCompleteRequest {
  version: number
}

export interface ReservationCompleted {
  reservationId: number
  status: ReservationStatus // COMPLETED
  vehicleId: number
  version: number
}

// ---- 20 POST /api/reservations/{id}/cancel · 21 POST /api/reservations/{id}/no-show (P0-나머지) ----
// 요청·응답 모양은 18과 같다(08 20·21: "요청·서버 처리·실패 처리·화면 처리는 18과 같다").

export interface ReservationStatusChangeRequest {
  version: number
}

export interface ReservationStatusChanged {
  reservationId: number
  status: ReservationStatus // 20: CANCELED, 21: NO_SHOW
  vehicleId: number
  version: number
}

// ---- 19 PATCH /api/reservations/{id} ----

/** 보낸 필드만 바꾼다. memo: 보내지 않거나 null이면 그대로, ""이면 비움. itemIds: []이면 모두 지움 */
export interface ReservationUpdateRequest {
  version: number
  reservedAt?: string
  purpose?: ReservationPurposeRequest
  assigneeId?: number // P0-나머지
  reassignReason?: string // P0-나머지
}
