import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseResponse } from '@/shared/api/client'
import { getHome } from './api'
import { mockGetHome } from './mocks'
import type { HomeSummary } from './types'

// 홈 요약 (08 04, 07 7.5, chagok-frontend#28): API 호출·Mock (화면 없이)

describe('getHome (08 04)', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('GET /api/home, 숫자는 응답 그대로(목록으로 다시 세지 않음)', async () => {
    // 취소 1건이 목록에 있어도 todayReservationCount는 서버 값(취소 제외) 그대로
    const data = {
      date: '2026-11-24', todayReservationCount: 2, todayContactCount: 5,
      todayReservations: [
        { reservationId: 1, reservedAt: '2026-11-24T10:00:00', status: 'RESERVED', needsAction: false, version: 0, vehicleId: 4, plateNumber: '78라0004', customerId: 4, customerName: '최지은', phone: '010-0000-0004', purposeSummary: '엔진오일' },
        { reservationId: 2, reservedAt: '2026-11-24T14:30:00', status: 'RESERVED', needsAction: false, version: 0, vehicleId: 7, plateNumber: '22사0007', customerId: 7, customerName: '서민준', phone: '010-0000-0007', purposeSummary: '기타' },
        { reservationId: 9, reservedAt: '2026-11-24T16:00:00', status: 'CANCELED', needsAction: false, version: 1, vehicleId: 1, plateNumber: '12가0001', customerId: 1, customerName: '김민수', phone: '010-0000-0001', purposeSummary: null },
      ],
    }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data, error: null }), { status: 200 }))
    const res = await getHome()
    expect(res).toEqual(data)
    expect(res.todayReservationCount).toBe(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/home')
  })
})

describe('mock (07 7.5)', () => {
  it('오늘 예약 3건(진행중 포함)·오늘 연락할 고객 5명, 날짜는 오늘 — 08 04 예시·07 7.5', () => {
    const res = mockGetHome()
    const data = parseResponse<HomeSummary>(res.status, res.body)
    expect(data.todayReservationCount).toBe(3)
    expect(data.todayReservations.map((r) => [r.reservationId, r.status, r.phone, r.assignee?.name])).toEqual([
      [5, 'IN_PROGRESS', '010-****-0005', '김정비'],
      [1, 'RESERVED', '010-****-0004', '김정비'],
      [2, 'RESERVED', '010-****-0007', '박사장'],
    ])
    expect(data.todayContactCount).toBe(5)
    expect(data.todayReservations.every((r) => r.reservedAt.startsWith(data.date))).toBe(true)
  })
})
