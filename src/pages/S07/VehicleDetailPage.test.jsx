// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import VehicleDetailPage from './VehicleDetailPage.jsx'

// S-07 차량 상세 (09 S-07·5장, 04 F-CUS-05, 08 09·10·11, #22 테스트):
// 차량·고객(전체 연락처, 고객명 → S-06), 점검 주기 표(상태 서버 값 그대로, "정상·불량" 표현 없음), 방문 이력(최신순·더 보기·"고객 진술"),
// 이력 없음 문구, 404(남의 차량 X2·X6) → 찾을 수 없음, 조회 실패 → 사람이 누르는 다시 불러오기, 연결 안 된 버튼 없음

let fetchMock
let location
/** 경로 → 응답 (부를 때마다 새 Response) */
let routes

beforeEach(() => {
  routes = {}
  fetchMock = vi.fn((path) => {
    const handler = routes[path]
    if (!handler) return Promise.reject(new Error(`unexpected ${path}`))
    return handler()
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data) => () => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message) => () =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details: null } })

const UNKNOWN = (itemId, code, name) => ({
  itemId, code, name, status: 'UNKNOWN', dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null,
})

/** 08 09 JSON 예시 */
const VEHICLE = {
  vehicleId: 4,
  plateNumber: '78라0004',
  model: 'K5',
  modelYear: 2020,
  latestMileage: 45000,
  customer: { customerId: 4, name: '최지은', phone: '010-0000-0004', consent: true },
}

/** 08 10 (주행거리 없이) — 상태 4가지가 모두 보이도록 */
const ITEM_STATUS = {
  vehicleId: 4,
  asOf: '2026-11-24',
  inputMileage: null,
  items: [
    {
      itemId: 1, code: 'ENGINE_OIL', name: '엔진오일', status: 'AHEAD', dueReason: null,
      baseRecord: { date: '2026-09-24', mileage: 45000, type: 'REPLACE' }, nextDueDate: '2027-03-24', nextDueMileage: 55000,
    },
    UNKNOWN(2, 'AIR_CLEANER', '에어클리너'),
    {
      itemId: 3, code: 'AC_FILTER', name: '에어컨필터', status: 'DUE', dueReason: 'DATE',
      baseRecord: { date: '2026-03-24', mileage: null, type: 'EXTERNAL' }, nextDueDate: '2026-09-24', nextDueMileage: null,
    },
    {
      itemId: 4, code: 'BRAKE_PAD', name: '브레이크패드', status: 'SOON', dueReason: null,
      baseRecord: { date: '2025-12-14', mileage: null, type: 'REPLACE' }, nextDueDate: '2026-12-14', nextDueMileage: null,
    },
    UNKNOWN(5, 'TIRE', '타이어 상태 점검'),
    UNKNOWN(6, 'BATTERY', '배터리'),
  ],
}

const visit = (n, visitDate, records, mileage = null) => ({
  visitKey: `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  visitDate,
  mileage,
  staffName: '김정비',
  records,
})

const VISITS_PAGE = (items, over = {}) => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0, ...over })

const HISTORY = [
  visit(9, '2026-10-24', [{ recordId: 9, itemId: 3, itemName: '에어컨필터', type: 'EXTERNAL', date: '2026-10-01', memo: '다른 곳에서 교체했다고 함' }]),
  visit(5, '2026-09-24', [{ recordId: 5, itemId: 1, itemName: '엔진오일', type: 'REPLACE', date: '2026-09-24', memo: null }], 45000),
]

function serve({ vehicle = ok(VEHICLE), itemStatus = ok(ITEM_STATUS), visits = ok(VISITS_PAGE(HISTORY)), id = 4 } = {}) {
  routes[`/api/vehicles/${id}`] = vehicle
  routes[`/api/vehicles/${id}/item-status`] = itemStatus
  routes[`/api/vehicles/${id}/visits`] = visits
}

function LocationProbe() {
  location = useLocation()
  return null
}

function renderPage(entry = '/vehicles/4') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="/customers/:customerId" element={<p>S-06</p>} />
        <Route path="/customers" element={<p>S-05</p>} />
        <Route path="/" element={<p>S-02</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const tableRows = () => Array.from(document.querySelectorAll('.item-status-list__table tbody tr'))
const visitItems = () => Array.from(document.querySelectorAll('.visit-item'))
const calledPaths = () => fetchMock.mock.calls.map((call) => call[0])

describe('S-07 차량 상세', () => {
  it('09·10·11을 부르고 차량·고객(전체 연락처)을 보인다', async () => {
    serve()
    renderPage()
    expect(document.querySelector('[role="status"]')).not.toBeNull() // 불러오는 중
    await settle()

    expect(calledPaths().sort()).toEqual(['/api/vehicles/4', '/api/vehicles/4/item-status', '/api/vehicles/4/visits'])
    const header = document.querySelector('.vehicle-header')
    expect(header.querySelector('h2').textContent).toBe('78라0004')
    expect(header.textContent).toContain('K5 · 2020년식 · 최근 주행거리 45,000 km')
    expect(header.textContent).toContain('최지은 고객')
    expect(header.textContent).toContain('010-0000-0004')
  })

  it('연식·최근 주행거리가 비어 있으면 미입력 (08 09, 07 3.5)', async () => {
    serve({ vehicle: ok({ ...VEHICLE, modelYear: null, latestMileage: null }) })
    renderPage()
    await settle()
    expect(document.querySelector('.vehicle-header').textContent).toContain('K5 · 연식 미입력 · 최근 주행거리 미입력')
  })

  it('점검 주기 표: 6개 항목을 받은 순서대로, 상태는 서버 값 그대로 StatusBadge — 정상·불량 표현 없음', async () => {
    serve()
    renderPage()
    await settle()

    const headers = Array.from(document.querySelectorAll('.item-status-list__table thead th')).map((th) => th.textContent)
    expect(headers).toEqual(['항목', '상태', '기준 기록', '다음 정비일', '다음 정비 km'])
    const rows = tableRows()
    expect(rows.map((tr) => tr.querySelector('th').textContent)).toEqual([
      '엔진오일', '에어클리너', '에어컨필터', '브레이크패드', '타이어 상태 점검', '배터리',
    ])
    expect(rows.map((tr) => tr.querySelector('.status-badge').textContent)).toEqual(['여유', '미확인', '도래', '임박', '미확인', '미확인'])

    const cells = (tr) => Array.from(tr.querySelectorAll('td')).slice(1).map((td) => td.textContent)
    expect(cells(rows[0])).toEqual(['2026.09.24 · 45,000 km · 교체', '2027.03.24', '55,000 km'])
    expect(cells(rows[1])).toEqual(['—', '—', '—'])
    expect(cells(rows[2])).toEqual(['2026.03.24 · 외부(고객 진술)', '2026.09.24 (도래 근거)', '—'])

    const text = document.body.textContent
    expect(text).not.toMatch(/정상|불량/)
  })

  it('상태를 날짜로 다시 계산하지 않는다 — 다음 정비일이 지났어도 서버가 여유면 여유', async () => {
    const items = [{ ...ITEM_STATUS.items[0], nextDueDate: '2020-01-01' }, ...ITEM_STATUS.items.slice(1)]
    serve({ itemStatus: ok({ ...ITEM_STATUS, items }) })
    renderPage()
    await settle()
    expect(tableRows()[0].querySelector('.status-badge').textContent).toBe('여유')
  })

  it('정비 이력: 서버 순서(최신순) 그대로, 외부 기록은 "고객 진술"과 고객이 말한 날짜', async () => {
    serve()
    renderPage()
    await settle()

    expect(document.querySelector('.visit-history__meta').textContent).toBe('방문 단위 · 최신순 · 방문 2회')
    const [first, second] = visitItems()
    expect(first.querySelector('.visit-item__date').textContent).toBe('2026.10.24')
    expect(first.querySelector('.visit-item__meta').textContent).toBe('— · 김정비')
    expect(first.querySelector('.visit-record__type').textContent).toBe('외부')
    expect(first.querySelector('.visit-record__source').textContent).toBe('고객 진술')
    expect(first.querySelector('.visit-record__date').textContent).toBe('2026.10.01')
    expect(first.textContent).toContain('다른 곳에서 교체했다고 함')

    expect(second.querySelector('.visit-item__meta').textContent).toBe('45,000 km · 김정비')
    expect(second.querySelector('.visit-record__type').textContent).toBe('교체')
    expect(second.querySelector('.visit-record__source')).toBeNull() // 우리 정비소 기록은 고객 진술이 아님
    expect(second.querySelector('.visit-record__date')).toBeNull() // 방문일과 같으면 다시 쓰지 않음
  })

  it('이력이 없으면 "정비 이력이 없습니다." — 방문 기록 버튼은 아직 없다 (S-08 #23 머지 전)', async () => {
    serve({ visits: ok(VISITS_PAGE([])) })
    renderPage()
    await settle()
    expect(document.querySelector('.visit-history').textContent).toContain('정비 이력이 없습니다.')
    expect(visitItems()).toHaveLength(0)
    expect(document.querySelectorAll('button')).toHaveLength(0)
  })

  it('연결 안 된 버튼이 없다: 방문 기록·예약·수정·비활성화 (09 0장)', async () => {
    serve()
    renderPage()
    await settle()
    expect(document.querySelectorAll('button')).toHaveLength(0)
    for (const label of ['방문 기록', '예약', '수정', '비활성화']) expect(button(label)).toBeUndefined()
  })

  it('더 보기: 사람이 누를 때 다음 쪽을 받아 뒤에 붙이고, 마지막 쪽이면 버튼이 사라진다', async () => {
    serve({ visits: ok(VISITS_PAGE([HISTORY[0]], { size: 1, totalElements: 2, totalPages: 2 })) })
    routes['/api/vehicles/4/visits?page=1&size=1'] = ok(VISITS_PAGE([HISTORY[1]], { page: 1, size: 1, totalElements: 2, totalPages: 2 }))
    renderPage()
    await settle()
    expect(visitItems()).toHaveLength(1)

    click(button('더 보기'))
    await settle()
    expect(calledPaths()).toContain('/api/vehicles/4/visits?page=1&size=1')
    expect(visitItems().map((li) => li.querySelector('.visit-item__date').textContent)).toEqual(['2026.10.24', '2026.09.24'])
    expect(button('더 보기')).toBeUndefined()
  })

  it('더 보기 실패: 받은 이력은 그대로, 다시 누를 때만 다시 부른다', async () => {
    serve({ visits: ok(VISITS_PAGE([HISTORY[0]], { size: 1, totalElements: 2, totalPages: 2 })) })
    routes['/api/vehicles/4/visits?page=1&size=1'] = fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderPage()
    await settle()
    click(button('더 보기'))
    await settle()
    expect(document.body.textContent).toContain('이력을 더 불러오지 못했습니다.')
    expect(visitItems()).toHaveLength(1)
    const before = fetchMock.mock.calls.length
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(fetchMock.mock.calls.length).toBe(before) // 자동 재시도 없음 (POL-125)

    routes['/api/vehicles/4/visits?page=1&size=1'] = ok(VISITS_PAGE([HISTORY[1]], { page: 1, size: 1, totalElements: 2, totalPages: 2 }))
    click(button('더 보기'))
    await settle()
    expect(visitItems()).toHaveLength(2)
    expect(document.body.textContent).not.toContain('이력을 더 불러오지 못했습니다.')
  })

  it('404(다른 정비소 차량·없는 차량, X2·X6): "찾을 수 없습니다." + 홈으로 — 차량 정보를 보이지 않는다', async () => {
    const notFound = fail(404, 'NOT_FOUND', '찾을 수 없습니다.')
    serve({ id: 12, vehicle: notFound, itemStatus: notFound, visits: notFound })
    renderPage('/vehicles/12')
    await settle()
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
    expect(document.querySelector('.vehicle-header')).toBeNull()
    expect(document.querySelector('.item-status-list')).toBeNull()
    expect(button('다시 불러오기')).toBeUndefined()

    click(button('홈으로'))
    expect(location.pathname).toBe('/')
  })

  it('주소의 id가 양의 정수가 아니면 부르지 않고 찾을 수 없음', async () => {
    renderPage('/vehicles/abc')
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
  })

  it('차량 조회 실패: 자동으로 다시 부르지 않고 사람이 누를 때만', async () => {
    let vehicleCalls = 0
    serve({
      vehicle: () => {
        vehicleCalls += 1
        return vehicleCalls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : ok(VEHICLE)()
      },
    })
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('불러오지 못했습니다.')
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(vehicleCalls).toBe(1)

    click(button('다시 불러오기'))
    await settle()
    expect(vehicleCalls).toBe(2)
    expect(document.querySelector('.vehicle-header h2').textContent).toBe('78라0004')
  })

  it('점검 주기·이력 조회 실패는 그 영역만 "불러오지 못했습니다." + 다시 불러오기', async () => {
    serve({ itemStatus: fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.') })
    renderPage()
    await settle()
    expect(document.querySelector('.vehicle-header')).not.toBeNull()
    expect(document.querySelector('.item-status-list')).toBeNull()
    expect(visitItems()).toHaveLength(2)

    serve()
    click(button('다시 불러오기'))
    await settle()
    expect(tableRows()).toHaveLength(6)
  })

  it('고객명은 S-06으로, "고객·차량"은 S-05로 — 목록에서 왔으면 그때의 검색어·쪽을 넘긴다', async () => {
    serve()
    renderPage({ pathname: '/vehicles/4', state: { listSearch: '?q=%EC%B5%9C' } })
    await settle()

    const customerLink = document.querySelector('.vehicle-header__customer-link')
    expect(customerLink.getAttribute('href')).toBe('/customers/4')
    expect(document.querySelector('.s07__back').getAttribute('href')).toBe('/customers?q=%EC%B5%9C')

    click(customerLink)
    expect(location.pathname).toBe('/customers/4')
    expect(location.state).toEqual({ listSearch: '?q=%EC%B5%9C' })
  })
})
