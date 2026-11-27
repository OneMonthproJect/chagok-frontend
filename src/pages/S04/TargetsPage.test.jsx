// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import TargetsPage from './TargetsPage.jsx'

// S-04 재점검 대상 (09 S-04, 08 14, chagok-frontend#27 테스트): 목록·순서·예약 있음 이동·[예약 등록] → M-02(차량 채움)·빈 상태·실패
// fetch만 대역으로 바꾸고 client.ts의 실제 해석을 거친다.

let fetchMock
let location
let handlers

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details: null } })

/** 08 14 JSON 예시 그대로 */
const EXAMPLE = {
  asOf: '2026-11-24',
  items: [
    {
      customerId: 2, customerName: '이영희', phone: '010-0000-0002', vehicleId: 2, plateNumber: '34나0002',
      targetItems: [{ itemId: 1, name: '엔진오일', status: 'DUE', nextDueDate: '2026-11-14', baseDate: '2026-05-14' }],
      activeReservation: { reservationId: 3, reservedAt: '2026-11-26T10:00:00' },
    },
    {
      customerId: 1, customerName: '김민수', phone: '010-0000-0001', vehicleId: 1, plateNumber: '12가0001',
      targetItems: [{ itemId: 1, name: '엔진오일', status: 'DUE', nextDueDate: '2026-11-17', baseDate: '2026-05-17' }],
      activeReservation: null,
    },
  ],
}

beforeEach(() => {
  handlers = { targets: () => ok(EXAMPLE) }
  fetchMock = vi.fn((url) => {
    if (url === '/api/targets') return Promise.resolve(handlers.targets())
    if (url === '/api/items') return Promise.resolve(ok([]))
    if (url === '/api/me') return Promise.resolve(ok({ staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' }))
    if (url === '/api/staff/assignees') return Promise.resolve(ok({ items: [{ staffId: 1, name: '박사장', role: 'OWNER', colorIndex: 0 }, { staffId: 2, name: '김정비', role: 'MECHANIC', colorIndex: 1 }] }))
    return Promise.resolve(fail(404, 'NOT_FOUND', '찾을 수 없습니다.'))
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function LocationProbe() {
  location = useLocation()
  return null
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/targets']}>
      <Routes>
        <Route path="/targets" element={<TargetsPage />} />
        <Route path="/" element={<p>S-02</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const button = (text, root = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const rows = () => Array.from(document.querySelectorAll('.target-row'))

describe('S-04 재점검 대상', () => {
  it('머리(기준일·대상 차량 수)와 줄을 서버 순서 그대로, 연락처는 받은 값 그대로', async () => {
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('기준일 2026년 11월 24일 (화) · 대상 차량 2대')
    expect(rows().map((r) => r.querySelector('.target-row__vehicle b').textContent)).toEqual(['34나0002', '12가0001'])
    expect(rows()[0].textContent).toContain('010-0000-0002')
    expect(rows()[0].textContent).toContain('도래 1')
  })

  it('예약 있음이면 버튼 대신 일시, 누르면 S-02 패널(/?date=&reservation=)', async () => {
    renderPage()
    await settle()
    expect(button('예약 등록', rows()[0])).toBeUndefined()
    click(button('예약 있음 · 11/26 10:00', rows()[0]))
    expect(location.pathname).toBe('/')
    expect(location.search).toBe('?date=2026-11-26&reservation=3')
  })

  it('[예약 등록] → M-02가 차량을 채워 열린다(차량 검색 없음, 담당 기본값 = 로그인 계정 #37)', async () => {
    renderPage()
    await settle()
    click(button('예약 등록', rows()[1]))
    await settle()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('예약 등록')
    expect(dialog.querySelector('.rsv-form__vehicle').textContent).toContain('12가0001')
    expect(dialog.querySelector('.rsv-form__vehicle').textContent).toContain('김민수')
    expect(dialog.querySelector('input[type="search"]')).toBeNull()
    expect(dialog.querySelector('select[id$="-assignee"]').value).toBe('2')
  })

  it('펼치면 대상 항목의 다음 정비일·기준 기록일', async () => {
    renderPage()
    await settle()
    click(rows()[1].querySelector('.target-row__toggle'))
    expect(rows()[1].textContent).toContain('2026.11.17')
    expect(rows()[1].textContent).toContain('2026.05.17')
  })

  it('대상이 없으면 "지금 연락할 고객이 없습니다."', async () => {
    handlers.targets = () => ok({ asOf: '2026-11-24', items: [] })
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('지금 연락할 고객이 없습니다.')
  })

  it('실패하면 안내 + 사람이 누르는 다시 시도만(자동 재요청 없음)', async () => {
    handlers.targets = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderPage()
    await settle()
    const targetCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/targets')
    expect(document.body.textContent).toContain('재점검 대상을 불러오지 못했습니다.')
    expect(targetCalls()).toHaveLength(1)
    handlers.targets = () => ok(EXAMPLE)
    click(button('다시 시도'))
    await settle()
    expect(targetCalls()).toHaveLength(2)
    expect(rows()).toHaveLength(2)
  })
})
