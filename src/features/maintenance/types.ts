// 08 10~13 정비 기록·항목 — 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다.
// P0-핵심 기준. P0-나머지(10 lastDecline·lastCaution, 11 records[]의 source·inspectResult·version·edited·staff,
// 12 mechanicId·externalDate·externalMileage·inspectResult)는 그 이슈가 더한다.

/** 08 0.4 점검 주기 상태. 서버 값 그대로 보인다(프론트에서 다시 계산하지 않음) */
export type ItemStatus = 'UNKNOWN' | 'AHEAD' | 'SOON' | 'DUE'

/** 08 0.4 도래 근거 */
export type DueReason = 'DATE' | 'KM'

/** 08 0.4 정비 구분. 조회 응답(10·11)에는 P0-핵심에서도 4개가 모두 나올 수 있다 */
export type RecordType = 'REPLACE' | 'INSPECT' | 'EXTERNAL' | 'DECLINE'

/** 08 0.4 항목 code */
export type ItemCode = 'ENGINE_OIL' | 'AIR_CLEANER' | 'AC_FILTER' | 'BRAKE_PAD' | 'TIRE' | 'BATTERY'

/** 08 10 items[].baseRecord — 기준 기록 */
export interface BaseRecord {
  date: string
  mileage: number | null
  type: RecordType
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

/** 08 12 요청 records[] — P0-핵심 입력은 REPLACE·INSPECT */
export interface VisitRecordInput {
  itemId: number
  type: RecordType
  memo: string | null
}

/** 08 12 요청 vehicle — 차량의 연식이 비어 있을 때만 (D-58) */
export interface VisitVehicleInput {
  modelYear: number
}

/** 08 12 요청 (P0-핵심). mileage·vehicle은 조건부 필수(D-58). mechanicId는 P0-나머지(#62) */
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
