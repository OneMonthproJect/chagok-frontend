import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseResponse } from '@/shared/api/client'
import { getTargets } from './api'
import { mockGetTargets } from './mocks'
import { activeReservationText, dotDate, itemRows, reservationQuery, statusCounts, vehicleOf } from './targetFlow'
import type { Target, TargetListResponse } from './types'

// S-04 재점검 대상 (08 14, 09 S-04, 07 7.5, chagok-frontend#27): 표시 규칙·API 호출·Mock (화면 없이)

const target: Target = {
  customerId: 2, customerName: '이영희', phone: '010-0000-0002', vehicleId: 2, plateNumber: '34나0002',
  targetItems: [
    { itemId: 1, name: '엔진오일', status: 'DUE', nextDueDate: '2026-11-14', baseDate: '2026-05-14', lastDecline: null, lastCaution: null },
    { itemId: 6, name: '배터리', status: 'SOON', nextDueDate: '2026-12-14', baseDate: '2023-12-14', lastDecline: null, lastCaution: null },
    { itemId: 4, name: '브레이크패드', status: 'DUE', nextDueDate: '2026-11-20', baseDate: '2025-11-20', lastDecline: { date: '2026-10-24', memo: null }, lastCaution: null },
  ],
  activeReservation: { reservationId: 3, reservedAt: '2026-11-26T10:00:00' },
}

describe('targetFlow', () => {
  it('줄 요약: 상태별 개수, 도래 먼저', () => {
    expect(statusCounts(target.targetItems)).toEqual([
      { status: 'DUE', label: '도래 2' },
      { status: 'SOON', label: '임박 1' },
    ])
    expect(statusCounts([])).toEqual([])
  })

  it('펼침: 서버 순서·상태 그대로, 다음 정비일·기준 기록일', () => {
    expect(itemRows(target.targetItems)[0]).toEqual({
      id: 1, name: '엔진오일', status: 'DUE', tag: undefined,
      details: [{ label: '다음 정비일', value: '2026.11.14' }, { label: '기준 기록일', value: '2026.05.14' }],
    })
    expect(itemRows(target.targetItems).map((r) => r.id)).toEqual([1, 6, 4])
  })

  it('꼬리표 (#29, F-CYC-02): 08 14 lastDecline·lastCaution 그대로 tag, 상태는 바꾸지 않는다', () => {
    const rows = itemRows(target.targetItems)
    expect(rows[2]).toMatchObject({ status: 'DUE', tag: '지난 방문 거절(2026.10.24)' })
    expect(itemRows([{ ...target.targetItems[1], lastCaution: { date: '2026-09-24', memo: '앞 타이어 마모' } }])[0]).toMatchObject({
      status: 'SOON',
      tag: '지난 점검 주의(2026.09.24, 앞 타이어 마모)',
    })
  })

  it('"예약 있음 · 11/26 10:00", S-02 패널 쿼리, M-02 차량', () => {
    expect(activeReservationText(target.activeReservation!)).toBe('예약 있음 · 11/26 10:00')
    expect(reservationQuery(target.activeReservation!)).toEqual({ date: '2026-11-26', reservation: '3' })
    expect(vehicleOf(target)).toEqual({ vehicleId: 2, plateNumber: '34나0002', customerName: '이영희' })
    expect(dotDate('2026-01-05')).toBe('2026.01.05')
  })
})

describe('getTargets (08 14)', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('GET /api/targets, 응답 그대로(순서·상태 바꾸지 않음)', async () => {
    const data = { asOf: '2026-11-24', items: [target] }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data, error: null }), { status: 200 }))
    expect(await getTargets()).toEqual(data)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/targets')
  })
})

describe('mock (07 7.5 재점검 대상 6대)', () => {
  it('6대, 도래 3대 먼저, 34나0002만 예약 있음, 미동의 장미래 없음', () => {
    const res = mockGetTargets()
    const data = parseResponse<TargetListResponse>(res.status, res.body)
    expect(data.items.map((t) => t.plateNumber)).toEqual(['11바0006', '34나0002', '12가0001', '33아0008', '56다0003', '55차0010'])
    expect(data.items.slice(0, 3).every((t) => t.targetItems[0].status === 'DUE')).toBe(true)
    expect(data.items.filter((t) => t.activeReservation).map((t) => t.plateNumber)).toEqual(['34나0002'])
    expect(data.items.some((t) => t.customerName === '장미래')).toBe(false)
    expect(data.items.map((t) => t.phone).every((p) => /^010-\*{4}-\d{4}$/.test(p))).toBe(true) // 목록 phone은 08 0.5대로 가림 (#106)
    const due = data.items.slice(0, 3).map((t) => t.targetItems[0].nextDueDate)
    expect([...due].sort()).toEqual(due) // 도래 안에서 다음 정비일 이른 순
    expect(due.every((d) => d <= data.asOf)).toBe(true)
  })

  it('꼬리표 (07 7.2 시드): 11바0006 엔진오일 지난 방문 거절, 33아0008 타이어 지난 점검 주의, 나머지는 null', () => {
    const data = parseResponse<TargetListResponse>(mockGetTargets().status, mockGetTargets().body)
    const byPlate = Object.fromEntries(data.items.map((t) => [t.plateNumber, t.targetItems[0]]))
    expect(byPlate['11바0006'].lastDecline).toEqual({ date: expect.any(String), memo: null })
    expect(byPlate['11바0006'].lastCaution).toBeNull()
    expect(byPlate['33아0008'].lastCaution?.memo).toBe('타이어 트레드 마모 진행, 다음 방문 때 교체 권장')
    expect(byPlate['33아0008'].lastDecline).toBeNull()
    expect(byPlate['34나0002']).toMatchObject({ lastDecline: null, lastCaution: null })
  })
})
