// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 10~13의 사본이며 계약의 기준은 08이다.
// 값은 07 7.2 A 정비소 시드의 「기대」 칸과 08 JSON 예시를 오늘(D) = 2026-11-24(08 0.1 예시 값)로 옮긴 고정 값이다.
//   - item-status.json: 차량 id → 08 10 data (주행거리 없이 부른 결과). 상태·다음 정비일·다음 km는 시드 기대값을 적은 것이다(Mock이 계산하지 않음).
//     꼬리표(F-CYC-02)도 시드 기대값을 적었다: 11바0006(차량 6) 엔진오일 "지난 방문 거절", 33아0008(차량 8) 타이어 "지난 점검 주의".
//     33아0008의 점검 결과 "주의"·메모는 07 7.2에서 "V2 이후 시드에 반영"이라 아직 시드에 없다 — 메모는 08 12 예시 문구("앞 타이어 마모")를 빌렸다.
//   - item-status-preview.json: 차량 id → mileage → 그 mileage에서 **바뀌는 항목만** (저장 전 미리보기, F-VIS-01).
//     08 10 JSON 예시 하나뿐이다: 차량 4(78라0004, 시나리오 B)에 55,000 → 엔진오일 도래(KM, T8).
//     나머지 항목은 item-status.json의 같은 차량 값을 그대로 쓴다(복사본을 두지 않아 한 곳만 고친다, CONVENTIONS 11장).
//   - visits.json: 차량 id → 08 11 items[] 전체(최신순). 차량 10의 첫 방문은 08 11 JSON 예시와 같다.
//     P0-나머지 source·inspectResult를 더했다(외부만 CUSTOMER_STATEMENT, 점검 결과는 33아0008의 마지막 점검만 CAUTION).
//   - items.json: 08 13 JSON 예시 그대로.
// 로그인은 A 정비소 기준이고, A에 없는 차량 id(B 정비소 차량 12 포함, 07 7.4)는 404 NOT_FOUND(격리).
// 응답 함수는 상태를 쌓지 않는다(저장해도 이력에 더하지 않음 — 프론트에 데이터를 쌓지 않음).
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { FieldError, MockResponse } from '@/shared/api/client'
import type { ItemStatusItem, ItemStatusResponse, Visit, VisitListParams, VisitSaveRequest } from '../types'
import itemStatusPreviewFixture from './item-status-preview.json'
import itemStatusFixture from './item-status.json'
import itemsOk from './items.json'
import visitsFixture from './visits.json'

const ITEM_STATUS = itemStatusFixture as Record<string, ItemStatusResponse>
/** 차량 id → mileage → 바뀌는 항목만 (itemId로 item-status.json 위에 덮어쓴다) */
export type ItemStatusPreviewFixture = Record<string, Record<string, { items: ItemStatusItem[] }>>
const ITEM_STATUS_PREVIEW = itemStatusPreviewFixture as ItemStatusPreviewFixture
const VISITS = visitsFixture as Record<string, Visit[]>
const ACTIVE_ITEM_IDS = new Set(itemsOk.data.filter((item) => item.active).map((item) => item.itemId))

/**
 * 07 7.2 차량 표에서 비어 있는 값(D-58 저장 조건 확인용). 90마0005는 주행거리, 66카0011은 연식·주행거리가 비어 있다.
 * 저장해도 채우지 않는다(상태를 쌓지 않음).
 */
const VEHICLE_MISSING: Record<number, { modelYear: boolean; latestMileage: boolean }> = {
  5: { modelYear: false, latestMileage: true },
  11: { modelYear: true, latestMileage: true },
}

const MIN_MODEL_YEAR = 1980
const MAX_MILEAGE = 2_000_000
const DEFAULT_SIZE = 20
const MAX_SIZE = 50
const SAVED_VISIT_KEY = '3f1c2b9e-0000-4000-8000-000000000012' // 08 12 응답 예시

/** 서버 문구와 같게 (chagok-backend MaintenanceService·ItemStatusService·VisitSaveRequest·CustomerService) */
const M = {
  REQUIRED: '필수 입력입니다.',
  RECORDS_EMPTY: '기록할 항목을 1개 이상 넣어 주세요.',
  MEMO_MAX: '200자 이하로 입력해 주세요.',
  NOT_OPEN: '아직 사용할 수 없는 입력입니다.',
  VISIT_DATE_FUTURE: '오늘 이전 날짜만 입력할 수 있습니다.',
  DUPLICATE_ITEM: '같은 항목을 두 번 넣을 수 없습니다.',
  ITEM_NOT_USABLE: '사용할 수 없는 항목입니다.',
  MODEL_YEAR_EMPTY: '차량의 연식이 비어 있어 입력해 주세요.',
  MILEAGE_EMPTY: '차량의 주행거리가 비어 있어 입력해 주세요.',
  QUERY_MILEAGE_RANGE: '0 이상 2,000,000 이하의 정수여야 합니다.',
  TYPE_MISMATCH: '형식이 올바르지 않습니다.',
  MILEAGE_RANGE: '0 이상 2,000,000 이하로 입력해 주세요.',
} as const

function ok(data: unknown): MockResponse {
  return { status: 200, body: { success: true, data, error: null } }
}

function error(status: number, code: string, message: string, fieldErrors: FieldError[] = []): MockResponse {
  return { status, body: { success: false, data: null, error: { code, message, fieldErrors, details: null } } }
}

const invalid = (fieldErrors: FieldError[] = []) => error(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', fieldErrors)
const notFound = () => error(404, 'NOT_FOUND', '찾을 수 없습니다.')
const isOwnedVehicle = (vehicleId: number) => Object.prototype.hasOwnProperty.call(ITEM_STATUS, String(vehicleId))

/** 오늘(서울) "YYYY-MM-DD" — 방문일 검사에만 쓴다 */
function todaySeoul(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
}

/**
 * 08 10. mileage를 주면 범위만 확인하고 요청 값을 inputMileage로 돌려준다. 서버처럼 mileage 검사(400)가 차량 소속(404)보다 먼저.
 * 차량·mileage가 item-status-preview.json에 있으면(08 10 예시: 차량 4 · 55,000) 그 항목만 고정 값으로 바꿔 돌려준다(계산하지 않음).
 * LIMIT: km 판정은 흉내 내지 않는다 — 그 밖의 mileage는 항목 상태가 날짜 기준 그대로다(차량 4에 60,000을 넣어도 엔진오일 여유).
 */
export function mockGetItemStatus(vehicleId: number, mileage?: number | null): MockResponse {
  if (mileage != null && !Number.isInteger(mileage)) return invalid([{ field: 'mileage', reason: M.TYPE_MISMATCH }])
  if (mileage != null && (mileage < 0 || mileage > MAX_MILEAGE)) {
    return invalid([{ field: 'mileage', reason: M.QUERY_MILEAGE_RANGE }])
  }
  if (!isOwnedVehicle(vehicleId)) return notFound()
  const base = ITEM_STATUS[String(vehicleId)]
  const overrides = mileage == null ? undefined : ITEM_STATUS_PREVIEW[String(vehicleId)]?.[String(mileage)]?.items
  const items = overrides ? base.items.map((item) => overrides.find((o) => o.itemId === item.itemId) ?? item) : base.items
  return ok({ ...base, inputMileage: mileage ?? null, items })
}

/** 08 11 — 서버처럼 쪽 나누기 검사(컨트롤러의 PageLimit)를 먼저, 그다음 차량 소속(404, X2) */
export function mockGetVisits(vehicleId: number, params: VisitListParams = {}): MockResponse {
  const page = params.page ?? 0
  const requested = params.size ?? DEFAULT_SIZE
  if (!Number.isInteger(page)) return invalid([{ field: 'page', reason: '형식이 올바르지 않습니다.' }])
  if (!Number.isInteger(requested)) return invalid([{ field: 'size', reason: '형식이 올바르지 않습니다.' }])
  if (page < 0) return invalid([{ field: 'page', reason: '0 이상이어야 합니다.' }])
  if (requested <= 0) return invalid([{ field: 'size', reason: '1 이상이어야 합니다.' }])
  const size = Math.min(requested, MAX_SIZE)
  if (!isOwnedVehicle(vehicleId)) return notFound()

  const all = VISITS[String(vehicleId)] ?? []
  return ok({
    items: all.slice(page * size, page * size + size),
    page,
    size,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / size),
  })
}

/** 08 12 요청에 아직 열지 않은 mechanicId(#62)가 섞여 왔는지 보기 위한 느슨한 모양 */
type LooseVisitSave = Partial<VisitSaveRequest> & {
  mechanicId?: unknown
  records?: Array<Partial<VisitSaveRequest['records'][number]>>
}

/**
 * 08 12 — 검사 순서는 P0-핵심 서버와 같다: 형식(필수·길이) → 차량 소속(404, X5) → 아직 열지 않은 입력 → 방문일·외부 정비일 →
 * 항목 중복 → 쓰는 항목(X11) → 차량이 비어 있을 때 필수(D-58, 교체·점검이 있을 때만) → 연식·주행거리 범위.
 * P0-나머지(#29): 외부·거절·점검 결과를 받는다. mechanicId(담당 지정)는 #62가 열 때까지 400 그대로.
 * LIMIT: 외부 주행거리 범위 문구는 공용 MILEAGE_RANGE를 써서 서버(chagok-backend#32, "0 ~ 2,000,000 사이로 입력해 주세요.")와 글자가 다르다(화면은 서버 문구를 그대로 보임).
 *   구분과 맞지 않는 값(점검이 아닌데 inspectResult 등 — 서버는 400)은 화면이 보내지 않으므로 흉내 내지 않는다.
 */
export function mockSaveVisit(vehicleId: number, body: VisitSaveRequest): MockResponse {
  const request = (body ?? {}) as LooseVisitSave
  const records = Array.isArray(request.records) ? request.records : []

  // 1. 형식 (VisitSaveRequest의 Bean Validation)
  const format: FieldError[] = []
  if (!request.visitDate) format.push({ field: 'visitDate', reason: M.REQUIRED })
  if (records.length === 0) format.push({ field: 'records', reason: M.RECORDS_EMPTY })
  // LIMIT: JSON을 읽을 수 없는 값(없는 type 값·날짜 형식 오류 → 400 + 빈 fieldErrors)은 types.ts가 막으므로 흉내 내지 않는다
  records.forEach((r, i) => {
    if (r == null) {
      format.push({ field: `records[${i}]`, reason: M.REQUIRED })
      return
    }
    if (r.itemId == null) format.push({ field: `records[${i}].itemId`, reason: M.REQUIRED })
    if (r.type == null) format.push({ field: `records[${i}].type`, reason: M.REQUIRED })
    if (typeof r.memo === 'string' && r.memo.length > 200) format.push({ field: `records[${i}].memo`, reason: M.MEMO_MAX })
  })
  if (format.length > 0) return invalid(format)

  // 2. 차량 소속
  if (!isOwnedVehicle(vehicleId)) return notFound()

  // 3. 아직 열지 않은 입력 (담당 지정, #62)
  if (request.mechanicId != null) return invalid([{ field: 'mechanicId', reason: M.NOT_OPEN }])

  // 4. 방문일: 오늘 이전·오늘. 외부 정비일: 외부면 필수, 미래 불가 (F-MNT-02)
  const today = todaySeoul()
  if ((request.visitDate as string) > today) return invalid([{ field: 'visitDate', reason: M.VISIT_DATE_FUTURE }])
  const external: FieldError[] = []
  records.forEach((r, i) => {
    if (r.type !== 'EXTERNAL') return
    if (!r.externalDate) external.push({ field: `records[${i}].externalDate`, reason: M.REQUIRED })
    else if (r.externalDate > today) external.push({ field: `records[${i}].externalDate`, reason: M.VISIT_DATE_FUTURE })
    const km = r.externalMileage
    if (km != null && (!Number.isInteger(km) || km < 0 || km > MAX_MILEAGE)) {
      external.push({ field: `records[${i}].externalMileage`, reason: M.MILEAGE_RANGE })
    }
  })
  if (external.length > 0) return invalid(external)

  // 5. 같은 항목 중복
  const seen = new Set<number>()
  const duplicates: FieldError[] = []
  records.forEach((r, i) => {
    if (seen.has(r.itemId as number)) duplicates.push({ field: `records[${i}].itemId`, reason: M.DUPLICATE_ITEM })
    seen.add(r.itemId as number)
  })
  if (duplicates.length > 0) return invalid(duplicates)

  // 6. 그 정비소의 쓰는 항목 (없음·남의 것·쓰지 않음 모두 같은 응답, X11)
  if (records.some((r) => !ACTIVE_ITEM_IDS.has(r.itemId as number))) {
    return invalid([{ field: 'records[].itemId', reason: M.ITEM_NOT_USABLE }])
  }

  // 7. 차량에 비어 있는 연식·주행거리 (D-58) — 요청에 교체·점검이 있을 때만 (08 12)
  const needsVehicleInfo = records.some((r) => r.type === 'REPLACE' || r.type === 'INSPECT')
  const missing = needsVehicleInfo ? VEHICLE_MISSING[vehicleId] : undefined
  const modelYear = request.vehicle?.modelYear ?? null
  const mileage = request.mileage ?? null
  const required: FieldError[] = []
  if (missing?.modelYear && modelYear == null) required.push({ field: 'vehicle.modelYear', reason: M.MODEL_YEAR_EMPTY })
  if (missing?.latestMileage && mileage == null) required.push({ field: 'mileage', reason: M.MILEAGE_EMPTY })
  if (required.length > 0) return invalid(required)

  // 8. 연식·주행거리 범위 (08 0.1)
  const currentYear = Number(today.slice(0, 4))
  if (modelYear != null && (modelYear < MIN_MODEL_YEAR || modelYear > currentYear + 1)) {
    return invalid([{ field: 'vehicle.modelYear', reason: `${MIN_MODEL_YEAR}년부터 ${currentYear + 1}년까지 입력할 수 있습니다.` }])
  }
  if (mileage != null && (!Number.isInteger(mileage) || mileage < 0 || mileage > MAX_MILEAGE)) {
    return invalid([{ field: 'mileage', reason: M.MILEAGE_RANGE }])
  }

  return ok({ vehicleId, visitKey: SAVED_VISIT_KEY, savedCount: records.length })
}

/** 08 13 — 로그인한 정비소(A)의 항목만 */
export function mockGetItems(): MockResponse {
  return { status: 200, body: itemsOk }
}
