// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerListPage from './CustomerListPage.jsx'
import Pagination from './Pagination.jsx'

// S-05 (09 S-05·5장, FRONTEND_STRUCTURE 2장): 목록·건수, 검색어·쪽은 URL ?q=&page=, 검색 결과 없음 → 검색어를 채워 M-01,
// 조회 실패 → 사람이 누르는 다시 불러오기

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

const listBody = (items, totalElements = items.length, page = 0) => ({
  success: true,
  data: { items, page, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) },
  error: null,
})

const KIM = { customerId: 1, name: '김민수', phone: '010-0000-0001', consent: true, vehicles: [{ vehicleId: 1, plateNumber: '12가0001' }] }
const OH = {
  customerId: 10,
  name: '오세훈',
  phone: '010-0000-0010',
  consent: false,
  vehicles: [
    { vehicleId: 10, plateNumber: '55차0010' },
    { vehicleId: 11, plateNumber: '66카0011' },
  ],
}

function LocationProbe() {
  location = useLocation()
  return null
}

function renderPage(entry = '/customers') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CustomerListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

/** 검색 멈춤(0.3초) + URL 반영 + 응답까지 */
const waitSearch = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)))

function typeSearch(value) {
  const input = document.querySelector('input[type="search"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

describe('S-05 고객·차량 목록', () => {
  it('고객명·연락처·동의·차량번호들과 건수를 보인다 (줄은 아직 누를 수 없음)', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, listBody([OH, KIM]))))
    renderPage()
    await waitSearch()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers?page=0')
    const rows = document.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('오세훈')
    expect(rows[0].textContent).toContain('010-0000-0010')
    expect(rows[0].querySelector('.customer-consent').textContent).toBe('미동의')
    expect(rows[0].textContent).toContain('55차0010')
    expect(rows[0].textContent).toContain('66카0011')
    expect(rows[0].textContent).toContain('2대')
    expect(rows[1].querySelector('.customer-consent').textContent).toBe('동의')
    expect(rows[0].querySelector('a, button')).toBeNull()
    expect(document.body.textContent).toContain('등록 고객 2명')
    expect(document.body.textContent).toContain('2명 중 1–2')
  })

  it('검색어는 멈춘 뒤 URL ?q= 로 옮기고, 결과가 없으면 검색어를 채워 M-01을 연다', async () => {
    fetchMock.mockImplementation((url) => Promise.resolve(jsonResponse(200, url.includes('q=') ? listBody([]) : listBody([KIM]))))
    renderPage()
    await waitSearch()
    typeSearch('홍길동')
    await waitSearch() // 0.3초 멈춤 → URL
    await waitSearch() // URL → 05 요청·응답

    expect(new URLSearchParams(location.search).get('q')).toBe('홍길동')
    expect(fetchMock.mock.calls.at(-1)[0]).toBe(`/api/customers?q=${encodeURIComponent('홍길동')}&page=0`)
    expect(document.body.textContent).toContain('검색 결과가 없습니다.')
    click(button('‘홍길동’로 신규 등록'))
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('신규 고객·차량 등록')
    expect(dialog.querySelector('input[placeholder="예) 홍길동"]').value).toBe('홍길동')
  })

  it('URL의 q·page(1부터)로 시작한다 — 뒤로 와도 검색이 유지', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, listBody([KIM], 41, 1))))
    renderPage('/customers?q=%EA%B9%80&page=2')
    await waitSearch()
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/customers?q=${encodeURIComponent('김')}&page=1`)
    expect(document.querySelector('input[type="search"]').value).toBe('김')

    click(button('3'))
    await waitSearch()
    expect(new URLSearchParams(location.search).get('page')).toBe('3')
    expect(fetchMock.mock.calls.at(-1)[0]).toBe(`/api/customers?q=${encodeURIComponent('김')}&page=2`)
  })

  it('등록된 고객이 없으면 "등록된 고객이 없습니다."', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, listBody([]))))
    renderPage()
    await waitSearch()
    expect(document.body.textContent).toContain('등록된 고객이 없습니다.')
  })

  it('조회 실패: "불러오지 못했습니다." — 자동으로 다시 부르지 않고 사람이 누를 때만', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, listBody([KIM]))))
    renderPage()
    await waitSearch()
    expect(document.body.textContent).toContain('불러오지 못했습니다.')
    await waitSearch()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    click(button('다시 불러오기'))
    await waitSearch()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
  })
})

describe('Pagination', () => {
  it('쪽이 하나면 그리지 않는다', () => {
    render(<Pagination page={0} totalPages={1} onChange={() => {}} />)
    expect(document.querySelector('nav')).toBeNull()
  })

  it('첫 쪽에서 이전, 끝 쪽에서 다음은 비활성. 현재 쪽 표시, 누르면 0부터 센 쪽', () => {
    const onChange = vi.fn()
    render(<Pagination page={0} totalPages={3} onChange={onChange} />)
    expect(button('이전 쪽').disabled).toBe(true)
    expect(button('다음 쪽').disabled).toBe(false)
    expect(button('1').getAttribute('aria-current')).toBe('page')
    click(button('3'))
    expect(onChange).toHaveBeenCalledWith(2)
    cleanup()
    render(<Pagination page={2} totalPages={3} onChange={onChange} />)
    expect(button('다음 쪽').disabled).toBe(true)
  })
})
