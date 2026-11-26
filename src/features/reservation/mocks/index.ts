// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 15~19·42의 사본이며 계약의 기준은 08이다.
// 값은 07 7.1~7.3 시드(seed.json). 예약 날짜는 오늘(서울) 기준으로 계산하고, 바뀐 상태는 메모리에만 둔다(새로 고치면 처음으로).
// 15 목록의 담당(assignee, P0-나머지)은 07 7.3 담당 계정(seed.json staff·assigneeStaffId, #30).
// 패널(17)의 최근 방문·총 방문 수는 07 7.2 기록(seed.json visits, #26)으로 만든다(11 모양, 최신순 2회, 외부만 있는 방문은 세지 않음 POL-45).
// LIMIT: 점검 주기(itemStatuses)는 단순화 — 항목 상태 모두 미확인. 상태 판정은 서버(cycle)의 일이라 Mock에서 계산하지 않는다. 실제 값은 백엔드 연결로 확인한다.
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { MockResponse } from '@/shared/api/client'
import { addDays, nowSeoul, todaySeoul } from '../dates'
import type {
  ReservationCompleteRequest,
  ReservationCreateRequest,
  ReservationListItem,
  ReservationPanel,
  ReservationPeriodQuery,
  ReservationStatus,
  ReservationSummaryQuery,
  ReservationDaySummary,
  ReservationUpdateRequest,
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
/** LIMIT: Mock은 로그인 계정을 모른다. 담당 없이 등록하면(P0-핵심 16) 사장(owner_a)으로 둔다. 실제는 서버가 토큰 계정으로 채운다 */
const DEFAULT_ASSIGNEE_ID = 1
let store: MockReservation[] | null = null
let nextId = 100

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
}

const ok = (data: unknown, status = 200): MockResponse => ({ status, body: { success: true, data, error: null } })
const fail = (status: number, code: string, message: string, field?: string, details: Record<string, unknown> | null = null): MockResponse => ({
  status,
  body: { success: false, data: null, error: { code, message, fieldErrors: field ? [{ field, reason: message }] : [], details } },
})
const notFound = () => fail(404, 'NOT_FOUND', '찾을 수 없습니다.')

const vehicleOf = (vehicleId: number) => seed.vehicles.find((v) => v.vehicleId === vehicleId)
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

function invalidReservedAt(value: string): MockResponse | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00$/.test(value)) {
    return fail(400, 'INVALID_INPUT', '예약 시각은 30분 단위로 입력해 주세요.', 'reservedAt')
  }
  if (value.slice(0, 10) < todaySeoul()) {
    return fail(400, 'RESERVATION_PAST_DATE', '오늘 이후 날짜만 예약할 수 있습니다.')
  }
  return null
}

/** 08 15 */
export function mockGetReservations(query: ReservationPeriodQuery): MockResponse {
  const { from, to } = query
  if (!from || !to || from > to || addDays(from, MAX_DAYS - 1) < to) {
    return fail(400, 'INVALID_INPUT', '조회 기간을 확인해 주세요.', !from ? 'from' : 'to')
  }
  const items = reservations()
    .filter((r) => r.reservedAt.slice(0, 10) >= from && r.reservedAt.slice(0, 10) <= to)
    .sort((a, b) => a.reservedAt.localeCompare(b.reservedAt) || a.reservationId - b.reservationId)
    .map(toListItem)
  return ok({ from, to, items })
}

/** 08 42 — 날짜별 건수. total은 취소만 제외(진행중·노쇼 포함). 예약이 하나도 없는 날은 넣지 않는다(❓ #40 확인 중, types.ts) */
export function mockGetReservationSummary(query: ReservationSummaryQuery): MockResponse {
  const { from, to } = query
  if (!from || !to || from > to || addDays(from, MAX_DAYS - 1) < to) {
    return fail(400, 'INVALID_INPUT', '조회 기간을 확인해 주세요.', !from ? 'from' : 'to')
  }
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
  return ok([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)))
}

/** 08 16 (P0-핵심: 담당은 서버가 채움) */
export function mockCreateReservation(body: ReservationCreateRequest): MockResponse {
  if (!vehicleOf(body.vehicleId)) return notFound()
  const invalid = invalidReservedAt(body.reservedAt ?? '')
  if (invalid) return invalid
  const existing = reservations().find((r) => r.vehicleId === body.vehicleId && isActive(r))
  if (existing) {
    return fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', undefined, { reservationId: existing.reservationId })
  }
  const created: MockReservation = {
    reservationId: nextId++,
    reservedAt: body.reservedAt,
    status: 'RESERVED',
    version: 0,
    vehicleId: body.vehicleId,
    itemIds: body.purpose?.itemIds ?? [],
    other: body.purpose?.other ?? false,
    memo: body.purpose?.memo ?? null,
    assigneeStaffId: body.assigneeId ?? DEFAULT_ASSIGNEE_ID,
  }
  reservations().push(created)
  return ok({ reservationId: created.reservationId, status: created.status, reservedAt: created.reservedAt, vehicleId: created.vehicleId, version: 0 })
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
      })),
    }))
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

/** 08 18 — 형식(400) → 소유(404) → 상태(P0-핵심은 RESERVED만, IN_PROGRESS는 P0-나머지) → version 순 */
export function mockComplete(reservationId: number, body: ReservationCompleteRequest): MockResponse {
  const invalid = invalidVersion(body?.version)
  if (invalid) return invalid
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED') return fail(409, 'INVALID_STATUS_TRANSITION', STATUS_TRANSITION_MESSAGE)
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  r.status = 'COMPLETED'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 08 19 (보낸 필드만, RESERVED만) */
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
  if (body.reservedAt !== undefined) {
    const invalid = invalidReservedAt(body.reservedAt)
    if (invalid) return invalid
    const other = reservations().find((x) => x !== r && x.vehicleId === r.vehicleId && isActive(x))
    if (other) {
      return fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', undefined, { reservationId: other.reservationId })
    }
    r.reservedAt = body.reservedAt
  }
  if (body.purpose) {
    if (body.purpose.itemIds !== undefined) r.itemIds = body.purpose.itemIds
    if (body.purpose.other !== undefined) r.other = body.purpose.other
    if (body.purpose.memo !== undefined && body.purpose.memo !== null) r.memo = body.purpose.memo === '' ? null : body.purpose.memo
  }
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, reservedAt: r.reservedAt, vehicleId: r.vehicleId, version: r.version })
}
