// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerDetailPage from './CustomerDetailPage.jsx'

// S-06 고객 상세 (09 S-06·5장, 08 07, #20 테스트): 고객 정보(전체 연락처·동의), 차량 줄의 도래·임박(서버 값 그대로),
// 차량 없음 문구, 404(남의 고객 X1·없는 고객) → 찾을 수 없음, 조회 실패 → 사람이 누르는 다시 불러오기, S-05로 돌아가기

let fetchMock
let location

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details: null } })

/** 08 07 JSON 예시 그대로 */
const OH = {
  customerId: 10,
  name: '오세훈',
  phone: '010-0000-0010',
  consent: true,
  vehicles: [
    { vehicleId: 10, plateNumber: '55차0010', model: '쏘나타', modelYear: 2018, latestMileage: 97000, dueCount: 0, soonCount: 1 },
    { vehicleId: 11, plateNumber: '66카0011', model: 'K3', modelYear: null, latestMileage: null, dueCount: 0, soonCount: 0 },
  ],
}

function LocationProbe() {
  location = useLocation()
  return null
}

function renderPage(entry = '/customers/10') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/customers" element={<p>S-05</p>} />
        <Route path="/vehicles/:vehicleId" element={<p>S-07</p>} />
        <Route path="/" element={<p>S-02</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const vehicleCards = () => Array.from(document.querySelectorAll('.vehicle-card'))

describe('S-06 고객 상세', () => {
  it('07을 부르고 고객명·전체 연락처·안내 수신 동의를 보인다', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    expect(document.querySelector('[role="status"]')).not.toBeNull() // 불러오는 중
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers/10')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    const info = document.querySelector('.customer-info')
    expect(info.querySelector('h2').textContent).toBe('오세훈')
    expect(info.textContent).toContain('010-0000-0010')
    expect(info.textContent).toContain('안내 수신 동의')
  })

  it('미동의 고객은 "안내 수신 미동의"', async () => {
    fetchMock.mockResolvedValue(ok({ ...OH, consent: false }))
    renderPage()
    await settle()
    expect(document.querySelector('.customer-info').textContent).toContain('안내 수신 미동의')
  })

  it('차량 줄: 차량번호·차종·연식·최근 주행거리, 비어 있으면 미입력', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()

    expect(document.body.textContent).toContain('등록 차량 2대 · 도래·임박은 오늘 기준')
    const [sonata, k3] = vehicleCards()
    expect(sonata.querySelector('h3').textContent).toBe('55차0010')
    expect(sonata.textContent).toContain('쏘나타 · 2018년식')
    expect(sonata.textContent).toContain('97,000 km')
    expect(k3.querySelector('h3').textContent).toBe('66카0011')
    expect(k3.textContent).toContain('K3 · 연식 미입력')
    expect(k3.querySelector('.vehicle-card__mileage').textContent).toBe('미입력')
  })

  it('도래·임박은 서버 dueCount·soonCount 그대로 — 1 이상만 StatusBadge 색', async () => {
    const vehicles = [{ ...OH.vehicles[0], dueCount: 2, soonCount: 1 }, OH.vehicles[1]]
    fetchMock.mockResolvedValue(ok({ ...OH, vehicles }))
    renderPage()
    await settle()

    const [first, second] = vehicleCards()
    const firstCounts = first.querySelectorAll('.vehicle-count')
    expect(firstCounts[0].querySelector('.status-badge--DUE').textContent).toBe('도래')
    expect(firstCounts[0].querySelector('.vehicle-count__number').textContent).toBe('2')
    expect(firstCounts[1].querySelector('.status-badge--SOON').textContent).toBe('임박')
    expect(firstCounts[1].querySelector('.vehicle-count__number').textContent).toBe('1')

    const secondCounts = second.querySelectorAll('.vehicle-count')
    expect(second.querySelector('.status-badge')).toBeNull()
    expect(secondCounts[0].textContent).toBe('도래 0')
    expect(secondCounts[1].textContent).toBe('임박 0')
  })

  it('차량 카드를 누르면 S-07 (#22) — 차량 추가·수정 버튼은 아직 없다', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()
    const links = Array.from(document.querySelectorAll('.customer-vehicles a'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/vehicles/10', '/vehicles/11'])
    expect(document.querySelectorAll('button')).toHaveLength(0)

    click(links[1])
    expect(location.pathname).toBe('/vehicles/11')
  })

  it('S-07로 갈 때 S-05에서 가져온 검색을 넘긴다 (S-07의 "고객·차량"이 같은 목록으로)', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage({ pathname: '/customers/10', state: { listSearch: '?q=%EC%98%A4' } })
    await settle()
    click(document.querySelector('.customer-vehicles a'))
    expect(location.pathname).toBe('/vehicles/10')
    expect(location.state).toEqual({ listSearch: '?q=%EC%98%A4' })
  })

  it('차량이 없으면 "등록된 차량이 없습니다." (버튼 없음)', async () => {
    fetchMock.mockResolvedValue(ok({ ...OH, vehicles: [] }))
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('등록된 차량이 없습니다.')
    expect(document.body.textContent).toContain('등록 차량 0대')
    expect(vehicleCards()).toHaveLength(0)
    expect(document.querySelectorAll('button')).toHaveLength(0)
  })

  it('404(다른 정비소·없는 고객, X1): "찾을 수 없습니다." + 홈으로 — 다시 불러오기 없음', async () => {
    fetchMock.mockResolvedValue(fail(404, 'NOT_FOUND', '찾을 수 없습니다.'))
    renderPage('/customers/11')
    await settle()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers/11')
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
    expect(document.body.textContent).toContain('주소가 바뀌었거나 볼 수 없는 정보입니다.')
    expect(document.querySelector('.customer-info')).toBeNull()
    expect(button('다시 불러오기')).toBeUndefined()

    click(button('홈으로')) // 09 5장 404: "찾을 수 없습니다." + "홈으로"
    expect(location.pathname).toBe('/')
  })

  it('주소의 id가 양의 정수가 아니면 부르지 않고 찾을 수 없음', async () => {
    renderPage('/customers/abc')
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
  })

  it('조회 실패: 자동으로 다시 부르지 않고 사람이 누를 때만', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('불러오지 못했습니다.')
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    click(button('다시 불러오기'))
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(document.querySelector('.customer-info h2').textContent).toBe('오세훈')
  })

  it('500도 조회 실패로 (찾을 수 없음과 구분)', async () => {
    fetchMock.mockResolvedValue(fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.'))
    renderPage()
    await settle()
    expect(document.body.textContent).toContain('불러오지 못했습니다.')
    expect(document.body.textContent).not.toContain('주소가 바뀌었거나')
    expect(button('다시 불러오기')).toBeDefined()
  })

  it('"고객·차량"은 S-05로 — 목록에서 왔으면 그때의 검색어·쪽으로', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    render(
      <MemoryRouter initialEntries={[{ pathname: '/customers/10', state: { listSearch: '?q=%EA%B9%80&page=2' } }]}>
        <Routes>
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/customers" element={<p>S-05</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    )
    await settle()
    click(document.querySelector('.s06__back'))
    expect(location.pathname).toBe('/customers')
    expect(location.search).toBe('?q=%EA%B9%80&page=2')
  })

  it('직접 들어왔으면 "고객·차량"은 목록 처음으로', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()
    expect(document.querySelector('.s06__back').getAttribute('href')).toBe('/customers')
  })
})
