// 08 15~21·39~42 (예약). 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다 (features/reservation 첫 이슈 #24).
// P0-나머지 필드(assignee, reassignReason, IN_PROGRESS 등)는 08에 맞춰 선택(optional)으로 둔다. 16 assigneeId는 P0-나머지 필수(#37).

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
  assigneeId: number // P0-나머지 필수(R19, X13). 백엔드 develop이 P0-나머지 규칙이라 항상 보낸다 (D-51, #37)
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
  /** P0-나머지 (#34, F-MNT-04). 11과 같은 모양 — 패널은 수정 버튼을 두지 않아 화면에서 쓰지 않는다(수정은 S-07) */
  version: number
  edited: boolean
  staff: { staffId: number; name: string }
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

// ---- 39 POST /api/reservations/{id}/start (P0-나머지, F-RSV-09 방문 접수, 08 7.1 39) ----
// 차량의 연식·최근 주행거리가 비어 있을 때만 modelYear·mileage가 필수다(D-58, 없으면 400). 차량에 값이 있으면 보내지 않는다.

export interface ReservationStartRequest {
  version: number
  modelYear?: number
  mileage?: number
}

/**
 * 39 응답: 18·20·21·40과 같은 { reservationId, status, vehicleId, version } (08 7.1 39, chagok-docs#155).
 * 백엔드 develop은 아직 reservedAt을 더 싣는다(문서에 맞춰 조정 예정, docs#155) — 화면은 성공 뒤 17을 다시 불러 이 응답의 필드를 쓰지 않는다.
 */
export type ReservationStarted = ReservationStatusChanged

// ---- 40 POST /api/reservations/{id}/correct (P0-나머지, F-RSV-10 지난 예약 정정, 08 7.1 40) ----
// 끝난 예약(COMPLETED·CANCELED·NO_SHOW)의 상태·예약 메모만. 바꿀 것만 보낸다. 응답은 18·20·21과 같다.

/** 40 status로 보낼 수 있는 값 */
export type CorrectableStatus = 'COMPLETED' | 'CANCELED' | 'NO_SHOW'

export interface ReservationCorrectRequest {
  version: number
  status?: CorrectableStatus
  purposeMemo?: string // ""이면 메모를 비운다
  reason?: string
}

// ---- 41 GET /api/reservations/{id}/revisions (P0-나머지, F-RSV-06·10, 08 7.1 41 JSON 예시) ----
// changedAt 오름차순(같으면 이력 번호 순, 번호는 응답에 없음). 이력이 없으면 items: [].

/** 08 0.4 예약 이력 종류 */
export type ReservationRevisionKind = 'STATUS' | 'MEMO' | 'ASSIGNEE'

/** 바꾼 사람·담당 (name은 그 계정의 현재 이름) */
export interface RevisionPerson {
  staffId: number
  name: string
}

/** STATUS: field "status"(상태 enum), MEMO: "purposeMemo"(메모, 없으면 null), ASSIGNEE: "assignee"({ staffId, name }) */
export interface ReservationRevisionChange {
  field: string
  before: string | RevisionPerson | null
  after: string | RevisionPerson | null
}

export interface ReservationRevision {
  kind: ReservationRevisionKind
  changedAt: string // 오프셋 없는 일시 (08 0.1)
  changedBy: RevisionPerson
  reason: string | null
  changes: ReservationRevisionChange[]
}

export interface ReservationRevisionListResponse {
  items: ReservationRevision[]
}

// ---- 42 GET /api/reservations/summary?from=&to= (P0-나머지, F-RSV-05 월 보기) ----
// 08 7.1 42 JSON 예시(chagok-docs#143): data는 15와 같은 { from, to, items }. from·to 규칙은 15와 같다(최대 42일).
// 예약이 한 건도 없는 날짜는 items에 없다(0건으로 본다). 취소만 있는 날은 들어가고 total 0. items는 date 오름차순.

export interface ReservationSummaryQuery {
  from: string // YYYY-MM-DD
  to: string
}

/** 날짜 하나의 건수. total은 취소만 제외한 수(진행중·노쇼 포함) — 서버 값 그대로 쓰고 화면에서 더하지 않는다 */
export interface ReservationDaySummary {
  date: string // YYYY-MM-DD
  total: number
  reserved: number
  inProgress: number
  completed: number
  canceled: number
  noShow: number
}

export interface ReservationSummaryResponse {
  from: string // 요청 그대로
  to: string
  items: ReservationDaySummary[]
}
