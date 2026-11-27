import { describe, expect, it } from 'vitest'
import {
  MAIN_SLOTS, OTHER_SLOTS, createRequest, emptyForm, fieldOf, formFromReservation, isPastSlot, updateRequest, validateForm,
} from './reservationForm'
import type { EditTarget } from './reservationForm'

// M-02 판단 규칙 (09 M-02, 08 16·19, R1·R2·R14, chagok-frontend#25)
const TODAY = '2026-11-26'
const target: EditTarget = {
  reservationId: 3,
  version: 2,
  reservedAt: '2026-11-28T10:00:00',
  purpose: { items: [{ itemId: 1, name: '엔진오일' }], other: false, memo: null },
  vehicle: { vehicleId: 2, plateNumber: '34나0002', customerName: '이영희' },
}

describe('시각 선택지', () => {
  it('버튼은 08:00~19:30 30분 단위 24개, 나머지는 "그 밖 시각"', () => {
    expect(MAIN_SLOTS[0]).toBe('08:00')
    expect(MAIN_SLOTS.at(-1)).toBe('19:30')
    expect(MAIN_SLOTS).toHaveLength(24)
    expect(OTHER_SLOTS).toHaveLength(24)
    expect(OTHER_SLOTS).toContain('07:30')
    expect(OTHER_SLOTS).toContain('20:00')
    expect([...MAIN_SLOTS, ...OTHER_SLOTS].every((t) => /:(00|30)$/.test(t))).toBe(true)
  })

  it('오늘은 지금 시각까지 막고, 다른 날은 막지 않는다', () => {
    expect(isPastSlot(TODAY, '13:00', TODAY, '13:10')).toBe(true)
    expect(isPastSlot(TODAY, '13:30', TODAY, '13:10')).toBe(false)
    expect(isPastSlot('2026-11-27', '08:00', TODAY, '13:10')).toBe(false)
    expect(isPastSlot('2026-11-25', '18:00', TODAY, '13:10')).toBe(true)
  })
})

describe('validateForm', () => {
  it('등록: 차량·날짜·시각 필수, 예약 목적은 선택', () => {
    expect(validateForm(emptyForm(TODAY), TODAY, '09:00', 'create')).toEqual({
      vehicle: '차량을 골라 주세요.', time: '시각을 골라 주세요.', assignee: '담당 정비사를 골라 주세요.',
    })
    const ok = { ...emptyForm('2026-11-27', { vehicleId: 1, plateNumber: '12가0001' }), time: '10:00', assigneeId: 1 }
    expect(validateForm(ok, TODAY, '09:00', 'create')).toEqual({})
  })

  it('과거 날짜·지난 시각·30분 단위 아님·메모 200자 초과를 막는다', () => {
    const base = { ...emptyForm(TODAY, { vehicleId: 1, plateNumber: '12가0001' }), time: '10:00' }
    expect(validateForm({ ...base, date: '2026-11-25' }, TODAY, '09:00', 'create').date).toMatch(/오늘 이후/)
    expect(validateForm(base, TODAY, '11:00', 'create').time).toMatch(/지난 시각/)
    expect(validateForm({ ...base, time: '10:15' }, TODAY, '09:00', 'create').time).toMatch(/30분/)
    expect(validateForm({ ...base, memo: 'x'.repeat(201) }, TODAY, '09:00', 'create').memo).toMatch(/200자/)
  })

  it('변경: 차량 칸은 검사하지 않는다(바꿀 수 없음)', () => {
    expect(validateForm({ ...formFromReservation(target), vehicle: null }, TODAY, '09:00', 'edit')).toEqual({})
  })

  it('변경 #71: 일시를 그대로 두면 지난 날짜·지난 시각이어도 막지 않는다 (08 19: reservedAt을 보낼 때만 날짜 규칙)', () => {
    const past = { ...target, reservedAt: '2026-11-25T10:00:00' } // 어제 (처리 필요)
    const todayPast = { ...target, reservedAt: `${TODAY}T10:00:00` } // 오늘, 지금(11:00)보다 이른 시각
    const memoOnly = (t: EditTarget) => ({ ...formFromReservation(t), memo: '목적만 변경' })
    expect(validateForm(memoOnly(past), TODAY, '11:00', 'edit', { originalReservedAt: past.reservedAt })).toEqual({})
    expect(validateForm(memoOnly(todayPast), TODAY, '11:00', 'edit', { originalReservedAt: todayPast.reservedAt })).toEqual({})
    // 일시를 바꾸면 기존처럼 막는다
    expect(validateForm({ ...memoOnly(past), time: '10:30' }, TODAY, '11:00', 'edit', { originalReservedAt: past.reservedAt }).date).toMatch(/오늘 이후/)
    expect(validateForm({ ...memoOnly(todayPast), time: '10:30' }, TODAY, '11:00', 'edit', { originalReservedAt: todayPast.reservedAt }).time).toMatch(/지난 시각/)
    // 30분 단위 검사는 일시를 그대로 둬도 한다
    expect(validateForm({ ...memoOnly(past), time: '10:15' }, TODAY, '11:00', 'edit', { originalReservedAt: '2026-11-25T10:15:00' }).time).toMatch(/30분/)
    // 등록은 originalReservedAt이 와도 그대로 검사한다
    expect(validateForm({ ...memoOnly(past), vehicle: target.vehicle, assigneeId: 1 }, TODAY, '11:00', 'create', { originalReservedAt: past.reservedAt }).date).toMatch(/오늘 이후/)
  })
})

describe('요청 만들기', () => {
  it('16: 담당(assigneeId, P0-나머지 필수 #37)과 함께, 메모가 비면 null', () => {
    const values = { ...emptyForm('2026-11-27', { vehicleId: 1, plateNumber: '12가0001' }), time: '11:30', itemIds: [1, 4], memo: '  ', assigneeId: 2 }
    expect(createRequest(values)).toEqual({
      vehicleId: 1, reservedAt: '2026-11-27T11:30:00', assigneeId: 2, purpose: { itemIds: [1, 4], other: false, memo: null },
    })
  })

  it('19: version + 바뀐 칸만, 바뀐 게 없으면 null (R14)', () => {
    const same = formFromReservation(target)
    expect(updateRequest(target, same)).toBeNull()
    expect(updateRequest(target, { ...same, time: '11:00' })).toEqual({ version: 2, reservedAt: '2026-11-28T11:00:00' })
    expect(updateRequest(target, { ...same, itemIds: [1, 4] })).toEqual({ version: 2, purpose: { itemIds: [1, 4], other: false, memo: '' } })
  })

  it('19: 메모를 지우면 "" 로 보낸다 (19: ""이면 비움)', () => {
    const withMemo: EditTarget = { ...target, purpose: { ...target.purpose, memo: '에어컨 냄새' } }
    expect(updateRequest(withMemo, { ...formFromReservation(withMemo), memo: '' })?.purpose?.memo).toBe('')
  })

  it('서버 fieldErrors 필드 → 칸', () => {
    expect(fieldOf('reservedAt')).toBe('time')
    expect(fieldOf('vehicleId')).toBe('vehicle')
    expect(fieldOf('purpose.itemIds')).toBe('purpose')
    expect(fieldOf('purpose.memo')).toBe('memo')
    expect(fieldOf('version')).toBeNull()
  })
})
