// 08 10~13 정비 기록·항목 — 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다.
// P0-나머지 중 #29(F-MNT-02·03·F-CYC-02): 10 lastDecline·lastCaution, 11 records[]의 source·inspectResult,
// 12 records[]의 externalDate·externalMileage·inspectResult. #62(F-MNT-01): 12의 mechanicId.
// #34(F-MNT-04): 11 records[]의 version·edited·staff, 37 정비 기록 수정, 38 수정 이력 (08 7.1 37·38 JSON 예시).

/** 08 0.4 점검 주기 상태. 서버 값 그대로 보인다(프론트에서 다시 계산하지 않음) */
export type ItemStatus = 'UNKNOWN' | 'AHEAD' | 'SOON' | 'DUE'

/** 08 0.4 도래 근거 */
export type DueReason = 'DATE' | 'KM'

/** 08 0.4 정비 구분. 조회 응답(10·11)에는 P0-핵심에서도 4개가 모두 나올 수 있다 */
export type RecordType = 'REPLACE' | 'INSPECT' | 'EXTERNAL' | 'DECLINE'

/** 08 0.4 출처 */
export type RecordSource = 'SHOP' | 'CUSTOMER_STATEMENT'

/** 08 0.4 점검 결과 (P0-나머지) */
export type InspectResult = 'GOOD' | 'CAUTION'

/** 08 0.4 항목 code */
export type ItemCode = 'ENGINE_OIL' | 'AIR_CLEANER' | 'AC_FILTER' | 'BRAKE_PAD' | 'TIRE' | 'BATTERY'

/** 08 10 items[].baseRecord — 기준 기록 */
export interface BaseRecord {
  date: string
  mileage: number | null
  type: RecordType
}

/** 08 10 items[].lastDecline·lastCaution (P0-나머지, F-CYC-02) — `{ date, memo }` */
export interface LastNote {
  date: string
  memo: string | null
}

/** 08 10 items[] */
export interface ItemStatusItem {
  itemId: number
  code: ItemCode
  name: string
  status: ItemStatus
  dueReason: DueReason | null
  baseRecord: BaseRecord | null
  nextDueDate: string | null
  nextDueMileage: number | null
  /** P0-나머지. 지난 방문 거절 */
  lastDecline: LastNote | null
  /** P0-나머지. 지난 점검 주의 */
  lastCaution: LastNote | null
}

/** 08 10 응답 data */
export interface ItemStatusResponse {
  vehicleId: number
  asOf: string
  inputMileage: number | null
  items: ItemStatusItem[]
}

/** 08 11 쿼리 (생략하면 page 0·size 20, 08 0.1) */
export interface VisitListParams {
  page?: number
  size?: number
}

/** 08 11 items[].records[] — memo는 null 가능 */
export interface VisitRecord {
  recordId: number
  itemId: number
  itemName: string
  type: RecordType
  date: string
  memo: string | null
  /** P0-나머지 */
  source: RecordSource
  /** P0-나머지. INSPECT일 때만 값이 있다 */
  inspectResult: InspectResult | null
  /** P0-나머지 (#34, F-MNT-04). 수정 확인용 번호 — 12 저장 때 0, 37 수정마다 +1. 37 요청에 그대로 보낸다 */
  version: number
  /** P0-나머지 (#34). 수정 이력(38)이 한 건이라도 있으면 true */
  edited: boolean
  /** P0-나머지 (#34). 그 기록의 담당 정비사(현재 이름). 37로 담당을 바꾸면 바뀐다 */
  staff: StaffRef
  /** P0-나머지 (F-MNT-04, chagok-docs#174). 그 기록 행의 주행거리(37이 고치는 값). 외부 기록은 확인되지 않으면 null이며 null은 0이 아니라 "알 수 없음". 방문 `mileage`와 별개 */
  mileage: number | null
}

/** 08 11 records[].staff · 38 changedBy·mechanic — `{ staffId, name }` (name은 그 계정의 현재 이름) */
export interface StaffRef {
  staffId: number
  name: string
}

/** 08 11 items[] — 방문 한 번(같은 visitKey의 기록 묶음) */
export interface Visit {
  visitKey: string
  visitDate: string
  mileage: number | null
  staffName: string
  records: VisitRecord[]
}

/** 08 11 응답 data (목록 쪽 나누기, 08 0.2). totalElements는 방문 묶음 수 */
export interface VisitListResponse {
  items: Visit[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** 08 12 요청 records[] — P0-나머지부터 EXTERNAL·DECLINE도 입력한다 */
export interface VisitRecordInput {
  itemId: number
  type: RecordType
  memo: string | null
  /** P0-나머지. 외부면 필수(오늘 이전) */
  externalDate?: string
  /** P0-나머지. 외부일 때만, 정수 0~2,000,000 */
  externalMileage?: number | null
  /** P0-나머지. INSPECT일 때만 */
  inspectResult?: InspectResult
}

/** 08 12 요청 vehicle — 차량의 연식이 비어 있을 때만 (D-58) */
export interface VisitVehicleInput {
  modelYear: number
}

/** 08 12 요청. mileage·vehicle은 요청에 교체·점검이 있을 때 조건부 필수(D-58). mechanicId는 P0-나머지(#62) */
export interface VisitSaveRequest {
  visitDate: string
  mileage?: number | null
  vehicle?: VisitVehicleInput
  /** P0-나머지. 담당 정비사 id(그 정비소의 사장·정비사, X13). 보내지 않으면 서버가 저장한 계정으로 둔다 */
  mechanicId?: number
  records: VisitRecordInput[]
}

/** 08 12 응답 data */
export interface VisitSaveResponse {
  vehicleId: number
  visitKey: string
  savedCount: number
}

/** 08 13 data[] — 정비 항목·주기 */
export interface ServiceItem {
  itemId: number
  code: ItemCode
  name: string
  cycleMonths: number
  cycleKm: number
  active: boolean
  sortOrder: number
}

// ---- 37 PATCH /api/records/{recordId} — 정비 기록 수정 (P0-나머지 #34, F-MNT-04, 08 7.1 37) ----
// 기록 1행. 보낸 필드만 바꾼다. 차량은 바꿀 수 없고 삭제는 없다. version 필수(다르면 409 CONCURRENT_MODIFICATION).

export interface RecordUpdateRequest {
  /** 화면이 읽은 기록의 version (11 records[].version) */
  version: number
  /** 바꿀 방문일. 오늘 이전·오늘. 외부 기록이면 고객이 말한 정비일 */
  recordDate?: string
  /** 바꿀 주행거리. 정수 0~2,000,000 */
  mileage?: number
  type?: RecordType
  itemId?: number
  /** 수정 뒤 구분이 INSPECT일 때만 */
  inspectResult?: InspectResult
  /** ~200자. ""이면 메모를 비운다 */
  memo?: string
  /** 바꿀 담당 정비사 (그 정비소의 사장·정비사, X13) */
  mechanicId?: number
  /** 수정 사유 ~200자 (선택) */
  reason?: string
}

/** 37 응답 data — 수정된 기록 전체는 싣지 않는다(화면은 11을 다시 조회) */
export interface RecordUpdateResponse {
  recordId: number
  vehicleId: number
  version: number
}

// ---- 38 GET /api/records/{recordId}/revisions — 정비 기록 수정 이력 (P0-나머지 #34, 08 7.1 38) ----
// revisionNo 오름차순(오래된 것부터), 쪽 나누기 없음. 이력이 없으면 items: [].

/** 38 changes[].field — 이 순서로 온다 */
export type RecordRevisionField = 'recordDate' | 'mileage' | 'type' | 'item' | 'inspectResult' | 'memo' | 'mechanic'

/** recordDate: date · mileage: number|null · type: RecordType · item: { itemId, name } · inspectResult: InspectResult|null · memo: string|null · mechanic: { staffId, name } */
export type RecordRevisionValue = string | number | null | { itemId: number; name: string } | StaffRef

export interface RecordRevisionChange {
  field: RecordRevisionField
  before: RecordRevisionValue
  after: RecordRevisionValue
}

export interface RecordRevision {
  revisionNo: number
  changedAt: string // 오프셋 없는 일시 (08 0.1)
  changedBy: StaffRef
  reason: string | null
  changes: RecordRevisionChange[]
}

export interface RecordRevisionListResponse {
  items: RecordRevision[]
}
