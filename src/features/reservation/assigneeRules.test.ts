import { beforeEach, describe, expect, it } from 'vitest'
import {
  canReassign, closedMessage, defaultCreateAssignee, needsReassignReason, reassignWindow,
} from './assigneeRules'
import { addDays, todaySeoul } from './dates'
import { mockCancel, mockCreateReservation, mockGetPanel, mockGetRevisions, mockStart, mockUpdate, resetReservationMocks } from './mocks'
import { createRequest, emptyForm, fieldOf, formFromReservation, updateRequest, validateForm } from './reservationForm'
import type { EditTarget } from './reservationForm'

// M-02 담당 정비사 (#37, 09 M-02, 08 16·19 담당 재배정 규칙, 04 R15~R20·R24). 화면 없이 규칙·요청·Mock.

const TODAY = '2026-11-26'

describe('등록 기본 담당', () => {
  it('로그인 계정이 후보에 있으면 그 계정, 없거나 모르면 null(고르게 한다)', () => {
    expect(defaultCreateAssignee([1, 2], 2)).toBe(2)
    expect(defaultCreateAssignee([1, 2], 9)).toBeNull()
    expect(defaultCreateAssignee([1, 2], null)).toBeNull()
    expect(defaultCreateAssignee([], 1)).toBeNull() // 후보를 아직 못 받음
  })
})

describe('재배정 가능 구간 (R24, 기준은 변경 전 예약 날짜·서울 오늘)', () => {
  it('(a) 전날까지: 사장·정비사 모두 가능', () => {
    expect(reassignWindow('2026-11-27', TODAY, 'MECHANIC')).toBe('open')
    expect(reassignWindow('2026-11-27', TODAY, 'OWNER')).toBe('open')
    expect(canReassign('open')).toBe(true)
  })

  it('(b)(c) 당일: 사장만 가능(사유 필수), 정비사·역할을 모르면 닫힘', () => {
    expect(reassignWindow(TODAY, TODAY, 'OWNER')).toBe('ownerToday')
    expect(canReassign('ownerToday')).toBe(true)
    expect(reassignWindow(TODAY, TODAY, 'MECHANIC')).toBe('closedToday')
    expect(reassignWindow(TODAY, TODAY, null)).toBe('closedToday')
    expect(canReassign('closedToday')).toBe(false)
    expect(closedMessage('closedToday')).toMatch(/사장만/)
  })

  it('(f) 지난 날짜: 사장도 닫힘', () => {
    expect(reassignWindow('2026-11-25', TODAY, 'OWNER')).toBe('closedPast')
    expect(canReassign('closedPast')).toBe(false)
    expect(closedMessage('closedPast')).toMatch(/지난 날짜/)
    expect(closedMessage('open')).toBeNull()
  })

  it('사유는 당일 사장이 담당을 실제로 바꿀 때만 필수', () => {
    expect(needsReassignReason('ownerToday', 2, 1)).toBe(true)
    expect(needsReassignReason('ownerToday', 2, 2)).toBe(false) // 같은 담당은 재배정이 아님
    expect(needsReassignReason('ownerToday', 2, null)).toBe(false)
    expect(needsReassignReason('open', 2, 1)).toBe(false)
  })
})

const target: EditTarget = {
  reservationId: 3,
  version: 2,
  reservedAt: '2026-11-28T10:00:00',
  purpose: { items: [{ itemId: 1, name: '엔진오일' }], other: false, memo: null },
  vehicle: { vehicleId: 2, plateNumber: '34나0002', customerName: '이영희' },
  assignee: { staffId: 2, name: '김정비', colorIndex: 1 },
}

describe('요청 만들기 (16·19 담당)', () => {
  it('16: assigneeId를 항상 보낸다 (R19)', () => {
    const values = { ...emptyForm('2026-11-27', { vehicleId: 1, plateNumber: '12가0001' }), time: '11:30', assigneeId: 2 }
    expect(createRequest(values)).toEqual({
      vehicleId: 1, reservedAt: '2026-11-27T11:30:00', assigneeId: 2, purpose: { itemIds: [], other: false, memo: null },
    })
  })

  it('등록: 담당이 비면 칸 오류, 변경은 담당을 검사하지 않는다', () => {
    const base = { ...emptyForm('2026-11-27', { vehicleId: 1, plateNumber: '12가0001' }), time: '10:00' }
    expect(validateForm(base, TODAY, '09:00', 'create').assignee).toBe('담당 정비사를 골라 주세요.')
    expect(validateForm({ ...base, assigneeId: 1 }, TODAY, '09:00', 'create')).toEqual({})
    expect(validateForm({ ...formFromReservation({ ...target, assignee: null }) }, TODAY, '09:00', 'edit')).toEqual({})
  })

  it('19: 지금 담당과 다를 때만 assigneeId, 같으면 바뀐 게 없음(null)', () => {
    const same = formFromReservation(target)
    expect(same.assigneeId).toBe(2)
    expect(updateRequest(target, same)).toBeNull()
    expect(updateRequest(target, { ...same, assigneeId: 1 })).toEqual({ version: 2, assigneeId: 1 })
    expect(updateRequest(target, { ...same, assigneeId: 1, time: '11:00' })).toEqual({ version: 2, reservedAt: '2026-11-28T11:00:00', assigneeId: 1 })
  })

  it('19: 사유는 reasonRequired(당일 사장)일 때만 앞뒤 공백을 빼고 보낸다', () => {
    const changed = { ...formFromReservation(target), assigneeId: 1, reassignReason: '  김정비 병가  ' }
    expect(updateRequest(target, changed)).toEqual({ version: 2, assigneeId: 1 })
    expect(updateRequest(target, changed, { reasonRequired: true })).toEqual({ version: 2, assigneeId: 1, reassignReason: '김정비 병가' })
  })

  it('사유 필수: 비었거나 공백뿐이면 칸 오류, 200자 초과도 막는다', () => {
    const values = { ...formFromReservation(target), assigneeId: 1 }
    expect(validateForm({ ...values, reassignReason: '   ' }, TODAY, '09:00', 'edit', { reasonRequired: true }).reassignReason).toMatch(/사유/)
    expect(validateForm({ ...values, reassignReason: 'x'.repeat(201) }, TODAY, '09:00', 'edit', { reasonRequired: true }).reassignReason).toMatch(/200자/)
    expect(validateForm({ ...values, reassignReason: '병가' }, TODAY, '09:00', 'edit', { reasonRequired: true })).toEqual({})
    expect(validateForm(values, TODAY, '09:00', 'edit')).toEqual({})
  })

  it('서버 fieldErrors: assigneeId → 담당 칸, reassignReason → 사유 칸', () => {
    expect(fieldOf('assigneeId')).toBe('assignee')
    expect(fieldOf('reassignReason')).toBe('reassignReason')
  })
})

describe('Mock 16·19 담당 (07 7.3 시드: 예약 1 오늘 10:00 김정비, 예약 3 이틀 뒤 10:00 김정비, 예약 4 어제 박사장)', () => {
  const today = todaySeoul()
  const later = addDays(today, 2)
  const error = (r: { body: unknown }) => (r.body as { error: { code: string; fieldErrors: { field: string }[]; details: unknown } }).error
  const data = (r: { body: unknown }) => (r.body as { data: { version: number; assignee: unknown } }).data

  beforeEach(() => resetReservationMocks())

  it('R19·R20: 담당 없음·남의 id는 400 assigneeId', () => {
    const none = mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T11:00:00` } as never)
    expect(none.status).toBe(400)
    expect(error(none).fieldErrors[0].field).toBe('assigneeId')
    expect(error(mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T11:00:00`, assigneeId: 99 })).fieldErrors[0].field).toBe('assigneeId')
  })

  it('R15·R16: 같은 담당·같은 시각은 409와 겹친 예약 번호, 다른 담당은 성공(응답에 assignee)', () => {
    const conflict = mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T10:00:00`, assigneeId: 2 })
    expect(conflict.status).toBe(409)
    expect(error(conflict).code).toBe('MECHANIC_SLOT_CONFLICT')
    expect(error(conflict).details).toEqual({ reservationId: 3 })
    const other = mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T10:00:00`, assigneeId: 1 })
    expect(other.status).toBe(200)
    expect(data(other).assignee).toEqual({ staffId: 1, name: '박사장', colorIndex: 0 })
  })

  it('R17: 같은 담당·같은 시각이어도 기존 예약이 취소면 등록된다', () => {
    expect(mockCancel(3, { version: 0 }).status).toBe(200)
    expect(mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T10:00:00`, assigneeId: 2 }).status).toBe(200)
  })

  it('R22: 기존 예약이 진행중이어도 같은 담당·같은 시각은 409 MECHANIC_SLOT_CONFLICT', () => {
    expect(mockStart(3, { version: 0 }).status).toBe(200)
    const conflict = mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T10:00:00`, assigneeId: 2 })
    expect(conflict.status).toBe(409)
    expect(error(conflict).code).toBe('MECHANIC_SLOT_CONFLICT')
  })

  it('17 패널에 지금 담당이 온다 (M-02 변경 모드 기본값)', () => {
    expect((mockGetPanel(3).body as { data: { reservation: { assignee: unknown } } }).data.reservation.assignee).toEqual({ staffId: 2, name: '김정비', colorIndex: 1 })
  })

  it('R24 (a): 전날까지 재배정 성공, 응답에 새 담당·version +1, 41 이력에 ASSIGNEE', () => {
    const res = mockUpdate(3, { version: 0, assigneeId: 1 })
    expect(res.status).toBe(200)
    expect(data(res)).toMatchObject({ version: 1, assignee: { staffId: 1, name: '박사장', colorIndex: 0 } })
    const items = (mockGetRevisions(3).body as { data: { items: { kind: string; reason: unknown; changes: unknown[] }[] } }).data.items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'ASSIGNEE', reason: null,
      changes: [{ field: 'assignee', before: { staffId: 2, name: '김정비' }, after: { staffId: 1, name: '박사장' } }],
    })
  })

  it('R24 (c)(d): 당일 사장(Mock 로그인) 재배정은 사유 필수', () => {
    const noReason = mockUpdate(1, { version: 0, assigneeId: 1, reassignReason: '  ' })
    expect(noReason.status).toBe(400)
    expect(error(noReason).fieldErrors[0].field).toBe('reassignReason')
    expect(mockUpdate(1, { version: 0, assigneeId: 1, reassignReason: '병가' }).status).toBe(200)
  })

  it('R24 (f): 지난 날짜는 409 ASSIGNEE_CHANGE_CLOSED, 예약·version 그대로', () => {
    const closed = mockUpdate(4, { version: 0, assigneeId: 2 })
    expect(closed.status).toBe(409)
    expect(error(closed).code).toBe('ASSIGNEE_CHANGE_CLOSED')
    expect(mockUpdate(4, { version: 0, purpose: { memo: '메모' } }).status).toBe(200) // 담당 말고 다른 변경은 된다
  })

  it('같은 담당만 보내면 재배정이 아니라 바꿀 것이 없음(400 assigneeId), 마감도 보지 않는다', () => {
    const same = mockUpdate(4, { version: 0, assigneeId: 1 })
    expect(same.status).toBe(400)
    expect(error(same).fieldErrors[0].field).toBe('assigneeId')
  })

  it('R18: 재배정으로 같은 담당·같은 시각이 되면 409, 예약·version 그대로', () => {
    const created = data(mockCreateReservation({ vehicleId: 1, reservedAt: `${later}T10:00:00`, assigneeId: 1 })) as unknown as { reservationId: number }
    const conflict = mockUpdate(created.reservationId, { version: 0, assigneeId: 2 })
    expect(conflict.status).toBe(409)
    expect(error(conflict).details).toEqual({ reservationId: 3 })
    expect(mockUpdate(created.reservationId, { version: 0, purpose: { memo: '메모' } }).status).toBe(200) // version 그대로
  })
})
