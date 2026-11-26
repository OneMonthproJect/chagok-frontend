import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, parseResponse } from '@/shared/api/client'
import { MECHANIC_MESSAGES, defaultMechanic, splitMechanicFieldErrors, validateMechanic, withMechanic } from './mechanicFlow'
import { mockSaveVisit } from './mocks'
import type { VisitSaveRequest, VisitSaveResponse } from './types'

// S-08 담당 정비사 (#62): 기본값(09 S-08 5번·05 POL-59), 저장 요청 mechanicId(08 12), X13 400 처리,
// 12 Mock의 mechanicId 검사(08 12 X13, chagok-backend#102 resolveMechanic와 같은 순서·문구).

afterEach(() => {
  vi.useRealTimers()
})

function parseError(response: { status: number; body: unknown }): ApiError {
  try {
    parseResponse(response.status, response.body)
  } catch (e) {
    return e as ApiError
  }
  throw new Error('should have failed')
}

/** 08 12 P0-나머지 요청 예시 중 P0-핵심 기록 + mechanicId 2 */
const SAVE: VisitSaveRequest = {
  visitDate: '2026-11-24',
  mileage: 55000,
  mechanicId: 2,
  records: [{ itemId: 1, type: 'REPLACE', memo: null }],
}

describe('기본 담당 (05 POL-59, 04 F-MNT-01)', () => {
  const candidateIds = [1, 2]

  it('직접 진입이면 로그인 계정', () => {
    expect(defaultMechanic({ candidateIds, fromReservation: false, reservationAssigneeId: null, loginStaffId: 2 })).toEqual({
      mechanicId: 2,
      reservationFallback: false,
    })
  })

  it('직접 진입이면 예약 담당 값이 있어도 쓰지 않는다', () => {
    expect(defaultMechanic({ candidateIds, fromReservation: false, reservationAssigneeId: 1, loginStaffId: 2 }).mechanicId).toBe(2)
  })

  it('예약 경유면 그 예약의 담당(로그인 계정이 아니어도)', () => {
    expect(defaultMechanic({ candidateIds, fromReservation: true, reservationAssigneeId: 1, loginStaffId: 2 })).toEqual({
      mechanicId: 1,
      reservationFallback: false,
    })
  })

  it('예약 경유인데 예약 담당을 모르거나(17 실패·assignee 없음) 후보에 없으면 로그인 계정 + 안내', () => {
    for (const reservationAssigneeId of [null, 9]) {
      expect(defaultMechanic({ candidateIds, fromReservation: true, reservationAssigneeId, loginStaffId: 2 })).toEqual({
        mechanicId: 2,
        reservationFallback: true,
      })
    }
  })

  it('로그인 계정도 모르거나 후보에 없으면 비워 둔다(사람이 고른다)', () => {
    expect(defaultMechanic({ candidateIds, fromReservation: false, reservationAssigneeId: null, loginStaffId: null }).mechanicId).toBeNull()
    expect(defaultMechanic({ candidateIds: [], fromReservation: false, reservationAssigneeId: null, loginStaffId: 2 }).mechanicId).toBeNull()
    expect(defaultMechanic({ candidateIds, fromReservation: true, reservationAssigneeId: 9, loginStaffId: 9 })).toEqual({
      mechanicId: null,
      reservationFallback: true,
    })
  })
})

describe('검사·요청·400 (08 12, X13)', () => {
  it('고르지 않았으면 칸 오류', () => {
    expect(validateMechanic(null)).toBe(MECHANIC_MESSAGES.REQUIRED)
    expect(validateMechanic(1)).toBeUndefined()
  })

  it('요청에 mechanicId를 더하고 나머지는 그대로', () => {
    const core: VisitSaveRequest = { visitDate: SAVE.visitDate, mileage: SAVE.mileage, records: SAVE.records }
    expect(withMechanic(core, 1)).toEqual({ ...core, mechanicId: 1 })
    expect(core).not.toHaveProperty('mechanicId') // 받은 요청은 바꾸지 않는다
  })

  it('400 fieldErrors에서 mechanicId만 떼어 낸다', () => {
    const fieldErrors = [
      { field: 'mechanicId', reason: '담당 정비사를 확인해 주세요.' },
      { field: 'mileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' },
    ]
    expect(splitMechanicFieldErrors(fieldErrors)).toEqual({
      mechanic: '담당 정비사를 확인해 주세요.',
      rest: [{ field: 'mileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' }],
    })
    expect(splitMechanicFieldErrors(fieldErrors.slice(1)).mechanic).toBeUndefined()
  })
})

describe('12 Mock의 mechanicId (07 7.1 A 정비소 = 1 박사장·2 김정비)', () => {
  it('그 정비소 사장·정비사면 저장, 보내지 않아도 저장(서버가 저장한 계정으로)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    for (const mechanicId of [1, 2, undefined]) {
      const response = mockSaveVisit(4, { ...SAVE, mechanicId })
      expect(response.status).toBe(200)
      expect((response.body as { data: VisitSaveResponse }).data.savedCount).toBe(1)
    }
  })

  it('X13: 남의 정비소 직원(B 최사장 3)·없는 id는 같은 400 mechanicId', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    for (const mechanicId of [3, 999999]) {
      const error = parseError(mockSaveVisit(4, { ...SAVE, mechanicId }))
      expect(error.status).toBe(400)
      expect(error.code).toBe('INVALID_INPUT')
      expect(error.fieldErrors).toEqual([{ field: 'mechanicId', reason: '담당 정비사를 확인해 주세요.' }])
    }
  })

  it('검사 순서: 차량 404(X5)와 쓰지 않는 항목(X11)이 담당(X13)보다 먼저', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    expect(parseError(mockSaveVisit(12, { ...SAVE, mechanicId: 3 })).code).toBe('NOT_FOUND')
    const badItem = parseError(mockSaveVisit(4, { ...SAVE, mechanicId: 3, records: [{ itemId: 99, type: 'REPLACE', memo: null }] }))
    expect(badItem.fieldErrors[0].field).toBe('records[].itemId')
  })

  it('담당(X13)이 차량 빈 값(D-58)보다 먼저', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const error = parseError(mockSaveVisit(11, { visitDate: '2026-11-24', mechanicId: 3, records: SAVE.records }))
    expect(error.fieldErrors.map((f) => f.field)).toEqual(['mechanicId'])
  })
})
