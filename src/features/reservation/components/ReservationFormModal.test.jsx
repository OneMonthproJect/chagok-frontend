// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import { addDays, todaySeoul } from '../dates'
import ReservationFormModal from './ReservationFormModal.jsx'

// M-02 (#25 할 일: 409 두 종류, 중복 제출 방지, 과거 날짜·지난 시각, 입력 보존, 변경 모드 version 전송).
// fetch만 대역으로 바꾸고 client.ts의 실제 해석·오류 처리를 거친다(CustomerVehicleFormModal.test.jsx와 같은 방식).

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, details = null) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details } })
const calls = (method) => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method)
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const checkbox = (labelText) =>
  Array.from(document.querySelectorAll('label')).find((l) => l.textContent.trim() === labelText)?.querySelector('input')
const settle = () => act(async () => {})
const text = () => document.body.textContent

const TOMORROW = addDays(todaySeoul(), 1)
const ITEMS = [{ itemId: 1, name: '엔진오일' }, { itemId: 6, name: '배터리' }]
const VEHICLE = { vehicleId: 4, plateNumber: '78라0004', customerId: 4, customerName: '최지은', phone: '010-0000-0004' }

/** VehiclePicker 대역: 누르면 차량 하나를 고른다 (실제 VehiclePicker는 customer feature, pages가 끼운다) */
const fakePicker = ({ onChange }) => <button type="button" onClick={() => onChange(VEHICLE)}>차량 고르기</button>

function renderCreate(props = {}) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn(), onOpenExisting: vi.fn() }
  render(<ReservationFormModal mode="create" initialDate={TOMORROW} items={ITEMS} vehiclePicker={fakePicker} {...handlers} {...props} />)
  return handlers
}

function fillCreate() {
  click(button('차량 고르기'))
  click(button('10:00'))
}

describe('M-02 등록', () => {
  it('담당 정비사 칸이 없다 (P0-핵심, D-51)', () => {
    renderCreate()
    expect(text()).not.toContain('담당')
  })

  it('필수 칸이 비면 보내지 않고 칸 아래에 알린다', async () => {
    renderCreate()
    click(button('등록'))
    await settle()
    expect(calls('POST')).toHaveLength(0)
    expect(text()).toContain('차량을 골라 주세요.')
    expect(text()).toContain('시각을 골라 주세요.')
  })

  it('두 번 눌러도 요청은 한 번, 성공하면 onSaved (16 요청에 담당 필드 없음)', async () => {
    let resolve
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r }))
    const { onSaved } = renderCreate()
    fillCreate()
    click(checkbox('엔진오일'))
    click(button('등록'))
    click(document.querySelector('button[type="submit"]'))
    expect(calls('POST')).toHaveLength(1)
    const body = JSON.parse(calls('POST')[0][1].body)
    expect(body).toEqual({ vehicleId: 4, reservedAt: `${TOMORROW}T10:00:00`, purpose: { itemIds: [1], other: false, memo: null } })
    resolve(ok({ reservationId: 9, status: 'RESERVED', reservedAt: `${TOMORROW}T10:00:00`, vehicleId: 4, version: 0 }))
    await settle()
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 9 }))
  })

  it('409 RESERVATION_ACTIVE_EXISTS → 안내 + [기존 예약 보기], 입력은 그대로', async () => {
    fetchMock.mockResolvedValue(fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', { reservationId: 1 }))
    const { onOpenExisting, onSaved } = renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('이 차량에는 유효한 예약이 있습니다')
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
    click(button('기존 예약 보기'))
    expect(onOpenExisting).toHaveBeenCalledWith(1)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('응답 없음이면 공통 오류 안내, 입력 유지, 자동으로 다시 보내지 않는다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('저장하지 못했습니다.')
    expect(calls('POST')).toHaveLength(1)
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
    expect(text()).toContain('78라0004')
  })

  it('오늘이면 지난 시각 버튼은 누를 수 없고, 내일은 모두 고를 수 있다 (서울 13:10 고정)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-26T04:10:00Z')) // 서울 2026-11-26 13:10
    try {
      renderCreate({ initialDate: '2026-11-26' })
      expect(button('13:00').disabled).toBe(true)
      expect(button('13:30').disabled).toBe(false)
      cleanup()
      renderCreate({ initialDate: '2026-11-27' })
      expect(button('08:00').disabled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('과거 날짜로 열면 오늘로 바꿔 연다 (날짜 ≥ 오늘, R2)', () => {
    renderCreate({ initialDate: '2000-01-01' })
    expect(document.querySelector('input[type="date"]').value).toBe(todaySeoul())
  })
})

describe('M-02 변경', () => {
  const target = {
    reservationId: 3,
    version: 2,
    reservedAt: `${TOMORROW}T10:00:00`,
    purpose: { items: [{ itemId: 1, name: '엔진오일' }], other: false, memo: null },
    vehicle: { vehicleId: 2, plateNumber: '34나0002', customerName: '이영희' },
  }
  const renderEdit = () => {
    const handlers = { onSaved: vi.fn(), onClose: vi.fn() }
    render(<ReservationFormModal mode="edit" target={target} items={ITEMS} {...handlers} />)
    return handlers
  }

  it('차량은 바꿀 수 없고, 바뀐 게 없으면 저장 비활성 (R14)', () => {
    renderEdit()
    expect(text()).toContain('34나0002')
    expect(button('차량 고르기')).toBeUndefined()
    expect(button('저장').disabled).toBe(true)
  })

  it('읽은 version과 바뀐 칸만 PATCH로 보낸다', async () => {
    fetchMock.mockResolvedValue(ok({ reservationId: 3, status: 'RESERVED', reservedAt: `${TOMORROW}T11:00:00`, vehicleId: 2, version: 3 }))
    const { onSaved } = renderEdit()
    click(button('11:00'))
    click(button('저장'))
    await settle()
    const [url, init] = calls('PATCH')[0]
    expect(url).toBe('/api/reservations/3')
    expect(JSON.parse(init.body)).toEqual({ version: 2, reservedAt: `${TOMORROW}T11:00:00` })
    expect(onSaved).toHaveBeenCalled()
  })

  it('409 CONCURRENT_MODIFICATION → 최신 예약(17)을 다시 불러와 채우고, 다시 보내지 않는다', async () => {
    fetchMock
      .mockResolvedValueOnce(fail(409, 'CONCURRENT_MODIFICATION', '다른 사용자가 먼저 바꿨습니다.'))
      .mockResolvedValueOnce(ok({
        reservation: { reservationId: 3, reservedAt: `${TOMORROW}T14:00:00`, status: 'RESERVED', needsAction: false, version: 5, purpose: { items: [], other: true, memo: '메모' } },
        customer: { customerId: 2, name: '이영희', phone: '010-0000-0002', consent: true },
        vehicle: { vehicleId: 2, plateNumber: '34나0002', model: '쏘나타', modelYear: 2018, latestMileage: 60000 },
        recentVisits: [], totalVisitCount: 0, itemStatuses: [],
      }))
    const { onSaved } = renderEdit()
    click(button('11:00'))
    click(button('저장'))
    await settle()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/reservations/3/panel')
    expect(calls('PATCH')).toHaveLength(1)
    expect(text()).toContain('다른 사용자가 먼저 바꿨습니다.')
    expect(button('14:00').getAttribute('aria-pressed')).toBe('true')
    expect(onSaved).not.toHaveBeenCalled()
    // 다시 고쳐 저장하면 새 version으로 보낸다
    fetchMock.mockResolvedValueOnce(ok({ reservationId: 3, status: 'RESERVED', reservedAt: `${TOMORROW}T15:00:00`, vehicleId: 2, version: 6 }))
    click(button('15:00'))
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[1][1].body)).toEqual({ version: 5, reservedAt: `${TOMORROW}T15:00:00` })
  })
})
