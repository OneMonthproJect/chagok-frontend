import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, todaySeoul } from './dates'
import {
  mockCancel, mockComplete, mockCorrect, mockCreateReservation, mockGetPanel, mockGetRevisions, mockNoShow, mockStart, resetReservationMocks,
} from './mocks'
import {
  canCorrect,
  canStart,
  correctRequestBody,
  correctionStatusOptions,
  needsStartInput,
  revisionChangeText,
  revisionKindLabel,
  revisionTimeText,
  startMissingFields,
  startRequestBody,
  validateStartInput,
} from './panelFlow'

// 방문 접수·정정·이력 규칙 (08 39~41, 04 F-RSV-09·10, D-58, chagok-frontend#33) — 화면 없이

describe('방문 접수 규칙 (08 39, D-58)', () => {
  it('[방문 접수]는 상태 "예약"만', () => {
    expect(canStart('RESERVED')).toBe(true)
    for (const status of ['IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW'] as const) expect(canStart(status)).toBe(false)
  })

  it('입력 칸은 차량에 비어 있는 값만 연다', () => {
    expect(startMissingFields({ modelYear: 2018, latestMileage: 97000 })).toEqual({ modelYear: false, mileage: false })
    expect(startMissingFields({ modelYear: null, latestMileage: 97000 })).toEqual({ modelYear: true, mileage: false })
    expect(startMissingFields({ modelYear: 2018, latestMileage: null })).toEqual({ modelYear: false, mileage: true })
    expect(needsStartInput({ modelYear: false, mileage: false })).toBe(false)
    expect(needsStartInput({ modelYear: false, mileage: true })).toBe(true)
  })

  it('열린 칸만 필수·0 이상 정수인지 본다(범위는 서버), 본문에는 열린 칸만 숫자로', () => {
    const both = { modelYear: true, mileage: true }
    expect(validateStartInput({ modelYear: '', mileage: ' ' }, both)).toEqual({ modelYear: '필수 입력입니다.', mileage: '필수 입력입니다.' })
    expect(validateStartInput({ modelYear: '2018', mileage: '-1' }, both)).toEqual({ mileage: '숫자만 입력해 주세요.' })
    expect(validateStartInput({ modelYear: '', mileage: '0' }, { modelYear: false, mileage: true })).toEqual({})
    expect(startRequestBody({ modelYear: ' 2018 ', mileage: '0' }, both)).toEqual({ modelYear: 2018, mileage: 0 })
    expect(startRequestBody({ modelYear: '2018', mileage: '5' }, { modelYear: false, mileage: true })).toEqual({ mileage: 5 })
  })
})

describe('정정 규칙 (08 7.1 40)', () => {
  it('[정정]은 끝난 예약만 (예약·진행중은 40이 409)', () => {
    expect(canCorrect('COMPLETED')).toBe(true)
    expect(canCorrect('CANCELED')).toBe(true)
    expect(canCorrect('NO_SHOW')).toBe(true)
    expect(canCorrect('RESERVED')).toBe(false)
    expect(canCorrect('IN_PROGRESS')).toBe(false)
  })

  it('상태 선택지는 사장에게만 허용표대로: 취소↔노쇼, → 완료. 완료에서는 없음 (R26·R27)', () => {
    expect(correctionStatusOptions('CANCELED', 'OWNER')).toEqual(['NO_SHOW', 'COMPLETED'])
    expect(correctionStatusOptions('NO_SHOW', 'OWNER')).toEqual(['CANCELED', 'COMPLETED'])
    expect(correctionStatusOptions('COMPLETED', 'OWNER')).toEqual([])
    expect(correctionStatusOptions('NO_SHOW', 'MECHANIC')).toEqual([])
    expect(correctionStatusOptions('NO_SHOW', null)).toEqual([])
  })

  it('본문은 바뀐 것만, 없으면 null. 메모 지우기는 "", 공백뿐인 사유는 보내지 않는다', () => {
    expect(correctRequestBody({ status: '', memo: '메모', reason: '' }, '메모')).toBeNull()
    expect(correctRequestBody({ status: '', memo: '', reason: '' }, null)).toBeNull()
    expect(correctRequestBody({ status: 'CANCELED', memo: '', reason: '  ' }, null)).toEqual({ status: 'CANCELED' })
    expect(correctRequestBody({ status: '', memo: '', reason: '사유' }, '메모')).toEqual({ purposeMemo: '', reason: '사유' })
    expect(correctRequestBody({ status: 'COMPLETED', memo: '새 메모', reason: '' }, '메모')).toEqual({ status: 'COMPLETED', purposeMemo: '새 메모' })
  })
})

describe('이력 표시 (08 41)', () => {
  it('종류·전 → 후(상태는 글자, 담당은 이름, 없으면 「없음」)·일시', () => {
    expect(revisionKindLabel('ASSIGNEE')).toBe('담당 재배정')
    expect(revisionKindLabel('UNKNOWN')).toBe('UNKNOWN')
    expect(revisionChangeText({ field: 'status', before: 'NO_SHOW', after: 'COMPLETED' })).toBe('노쇼 → 방문 완료')
    expect(revisionChangeText({ field: 'purposeMemo', before: null, after: '메모' })).toBe('없음 → 메모')
    expect(revisionChangeText({ field: 'assignee', before: { staffId: 2, name: '김정비' }, after: { staffId: 1, name: '박사장' } })).toBe('김정비 → 박사장')
    expect(revisionTimeText('2026-11-25T09:10:00')).toBe('2026.11.25 09:10')
  })
})

describe('mocks 39·40·41 (08 모양, 백엔드와 같은 확인 순서)', () => {
  beforeEach(() => resetReservationMocks())
  const code = (r: { body: unknown }) => (r.body as { error: { code: string } }).error.code
  const data = <T,>(r: { body: unknown }) => (r.body as { data: T }).data

  it('39: 예약 → 진행중, version + 1, 18과 같은 4필드 응답. 끝난·진행중 예약은 409. 진행중에서 완료·취소 가능', () => {
    expect(code(mockStart(1, {} as never))).toBe('INVALID_INPUT')
    expect(mockStart(999, { version: 0 }).status).toBe(404)
    expect(code(mockStart(1, { version: 3 }))).toBe('CONCURRENT_MODIFICATION')
    const started = mockStart(1, { version: 0 })
    expect(data(started)).toEqual({ reservationId: 1, status: 'IN_PROGRESS', vehicleId: 4, version: 1 })
    expect(code(mockStart(1, { version: 1 }))).toBe('INVALID_STATUS_TRANSITION')
    expect(data<{ status: string }>(mockComplete(1, { version: 1 })).status).toBe('COMPLETED')

    mockStart(2, { version: 0 })
    expect(data<{ status: string }>(mockCancel(2, { version: 1 })).status).toBe('CANCELED')
  })

  it('39: 차량 연식·주행거리가 비어 있으면 필수(400 fieldErrors), 채운 값은 패널(17)에 보인다', () => {
    // 66카0011(연식·주행거리 없음)에 예약을 만든다
    const created = data<{ reservationId: number }>(mockCreateReservation({ vehicleId: 11, reservedAt: `${addDays(todaySeoul(), 1)}T10:00:00`, assigneeId: 1 }))
    const missing = mockStart(created.reservationId, { version: 0 })
    expect(missing.status).toBe(400)
    expect((missing.body as { error: { fieldErrors: { field: string }[] } }).error.fieldErrors.map((f) => f.field)).toEqual(['modelYear', 'mileage'])
    expect(mockStart(created.reservationId, { version: 0, modelYear: 2020, mileage: 15000 }).status).toBe(200)
    const panel = data<{ vehicle: { modelYear: number; latestMileage: number } }>(mockGetPanel(created.reservationId))
    expect(panel.vehicle).toMatchObject({ modelYear: 2020, latestMileage: 15000 })
  })

  it('40: 끝난 예약만, 허용표 밖은 409, 바뀐 것 없으면 400. 정정은 이력(41)에 오래된 것부터 남는다', () => {
    expect(code(mockCorrect(4, { version: 0, purposeMemo: '메모' }))).toBe('INVALID_STATUS_TRANSITION') // 아직 예약
    mockNoShow(4, { version: 0 })
    expect(code(mockCorrect(4, { version: 0, status: 'CANCELED' }))).toBe('CONCURRENT_MODIFICATION')
    expect(code(mockCorrect(4, { version: 1, status: 'NO_SHOW' }))).toBe('INVALID_INPUT') // 지금과 같음
    expect(code(mockCorrect(4, { version: 1, status: 'RESERVED' as never }))).toBe('INVALID_INPUT')

    const corrected = mockCorrect(4, { version: 1, status: 'CANCELED', purposeMemo: '배터리 교체', reason: '고객이 전날 전화로 취소함' })
    expect(data(corrected)).toEqual({ reservationId: 4, status: 'CANCELED', vehicleId: 10, version: 2 })
    mockCorrect(4, { version: 2, status: 'COMPLETED' })
    expect(code(mockCorrect(4, { version: 3, status: 'CANCELED' }))).toBe('INVALID_STATUS_TRANSITION') // 완료 → 취소 (R26)

    const { items } = data<{ items: { kind: string; reason: string | null; changes: unknown[] }[] }>(mockGetRevisions(4))
    expect(items.map((i) => i.kind)).toEqual(['STATUS', 'MEMO', 'STATUS'])
    expect(items[0]).toMatchObject({ reason: '고객이 전날 전화로 취소함', changes: [{ field: 'status', before: 'NO_SHOW', after: 'CANCELED' }] })
    expect(items[1]).toMatchObject({ changes: [{ field: 'purposeMemo', before: null, after: '배터리 교체' }] })
    expect(items[2].reason).toBeNull()
  })

  it('41: 이력이 없으면 [], 없는 예약은 404. 17 패널에 담당(assignee)이 있다', () => {
    expect(data(mockGetRevisions(1))).toEqual({ items: [] })
    expect(mockGetRevisions(999).status).toBe(404)
    expect(data<{ reservation: { assignee: unknown } }>(mockGetPanel(1)).reservation.assignee).toEqual({ staffId: 2, name: '김정비', colorIndex: 1 })
  })
})
