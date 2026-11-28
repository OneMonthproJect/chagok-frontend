import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, parseResponse } from '@/shared/api/client'
import { getReservations } from './api'
import { addDays, formatDayLabel, formatFullDate, formatTime, isValidDate, nowSeoul, todaySeoul } from './dates'
import { reservationStatusLabel } from './status'
import {
  mockCancel, mockComplete, mockCreateReservation, mockGetPanel, mockGetReservations, mockNoShow, mockUpdate, resetReservationMocks,
} from './mocks'
import type { ReservationPeriodResponse } from './types'

// S-02 오늘 예약 목록 (08 15, 09 S-02, chagok-frontend#24): 날짜·상태 표시·API 호출·Mock (화면 없이)

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('dates (서울 기준)', () => {
  it('오늘·지금은 서울 날짜 — UTC 15시(서울 다음 날 0시)도 서울 날짜로', () => {
    const utc1500 = new Date('2026-11-23T15:00:00Z')
    expect(todaySeoul(utc1500)).toBe('2026-11-24')
    expect(nowSeoul(utc1500)).toBe('2026-11-24T00:00:00')
  })

  it('앞뒤 이동은 달·해를 넘긴다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('URL 날짜 검사: 없는 날짜·형식 틀림은 거부', () => {
    expect(isValidDate('2026-11-24')).toBe(true)
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-1-5')).toBe(false)
    expect(isValidDate(null)).toBe(false)
  })

  it('표시: 날짜 라벨·시각은 문자열을 자를 뿐 바꾸지 않는다', () => {
    expect(formatDayLabel('2026-11-24')).toBe('11월 24일 (화)')
    expect(formatFullDate('2026-11-24')).toBe('2026년 11월 24일 (화)')
    expect(formatTime('2026-11-24T14:30:00')).toBe('14:30')
  })
})

describe('상태 표시 — 서버 값 그대로 글자로만', () => {
  it('08 0.4 다섯 가지, 모르는 값은 그대로', () => {
    expect(['RESERVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW'].map(reservationStatusLabel))
      .toEqual(['예약', '진행중', '방문 완료', '취소', '노쇼'])
    expect(reservationStatusLabel('SOMETHING')).toBe('SOMETHING')
  })
})

describe('getReservations (08 15)', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('from·to 쿼리로 부르고, 응답 data를 그대로(상태·needsAction 바꾸지 않음)', async () => {
    const data = {
      from: '2026-11-23', to: '2026-11-23',
      items: [{ reservationId: 4, reservedAt: '2026-11-23T15:00:00', status: 'RESERVED', needsAction: true, version: 0, vehicleId: 10, plateNumber: '55차0010', customerId: 10, customerName: '오세훈', phone: '010-0000-0010', purposeSummary: '배터리' }],
    }
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data, error: null }))
    expect(await getReservations({ from: '2026-11-23', to: '2026-11-23' })).toEqual(data)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/reservations?from=2026-11-23&to=2026-11-23')
  })
})

describe('mocks (07 7.3 시드, 08 모양)', () => {
  beforeEach(() => resetReservationMocks())
  const today = todaySeoul()
  const period = (from: string, to = from) => {
    const res = mockGetReservations({ from, to })
    return parseResponse<ReservationPeriodResponse>(res.status, res.body)
  }

  it('오늘 3건(09:00 90마0005 진행중, 10:00 78라0004 엔진오일, 14:30 22사0007 기타) — 07 7.3·7.5, 목록 phone은 마스킹(08 0.5)', () => {
    const { items } = period(today)
    expect(items.map((i) => [i.reservedAt.slice(11, 16), i.plateNumber, i.purposeSummary])).toEqual([
      ['09:00', '90마0005', '엔진오일'],
      ['10:00', '78라0004', '엔진오일'],
      ['14:30', '22사0007', '기타'],
    ])
    expect(items.map((i) => i.status)).toEqual(['IN_PROGRESS', 'RESERVED', 'RESERVED'])
    expect(items.every((i) => /^010-\*{4}-\d{4}$/.test(i.phone))).toBe(true)
  })

  it('어제 15:00 예약은 "처리 필요", 빈 날은 items: []', () => {
    const [yesterday] = period(addDays(today, -1)).items
    expect(yesterday).toMatchObject({ plateNumber: '55차0010', status: 'RESERVED', needsAction: true })
    expect(period(addDays(today, -10)).items).toEqual([])
  })

  it('기간 오류는 400 INVALID_INPUT (from > to, 42일 초과)', () => {
    expect(mockGetReservations({ from: today, to: addDays(today, -1) }).status).toBe(400)
    expect(mockGetReservations({ from: today, to: addDays(today, 42) }).status).toBe(400)
    expect(mockGetReservations({ from: today, to: addDays(today, 41) }).status).toBe(200)
  })

  it('16: 같은 차량 유효 예약이 있으면 409와 기존 예약 번호, 30분 단위가 아니면 400', () => {
    const dup = mockCreateReservation({ vehicleId: 2, reservedAt: `${addDays(today, 3)}T10:00:00`, assigneeId: 1 })
    expect(dup.status).toBe(409)
    expect((dup.body as { error: { details: unknown } }).error.details).toEqual({ reservationId: 3 })
    expect(mockCreateReservation({ vehicleId: 1, reservedAt: `${addDays(today, 3)}T10:10:00`, assigneeId: 1 }).status).toBe(400)
    expect(mockCreateReservation({ vehicleId: 99, reservedAt: `${addDays(today, 3)}T10:00:00`, assigneeId: 1 }).status).toBe(404)
    expect(mockCreateReservation({ vehicleId: 1, reservedAt: `${addDays(today, 3)}T10:00:00`, assigneeId: 1 }).status).toBe(200)
  })

  it('16 확인 순서(chagok-docs#198): 형식(필수 누락·메모 200자 초과) 400이 소유 404보다 먼저, 틀린 필드는 모두 모음', () => {
    const err = (r: { body: unknown }) => (r.body as { error: { code: string; fieldErrors: { field: string }[] } }).error
    const fields = (r: { body: unknown }) => err(r).fieldErrors.map((f) => f.field)
    // 없는 차량(99)이라도 형식이 틀리면 400
    const missing = mockCreateReservation({ vehicleId: 99 } as never)
    expect(missing.status).toBe(400)
    expect(err(missing).code).toBe('INVALID_INPUT')
    expect(fields(missing)).toEqual(['reservedAt', 'assigneeId'])
    // 타입이 틀린 값: 본문을 읽지 못한 400, fieldErrors 없음 (08 0.2)
    const badType = mockCreateReservation({ vehicleId: 99, reservedAt: '내일 오전', assigneeId: 1 })
    expect(badType.status).toBe(400)
    expect(fields(badType)).toEqual([])
    const longMemo = mockCreateReservation({
      vehicleId: 99, reservedAt: `${addDays(today, 3)}T10:00:00`, assigneeId: 1, purpose: { itemIds: [], other: true, memo: 'a'.repeat(201) },
    })
    expect(longMemo.status).toBe(400)
    expect(fields(longMemo)).toEqual(['purpose.memo'])
    // 형식이 맞으면 소유 확인(404), 200자는 허용
    expect(mockCreateReservation({
      vehicleId: 99, reservedAt: `${addDays(today, 3)}T10:00:00`, assigneeId: 1, purpose: { itemIds: [], other: true, memo: 'a'.repeat(200) },
    }).status).toBe(404)
  })

  it('18·19: version이 다르면 409, 완료 뒤 변경은 409 상태 전이', () => {
    // 18 확인 순서: 형식(400) → 소유(404). 누락만 fieldErrors[version]
    const missing = mockComplete(999, {} as never).body as { error: { code: string; fieldErrors: unknown[] } }
    expect(missing.error.code).toBe('INVALID_INPUT')
    expect(missing.error.fieldErrors).toHaveLength(1)
    expect((mockComplete(1, { version: '0' } as never).body as { error: { fieldErrors: unknown[] } }).error.fieldErrors).toHaveLength(0)
    expect(mockComplete(999, { version: 0 }).status).toBe(404)
    expect(mockComplete(1, { version: 5 }).status).toBe(409)
    expect(mockComplete(1, { version: 0 }).status).toBe(200)
    expect((mockUpdate(1, { version: 1, purpose: { memo: '메모' } }).body as { error: { code: string } }).error.code).toBe('INVALID_STATUS_TRANSITION')
    expect(mockUpdate(3, { version: 0 }).status).toBe(400) // 바꿀 필드 없음 (R14)
    expect(mockUpdate(3, { version: 0, purpose: { memo: '메모' } }).status).toBe(200)
  })

  it('20·21: 취소는 예약·진행중(시각 무관), 노쇼는 시각이 지난 예약만. 상태 → version → 시각 순', () => {
    const code = (r: { body: unknown }) => (r.body as { error: { code: string } }).error.code
    expect(code(mockCancel(3, {} as never))).toBe('INVALID_INPUT')
    expect(mockCancel(999, { version: 0 }).status).toBe(404)
    expect(code(mockCancel(3, { version: 5 }))).toBe('CONCURRENT_MODIFICATION')
    const canceled = mockCancel(3, { version: 0 }) // 이틀 뒤 예약도 취소 가능
    expect(canceled.status).toBe(200)
    expect((canceled.body as { data: unknown }).data).toEqual({ reservationId: 3, status: 'CANCELED', vehicleId: 2, version: 1 })
    expect(code(mockCancel(3, { version: 1 }))).toBe('INVALID_STATUS_TRANSITION') // 끝난 예약

    expect(code(mockNoShow(1, { version: 5 }))).toBe('CONCURRENT_MODIFICATION') // version이 시각보다 먼저
    expect(code(mockNoShow(4, { version: 5 }))).toBe('CONCURRENT_MODIFICATION')
    expect((mockNoShow(4, { version: 0 }).body as { data: { status: string } }).data.status).toBe('NO_SHOW') // 어제 예약
    expect(code(mockNoShow(4, { version: 1 }))).toBe('INVALID_STATUS_TRANSITION')
    const panel = mockGetPanel(4).body as { data: { reservation: { status: string; needsAction: boolean } } }
    expect(panel.data.reservation).toMatchObject({ status: 'NO_SHOW', needsAction: false })
  })

  it('21: 시각 전 예약은 노쇼 409', () => {
    expect((mockNoShow(3, { version: 0 }).body as { error: { code: string } }).error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  it('17: 패널은 08 모양, 없는 예약은 404', () => {
    const panel = mockGetPanel(4)
    expect(panel.status).toBe(200)
    const data = parseResponse<{ vehicle: { plateNumber: string }; itemStatuses: { highlighted: boolean; code: string }[] }>(panel.status, panel.body)
    expect(data.vehicle.plateNumber).toBe('55차0010')
    expect(data.itemStatuses.filter((s) => s.highlighted).map((s) => s.code)).toEqual(['BATTERY'])
    expect(() => parseResponse(mockGetPanel(999).status, mockGetPanel(999).body)).toThrow(ApiError)
  })

  it('17: 최근 방문은 07 7.2 기록 최신순 2회, 총 방문은 외부만 있는 방문 제외 (#26)', () => {
    type Panel = { recentVisits: { visitKey: string; visitDate: string; records: { recordId: number; type: string; date: string }[] }[]; totalVisitCount: number }
    const read = (id: number) => parseResponse<Panel>(mockGetPanel(id).status, mockGetPanel(id).body)

    const oh = read(4) // 55차0010: 방문 3회(08 17 예시)
    expect(oh.totalVisitCount).toBe(3)
    expect(oh.recentVisits.map((v) => v.visitKey.slice(-2))).toEqual(['15', '14'])
    expect(oh.recentVisits[1].records.map((r) => r.recordId)).toEqual([14, 15])
    expect(oh.recentVisits[0].visitDate > oh.recentVisits[1].visitDate).toBe(true)
    expect(oh.recentVisits[0].records[0].date).toBe(oh.recentVisits[0].visitDate)

    const seo = read(2) // 22사0007: 교체 1회 + 외부 1회 → 총 1회, 최근 2회에는 외부도 보인다
    expect(seo.totalVisitCount).toBe(1)
    expect(seo.recentVisits.map((v) => v.records[0].type)).toEqual(['EXTERNAL', 'REPLACE'])

    expect(read(1).totalVisitCount).toBe(1) // 78라0004
  })

  it('17 recentVisits records: version·edited·staff (#34, 08 11과 같은 모양) — 11 Mock과 같은 기록은 같은 값', () => {
    type Rec = { recordId: number; version: number; edited: boolean; staff: { staffId: number; name: string } }
    const panel = parseResponse<{ recentVisits: { records: Rec[] }[] }>(mockGetPanel(4).status, mockGetPanel(4).body)
    const records = panel.recentVisits.flatMap((v) => v.records)
    expect(records.find((r) => r.recordId === 16)).toMatchObject({ version: 1, edited: true, staff: { staffId: 2, name: '김정비' } })
    expect(records.filter((r) => r.recordId !== 16).every((r) => r.version === 0 && !r.edited)).toBe(true)
  })

  it('17 P0-나머지 (#29): 꼬리표는 07 7.2 시드대로(11바0006 거절·33아0008 주의), source는 외부만 고객 진술, 점검 결과는 점검에만', () => {
    type Panel = {
      itemStatuses: { itemId: number; lastDecline: { date: string; memo: string | null } | null; lastCaution: { date: string; memo: string | null } | null }[]
      recentVisits: { records: { type: string; source: string; inspectResult: string | null }[] }[]
    }
    const panelOf = (vehicleId: number, time: string) => {
      const saved = mockCreateReservation({ vehicleId, reservedAt: `${addDays(todaySeoul(), 3)}T${time}`, assigneeId: 1 })
      const id = parseResponse<{ reservationId: number }>(saved.status, saved.body).reservationId
      return parseResponse<Panel>(mockGetPanel(id).status, mockGetPanel(id).body)
    }
    const ha = panelOf(6, '11:00:00') // 11바0006: 엔진오일 교체 D-8M 뒤 거절 D-1M
    expect(ha.itemStatuses.find((i) => i.itemId === 1)).toMatchObject({ lastDecline: { memo: null }, lastCaution: null })
    expect(ha.itemStatuses.filter((i) => i.lastDecline || i.lastCaution).map((i) => i.itemId)).toEqual([1])

    const yun = panelOf(8, '13:00:00') // 33아0008: 타이어 교체 뒤 점검 주의 D-2M
    expect(yun.itemStatuses.find((i) => i.itemId === 5)).toMatchObject({
      lastDecline: null,
      lastCaution: { memo: '타이어 트레드 마모 진행, 다음 방문 때 교체 권장' },
    })
    expect(yun.recentVisits[0].records[0]).toMatchObject({ type: 'INSPECT', source: 'SHOP', inspectResult: 'CAUTION' })

    const records = [2, 4].flatMap((id) => parseResponse<Panel>(mockGetPanel(id).status, mockGetPanel(id).body).recentVisits.flatMap((v) => v.records))
    expect(records.every((r) => (r.type === 'EXTERNAL') === (r.source === 'CUSTOMER_STATEMENT'))).toBe(true) // 07 3.7 CHECK
    expect(records.every((r) => r.inspectResult === null || r.type === 'INSPECT')).toBe(true)
  })
})
