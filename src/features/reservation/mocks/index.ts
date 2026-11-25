// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 15~19의 사본이며 계약의 기준은 08이다.
// 값은 07 7.1~7.3 시드(seed.json). 예약 날짜는 오늘(서울) 기준으로 계산하고, 바뀐 상태는 메모리에만 둔다(새로 고치면 처음으로).
// 패널(17)의 정비 이력·점검 주기는 단순화: 최근 방문 없음, 항목 상태 모두 미확인. 실제 값은 백엔드 연결로 확인한다.
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
  ReservationUpdateRequest,
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
}

const MAX_DAYS = 42
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
  }
  reservations().push(created)
  return ok({ reservationId: created.reservationId, status: created.status, reservedAt: created.reservedAt, vehicleId: created.vehicleId, version: 0 })
}

/** 08 17 (정비 이력·점검 주기는 단순화, 위 주석) */
export function mockGetPanel(reservationId: number): MockResponse {
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  const vehicle = vehicleOf(r.vehicleId)!
  const customer = customerOf(vehicle.customerId)!
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
    recentVisits: [],
    totalVisitCount: 0,
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

function checkVersion(version: unknown, r: MockReservation): MockResponse | null {
  if (typeof version !== 'number') return fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', 'version')
  if (version !== r.version) return fail(409, 'CONCURRENT_MODIFICATION', '다른 사용자가 먼저 바꿨습니다. 최신 내용을 확인해 주세요.')
  return null
}

/** 08 18 (P0-핵심: RESERVED에서만) */
export function mockComplete(reservationId: number, body: ReservationCompleteRequest): MockResponse {
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (typeof body?.version !== 'number') return fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', 'version')
  if (r.status !== 'RESERVED' && r.status !== 'IN_PROGRESS') {
    return fail(409, 'INVALID_STATUS_TRANSITION', '이 예약은 지금 상태에서 방문 완료할 수 없습니다.')
  }
  const versionError = checkVersion(body.version, r)
  if (versionError) return versionError
  r.status = 'COMPLETED'
  r.version += 1
  return ok({ reservationId: r.reservationId, status: r.status, vehicleId: r.vehicleId, version: r.version })
}

/** 08 19 (보낸 필드만, RESERVED만) */
export function mockUpdate(reservationId: number, body: ReservationUpdateRequest): MockResponse {
  const hasChange = body?.reservedAt !== undefined || body?.purpose !== undefined || body?.assigneeId !== undefined
  if (typeof body?.version !== 'number') return fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', 'version')
  if (!hasChange) return fail(400, 'INVALID_INPUT', '바꿀 내용이 없습니다.', 'reservedAt')
  const r = reservations().find((x) => x.reservationId === reservationId)
  if (!r) return notFound()
  if (r.status !== 'RESERVED') return fail(409, 'INVALID_STATUS_TRANSITION', '이 예약은 지금 상태에서 바꿀 수 없습니다.')
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
