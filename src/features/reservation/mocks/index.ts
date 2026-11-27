// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 15~21·39~42의 사본이며 계약의 기준은 08이다.
// 값은 07 7.1~7.3 시드(seed.json). 예약 날짜는 오늘(서울) 기준으로 계산하고, 바뀐 상태는 메모리에만 둔다(새로 고치면 처음으로).
// 15 목록의 담당(assignee, P0-나머지)은 07 7.3 담당 계정(seed.json staff·assigneeStaffId, #30).
// 16·19의 담당(P0-나머지, #37): 16 assigneeId 필수(R19)·X13·담당 중복(R15), 19 재배정(R24)·담당 중복(R18), 응답 assignee.
// 패널(17)의 최근 방문·총 방문 수는 07 7.2 기록(seed.json visits, #26)으로 만든다(11 모양, 최신순 2회, 외부만 있는 방문은 세지 않음 POL-45).
// LIMIT: 점검 주기(itemStatuses)는 단순화 — 항목 상태 모두 미확인. 상태 판정은 서버(cycle)의 일이라 Mock에서 계산하지 않는다. 실제 값은 백엔드 연결로 확인한다.
//   예외: 꼬리표(lastDecline·lastCaution, #29)는 시드 기록에서 계산한다(notesOf, Mock 전용 — F-CYC-02 판정은 서버 cycle의 일이고 화면은
//   받은 값만 보인다). 고정값으로 두면 예약마다 차량이 바뀌어 seed.json에 차량별 표를 따로 둬야 하기 때문이다. 최근 방문의 source·inspectResult는 시드 그대로.
// 39 방문 접수가 채운 차량 연식·주행거리, 40 정정·41 이력도 메모리에만 둔다(#33).
// LIMIT: Mock은 로그인 계정을 모른다. 40은 사장으로 보고(상태·메모 모두 허용) 이력의 바꾼 사람도 사장(owner_a)으로 둔다.
//   정비사 권한·3일 기간(403 FORBIDDEN·EDIT_PERIOD_EXPIRED)은 백엔드 연결로 확인한다.
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { MockResponse } from '@/shared/api/client'
import { addDays, nowSeoul, todaySeoul } from '../dates'
import type {
  ReservationCompleteRequest,
  ReservationCorrectRequest,
  ReservationCreateRequest,
  ReservationListItem,
  ReservationPanel,
  ReservationPeriodQuery,
  ReservationStatus,
  ReservationSummaryQuery,
  ReservationDaySummary,
  ReservationRevision,
  ReservationStartRequest,
  ReservationStatusChangeRequest,
  ReservationUpdateRequest,
  PanelItemStatus,
  RecentVisit,
  VisitRecord,
} from '../types'
import seed from './seed.json'

interface MockReservation {
  reservationId: number
  reservedAt: string
  status: ReservationStatus
  version: number
  vehicleId: number
  itemIds: number[]
  other: boolean
  memo: string | null
  assigneeStaffId: number
}

const MAX_DAYS = 42
/**
 * LIMIT: Mock은 토큰의 역할을 모른다. 로그인 Mock(auth/mocks/me.json)과 같이 사장(owner_a)으로 보고 재배정 마감(R24)을 판정한다.
 * 정비사의 당일 재배정 거부(R24 b)는 Mock에서 재현하지 않는다 — 실서버로 확인한다.
 */
const MOCK_LOGIN_ROLE: 'OWNER' | 'MECHANIC' = 'OWNER'
let store: MockReservation[] | null = null
let nextId = 100
/** 39가 채운 차량 값 (vehicleId → 값). seed.json은 바꾸지 않는다 */
let vehicleFills = new Map<number, { modelYear?: number; latestMileage?: number }>()
/** 40 정정·19 재배정 이력 (reservationId → 오래된 것부터, 08 41) */
let revisions = new Map<number, ReservationRevision[]>()

function reservations(): MockReservation[] {
  if (store === null) {
    const today = todaySeoul()
    store = seed.reservations.map((r) => ({
      reservationId: r.reservationId,
      reservedAt: `${addDays(today, r.dayOffset)}T${r.time}`,
      status: r.status as ReservationStatus,
      version: r.version,
      vehicleId: r.vehicleId,
      itemIds: r.itemIds,
      other: r.other,
      memo: r.memo,
      assigneeStaffId: r.assigneeStaffId,
    }))
  }
  return store
}

/** 테스트용: 메모리 상태를 처음으로 */
export function resetReservationMocks(): void {
  store = null
  nextId = 100
  vehicleFills = new Map()
  revisions = new Map()
}

const ok = (data: unknown, status = 200): MockResponse => ({ status, body: { success: true, data, error: null } })
const fail = (status: number, code: string, message: string, field?: string, details: Record<string, unknown> | null = null): MockResponse => ({
  status,
  body: { success: false, data: null, error: { code, message, fieldErrors: field ? [{ field, reason: message }] : [], details } },
})
const notFound = () => fail(404, 'NOT_FOUND', '찾을 수 없습니다.')

function vehicleOf(vehicleId: number) {
  const vehicle = seed.vehicles.find((v) => v.vehicleId === vehicleId)
  return vehicle && { ...vehicle, ...vehicleFills.get(vehicleId) }
}
const customerOf = (customerId: number) => seed.customers.find((c) => c.customerId === customerId)
const itemOf = (itemId: number) => seed.items.find((i) => i.itemId === itemId)
const assigneeOf = (staffId: number) => seed.staff.find((s) => s.staffId === staffId)

function purposeSummary(r: MockReservation): string | null {
  const names = r.itemIds.map((id) => itemOf(id)?.name).filter(Boolean) as string[]
  if (r.other) names.push('기타')
  return names.length > 0 ? names.join('·') : null
}

/** "처리 필요" (D-23): RESERVED이고 예약 시각이 지금보다 이전 */
const needsAction = (r: MockReservation) => r.status === 'RESERVED' && r.reservedAt < nowSeoul()

/** 유효 예약 (R3): RESERVED + 날짜 ≥ 오늘, 또는 IN_PROGRESS */
const isActive = (r: MockReservation) =>
  r.status === 'IN_PROGRESS' || (r.status === 'RESERVED' && r.reservedAt.slice(0, 10) >= todaySeoul())

function toListItem(r: MockReservation): ReservationListItem {
  const vehicle = vehicleOf(r.vehicleId)!
  const customer = customerOf(vehicle.customerId)!
  return {
    reservationId: r.reservationId,
    reservedAt: r.reservedAt,
    status: r.status,
    needsAction: needsAction(r),
    version: r.version,
    vehicleId: vehicle.vehicleId,
    plateNumber: vehicle.plateNumber,
    customerId: customer.customerId,
    customerName: customer.name,
    phone: customer.phone,
    purposeSummary: purposeSummary(r),
    assignee: assigneeOf(r.assigneeStaffId),
  }
}

// 16·19 입력 검증 순서 (08 16·19): 30분 단위 → 항목 → assigneeId(X13) → 날짜. 담당 400 문구(assigneeId·reassignReason·같은 담당)는 백엔드 ReservationService와 같게 둔다.
// LIMIT: 항목(X11) 검증과 30분 단위·날짜 문구는 #37 이전 Mock 그대로(백엔드 문구와 다름) — 계약 점검 기록, 08 모양에는 영향 없음
function invalidSlot(value: string): MockResponse | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00$/.test(value)) {
    return fail(400, 'INVALID_INPUT', '예약 시각은 30분 단위로 입력해 주세요.', 'reservedAt')
  }
  return null
}

function pastDate(value: string): MockResponse | null {
  if (value.slice(0, 10) < todaySeoul()) {
    return fail(400, 'RESERVATION_PAST_DATE', '오늘 이후 날짜만 예약할 수 있습니다.')
  }
  return null
}

/** 15·42 기간 위반의 fieldErrors 필드 (08 15·7.1 42): 누락은 그 파라미터, from > to는 from, 42일 초과는 to. 위반이 없으면 null */
function periodErrorField(from: string, to: string): 'from' | 'to' | null {
  if (!from) return 'from'
  if (!to) return 'to'
  if (from > to) return 'from'
  return addDays(from, MAX_DAYS - 1) < to ? 'to' : null
}

/** X13: 없음·그 정비소의 사장·정비사가 아님 → 400 assigneeId (R19·R20) */
function invalidAssignee(assigneeId: unknown): MockResponse | null {
  if (assigneeId === undefined || assigneeId === null) return fail(400, 'INVALID_INPUT', '필수 입력입니다.', 'assigneeId')
  if (typeof assigneeId !== 'number' || !assigneeOf(assigneeId)) return fail(400, 'INVALID_INPUT', '그 정비소의 사장·정비사를 선택해 주세요.', 'assigneeId')
  return null
}

const SLOT_CONFLICT_MESSAGE = '이 정비사는 해당 시각에 이미 예약이 있습니다. 다른 시각이나 다른 담당을 선택해 주세요.'

/** 담당 중복 (R15·R18·R22): 같은 담당 + 같은 시작 시각의 유효 예약(자기 자신 제외). 취소·완료·노쇼는 막지 않는다(R17) */
function slotConflict(assigneeStaffId: number, reservedAt: string, self?: MockReservation): MockResponse | null {
  const other = reservations().find((x) => x !== self && x.assigneeStaffId === assigneeStaffId && x.reservedAt === reservedAt && isActive(x))
  return other ? fail(409, 'MECHANIC_SLOT_CONFLICT', SLOT_CONFLICT_MESSAGE, undefined, { reservationId: other.reservationId }) : null
}

/** 16·19 응답 (P0-나머지: assignee 포함) */
const savedOf = (r: MockReservation) => ({
  reservationId: r.reservationId, status: r.status, reservedAt: r.reservedAt, vehicleId: r.vehicleId, version: r.version, assignee: assigneeOf(r.assigneeStaffId),
})

/** 08 15 */
export function mockGetReservations(query: ReservationPeriodQuery): MockResponse {
  const { from, to } = query
  const invalidField = periodErrorField(from, to)
  if (invalidField) return fail(400, 'INVALID_INPUT', '조회 기간을 확인해 주세요.', invalidField)
  const items = reservations()
    .filter((r) => r.reservedAt.slice(0, 10) >= from && r.reservedAt.slice(0, 10) <= to)
    .sort((a, b) => a.reservedAt.localeCompare(b.reservedAt) || a.reservationId - b.reservationId)
    .map(toListItem)
  return ok({ from, to, items })
}

/** 08 42 — 날짜별 건수. total은 취소만 제외(진행중·노쇼 포함). 예약이 하나도 없는 날은 넣지 않는다. 기간 규칙은 15와 같다 */
export function mockGetReservationSummary(query: ReservationSummaryQuery): MockResponse {
  const { from, to } = query
  const invalidField = periodErrorField(from, to)
  if (invalidField) return fail(400, 'INVALID_INPUT', '조회 기간을 확인해 주세요.', invalidField)
  const byDate = new Map<string, ReservationDaySummary>()
  for (const r of reservations()) {
    const date = r.reservedAt.slice(0, 10)
    if (date < from || date > to) continue
    const day = byDate.get(date) ?? { date, total: 0, reserved: 0, inProgress: 0, completed: 0, canceled: 0, noShow: 0 }
    if (r.status !== 'CANCELED') day.total += 1
    if (r.status === 'RESERVED') day.reserved += 1
    else if (r.status === 'IN_PROGRESS') day.inProgress += 1
    else if (r.status === 'COMPLETED') day.completed += 1
    else if (r.status === 'CANCELED') day.canceled += 1
    else if (r.status === 'NO_SHOW') day.noShow += 1
    byDate.set(date, day)
  }
  return ok({ from, to, items: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) })
}

/** 08 16 (P0-나머지): 소유(404) → 30분 단위 → assigneeId(400) → 날짜(400) → 같은 차량 유효 예약(409) → 담당 중복(409) */
export function mockCreateReservation(body: ReservationCreateRequest): MockResponse {
  if (!vehicleOf(body.vehicleId)) return notFound()
  const invalid = invalidSlot(body.reservedAt ?? '') ?? invalidAssignee(body.assigneeId) ?? pastDate(body.reservedAt)
  if (invalid) return invalid
  const existing = reservations().find((r) => r.vehicleId === body.vehicleId && isActive(r))
  if (existing) {
    return fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', undefined, { reservationId: existing.reservationId })
  }
  const conflict = slotConflict(body.assigneeId, body.reservedAt)
  if (conflict) return conflict
  const created: MockReservation = {
    reservationId: nextId++,
    reservedAt: body.reservedAt,
    status: 'RESERVED',
    version: 0,
    vehicleId: body.vehicleId,
    itemIds: body.purpose?.itemIds ?? [],
    other: body.purpose?.other ?? false,
    memo: body.purpose?.memo ?? null,
    assigneeStaffId: body.assigneeId,
  }
  reservations().push(created)
  return ok(savedOf(created))
}

/** 오늘에서 months 개월 + days 일 (달 끝은 그 달 마지막 날로) */
function shiftDate(today: string, months: number, days: number): string {
  const [y, m, d] = today.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)))
  return addDays(date.toISOString().slice(0, 10), days)
}

/** 차량의 방문 이력 (11 모양, visitDate 내림차순 · 같으면 나중 방문 먼저) */
function visitsOf(vehicleId: number): RecentVisit[] {
  const today = todaySeoul()
  return seed.visits
    .map((v, index) => ({ v, index, visitDate: shiftDate(today, v.monthOffset, v.dayOffset) }))
    .filter(({ v }) => v.vehicleId === vehicleId)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.index - a.index)
    .map(({ v, visitDate }) => ({
      visitKey: v.visitKey,
      visitDate,
      mileage: v.mileage,
      staffName: v.staffName,
      records: v.records.map((r) => ({
        recordId: r.recordId,
        itemId: r.itemId,
        itemName: itemOf(r.itemId)?.name ?? '',
        type: r.type as VisitRecord['type'],
        date: visitDate,
        memo: r.memo,
        // P0-나머지 (#29): 외부만 고객 진술(07 3.7 CHECK), 점검 결과는 07 7.2 시드의 33아0008 마지막 점검만 CAUTION
        source: r.type === 'EXTERNAL' ? ('CUSTOMER_STATEMENT' as const) : ('SHOP' as const),
        inspectResult: 'inspectResult' in r ? (r.inspectResult as VisitRecord['inspectResult']) : null,
      })),
    }))
}

/**
 * 17 itemStatuses의 꼬리표 (P0-나머지 #29, 08 10 lastDecline·lastCaution). Mock 전용 — 시드 기록 중 그 항목의 가장 최근 기록이
 * 거절이면 lastDecline, 결과 CAUTION인 점검이면 lastCaution. 실제 판정은 서버(cycle CycleNotes)의 일이고 화면은 받은 값만 보인다.
 */
function notesOf(visits: RecentVisit[], itemId: number): Pick<PanelItemStatus, 'lastDecline' | 'lastCaution'> {
  const latest = visits.flatMap((v) => v.records).find((r) => r.itemId === itemId) // visits는 최신순
  const note = latest ? { date: latest.date, memo: latest.memo } : null
  return {
    lastDecline: latest?.type === 'DECLINE' ? note : null,
    lastCaution: latest?.type === 'INSPECT' && latest.inspectResult === 'CAUTION' ? note : null,
  }
}

/** 08 17 (최근 방문은 07 7.2 기록, 점검 주기는 단순화 — 위 주석) */
export function mockGetPanel(reservationId: number): MockResponse {
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  const vehicle = vehicleOf(r.vehicleId)!
  const customer = customerOf(vehicle.customerId)!
  const visits = visitsOf(vehicle.vehicleId)
  const panel: ReservationPanel = {
    reservation: {
      reservationId: r.reservationId,
      reservedAt: r.reservedAt,
      status: r.status,
      needsAction: needsAction(r),
      version: r.version,
      purpose: { items: r.itemIds.map((id) => ({ itemId: id, name: itemOf(id)?.name ?? '' })), other: r.other, memo: r.memo },
      assignee: assigneeOf(r.assigneeStaffId), // P0-나머지 (패널 담당 표시 #33, M-02 변경 모드의 지금 담당 #37)
    },
    customer: { customerId: customer.customerId, name: customer.name, phone: customer.phone, consent: customer.consent },
    vehicle: { vehicleId: vehicle.vehicleId, plateNumber: vehicle.plateNumber, model: vehicle.model, modelYear: vehicle.modelYear, latestMileage: vehicle.latestMileage },
    recentVisits: visits.slice(0, 2),
    // 외부 기록만 있는 방문은 세지 않는다 (08 17, 05 POL-45)
    totalVisitCount: visits.filter((v) => v.records.some((rec) => rec.type !== 'EXTERNAL')).length,
    itemStatuses: seed.items.map((item) => ({
      itemId: item.itemId,
      code: item.code,
      name: item.name,
      status: 'UNKNOWN',
      dueReason: null,
      baseRecord: null,
      nextDueDate: null,
      nextDueMileage: null,
      ...notesOf(visits, item.itemId),
      highlighted: r.itemIds.includes(item.itemId),
    })),
  }
  return ok(panel)
}

// 409 문구는 백엔드 ErrorCode와 같게 둔다(패널이 서버 message를 그대로 보이므로 Mock·실제 화면 문구가 같아야 함)
const STATUS_TRANSITION_MESSAGE = '지금 상태에서는 할 수 없는 변경입니다.'
const CONCURRENT_MESSAGE = '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.'

/** version 형식 (08 0.2·18·19): 누락은 fieldErrors[version], 숫자가 아닌 값(타입 불일치)은 fieldErrors 빈 배열 */
function invalidVersion(version: unknown): MockResponse | null {
  if (version === undefined || version === null) return fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', 'version')
  if (typeof version !== 'number') return fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.')
  return null
}

function checkVersion(version: number, r: MockReservation): MockResponse | null {
  if (version !== r.version) return fail(409, 'CONCURRENT_MODIFICATION', CONCURRENT_MESSAGE)
  return null
}

/** 08 18 — 형식(400) → 소유(404) → 상태(RESERVED, P0-나머지부터 IN_PROGRESS도) → version 순 */
export function mockComplete(reservationId: number, body: ReservationCompleteRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED' && r.status !== 'IN_PROGRESS') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  r.status = 'COMPLETED'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 08 20 — 형식(400) → 소유(404) → 상태(RESERVED·IN_PROGRESS) → version 순. 시각 전·후 모두 */
export function mockCancel(reservationId: number, body: ReservationStatusChangeRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED' && r.status !== 'IN_PROGRESS') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  r.status = 'CANCELED'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 08 21 — 형식 → 소유 → 상태(RESERVED만) → version → 시각(지났는지, R6) 순 */
export function mockNoShow(reservationId: number, body: ReservationStatusChangeRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  if (!(r.reservedAt < nowSeoul())) return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  r.status = 'NO_SHOW'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/**
 * 08 19 (보낸 필드만, RESERVED만): 형식 → 소유 → 상태 → version → 30분 단위 → assigneeId(X13) → 날짜 → 재배정 마감(R24)
 * → 같은 차량 유효 예약(reservedAt을 보낼 때만) → 담당 중복(R18, 새 담당·새 시각). 하나라도 어긋나면 아무것도 바꾸지 않는다.
 * 지금 담당과 같은 assigneeId는 재배정이 아니다(마감·이력 없음). 그것만 보냈으면 바꿀 것이 없어 400(assigneeId).
 */
export function mockUpdate(reservationId: number, body: ReservationUpdateRequest): MockResponse {
  const hasChange = body?.reservedAt !== undefined || body?.purpose !== undefined || body?.assigneeId !== undefined
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  if (!hasChange) return fail(400, 'INVALID_INPUT', '바꿀 내용이 없습니다.', 'reservedAt')
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  const inputError =
    (body.reservedAt !== undefined ? invalidSlot(body.reservedAt) : null) ??
    (body.assigneeId !== undefined ? invalidAssignee(body.assigneeId) : null) ??
    (body.reservedAt !== undefined ? pastDate(body.reservedAt) : null)
  if (inputError) return inputError
  const reassign = body.assigneeId !== undefined && body.assigneeId !== r.assigneeStaffId
  if (body.assigneeId !== undefined && !reassign && body.reservedAt === undefined && body.purpose === undefined) {
    return fail(400, 'INVALID_INPUT', '바뀐 항목이 없습니다. 지금 담당과 같습니다.', 'assigneeId')
  }
  const reason = body.reassignReason?.trim() ? body.reassignReason.trim() : null
  if (reassign) {
    const before = r.reservedAt.slice(0, 10) // 마감 기준은 변경 전 예약 날짜
    const today = todaySeoul()
    if (before < today || (before === today && MOCK_LOGIN_ROLE !== 'OWNER')) {
      return fail(409, 'ASSIGNEE_CHANGE_CLOSED', '지금은 담당 정비사를 바꿀 수 없습니다.')
    }
    if (before === today && reason === null) return fail(400, 'INVALID_INPUT', '당일 재배정은 사유를 입력해 주세요.', 'reassignReason')
  }
  if (body.reservedAt !== undefined) {
    const other = reservations().find((x) => x !== r && x.vehicleId === r.vehicleId && isActive(x))
    if (other) {
      return fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', undefined, { reservationId: other.reservationId })
    }
  }
  const conflict = slotConflict(reassign ? body.assigneeId! : r.assigneeStaffId, body.reservedAt ?? r.reservedAt, r)
  if (conflict) return conflict
  if (body.reservedAt !== undefined) r.reservedAt = body.reservedAt
  if (reassign) {
    // 08 19: 재배정은 reservation_revision(kind ASSIGNEE)에 이전·새 담당·사유·수정자를 남긴다(조회 41). 같은 담당은 이력 없음
    const person = (staffId: number) => ({ staffId, name: assigneeOf(staffId)?.name ?? '' })
    addRevision(r.reservationId, {
      kind: 'ASSIGNEE', changedAt: nowSeoul(), changedBy: MOCK_OWNER, reason,
      changes: [{ field: 'assignee', before: person(r.assigneeStaffId), after: person(body.assigneeId!) }],
    })
    r.assigneeStaffId = body.assigneeId!
  }
  if (body.purpose) {
    if (body.purpose.itemIds !== undefined) r.itemIds = body.purpose.itemIds
    if (body.purpose.other !== undefined) r.other = body.purpose.other
    if (body.purpose.memo !== undefined && body.purpose.memo !== null) r.memo = body.purpose.memo === '' ? null : body.purpose.memo
  }
  r.version += 1
  return ok(savedOf(r))
}

/** 08 39 — 형식 → 소유 → 상태(RESERVED만) → version → 차량 연식·주행거리(비어 있으면 필수, D-58) 순. 응답은 18과 같은 4필드(08 7.1 39) */
export function mockStart(reservationId: number, body: ReservationStartRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  const vehicle = vehicleOf(r.vehicleId)!
  const fieldErrors = []
  if (vehicle.modelYear == null && body.modelYear == null) fieldErrors.push({ field: 'modelYear', reason: '차량의 연식이 비어 있어 입력해 주세요.' })
  if (vehicle.latestMileage == null && body.mileage == null) fieldErrors.push({ field: 'mileage', reason: '차량의 주행거리가 비어 있어 입력해 주세요.' })
  if (fieldErrors.length > 0) {
    return { status: 400, body: { success: false, data: null, error: { code: 'INVALID_INPUT', message: '입력값을 확인해 주세요.', fieldErrors, details: null } } }
  }
  const fill = { ...vehicleFills.get(r.vehicleId) }
  if (vehicle.modelYear == null && body.modelYear != null) fill.modelYear = body.modelYear
  if (body.mileage != null && (vehicle.latestMileage == null || body.mileage > vehicle.latestMileage)) fill.latestMileage = body.mileage
  vehicleFills.set(r.vehicleId, fill)
  r.status = 'IN_PROGRESS'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 40 상태 정정 허용표 (08 7.1 40): 취소↔노쇼, 취소·노쇼 → 완료. 완료 → 취소·노쇼는 안 됨 */
const CORRECTABLE: Record<string, ReservationStatus[]> = {
  CANCELED: ['NO_SHOW', 'COMPLETED'],
  NO_SHOW: ['CANCELED', 'COMPLETED'],
  COMPLETED: [],
}
const MOCK_OWNER = { staffId: 1, name: '박사장' }

function addRevision(reservationId: number, revision: ReservationRevision): void {
  revisions.set(reservationId, [...(revisions.get(reservationId) ?? []), revision])
}

/** 08 40 — 형식 → 소유 → 끝난 예약인지 → version → (권한: Mock은 사장) → 바뀐 것 있는지 → 허용표 순. 응답은 18과 같은 모양 */
export function mockCorrect(reservationId: number, body: ReservationCorrectRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  if (body.status !== undefined && !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(body.status)) {
    return fail(400, 'INVALID_INPUT', '정정할 수 있는 상태는 완료·취소·노쇼입니다.', 'status')
  }
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (!(r.status in CORRECTABLE)) return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  const nextStatus = body.status !== undefined && body.status !== r.status ? body.status : undefined
  const nextMemo = body.purposeMemo !== undefined ? (body.purposeMemo === '' ? null : body.purposeMemo) : undefined
  const memoChanged = nextMemo !== undefined && nextMemo !== r.memo
  if (!nextStatus && !memoChanged) return fail(400, 'INVALID_INPUT', '바뀐 항목이 없습니다.', body.status !== undefined ? 'status' : 'purposeMemo')
  if (nextStatus && !CORRECTABLE[r.status].includes(nextStatus)) return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const changedAt = nowSeoul()
  const reason = body.reason?.trim() ? body.reason : null
  if (nextStatus) {
    addRevision(r.reservationId, { kind: 'STATUS', changedAt, changedBy: MOCK_OWNER, reason, changes: [{ field: 'status', before: r.status, after: nextStatus }] })
    r.status = nextStatus
  }
  if (memoChanged) {
    addRevision(r.reservationId, { kind: 'MEMO', changedAt, changedBy: MOCK_OWNER, reason, changes: [{ field: 'purposeMemo', before: r.memo, after: nextMemo ?? null }] })
    r.memo = nextMemo ?? null
  }
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 08 41 — 오래된 것부터, 없으면 [] */
export function mockGetRevisions(reservationId: number): MockResponse {
  if (!reservations().some((x) => x.reservationId === reservationId)) return notFound()
  return ok({ items: revisions.get(reservationId) ?? [] })
}
