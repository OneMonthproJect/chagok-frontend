// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerListPage from './CustomerListPage.jsx'

// S-05 (09 S-05·5장): 목록·건수, 검색 결과 없음 → 검색어를 채워 M-01, 조회 실패 → 사람이 누르는 다시 불러오기

let fetchMock

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

const page = (items, totalElements = items.length) => ({
  success: true,
  data: { items, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) },
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

/** 검색 멈춤(0.3초) + 응답까지 */
const waitSearch = () => act(() => new Promise((resolve) => setTimeout(resolve, 350)))

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
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, page([OH, KIM]))))
    render(<CustomerListPage />)
    await waitSearch()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers?page=0')
    const rows = document.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('오세훈')
    expect(rows[0].textContent).toContain('010-0000-0010')
    expect(rows[0].textContent).toContain('미동의')
    expect(rows[0].textContent).toContain('55차0010')
    expect(rows[0].textContent).toContain('66카0011')
    expect(rows[0].textContent).toContain('2대')
    expect(rows[1].textContent).toContain('동의')
    expect(rows[0].querySelector('a, button')).toBeNull()
    expect(document.body.textContent).toContain('등록 고객 2명')
    expect(document.body.textContent).toContain('2명 중 1–2')
  })

  it('검색 결과가 없으면 문구와 함께, 검색어를 채워 M-01을 연다', async () => {
    fetchMock.mockImplementation((url) => Promise.resolve(jsonResponse(200, url.includes('q=') ? page([]) : page([KIM]))))
    render(<CustomerListPage />)
    await waitSearch()
    typeSearch('홍길동')
    await waitSearch()

    expect(fetchMock.mock.calls.at(-1)[0]).toBe(`/api/customers?q=${encodeURIComponent('홍길동')}&page=0`)
    expect(document.body.textContent).toContain('검색 결과가 없습니다.')
    click(button('‘홍길동’로 신규 등록'))
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('신규 고객·차량 등록')
    expect(dialog.querySelector('input[placeholder="예) 홍길동"]').value).toBe('홍길동')
  })

  it('등록된 고객이 없으면 "등록된 고객이 없습니다."', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, page([]))))
    render(<CustomerListPage />)
    await waitSearch()
    expect(document.body.textContent).toContain('등록된 고객이 없습니다.')
  })

  it('조회 실패: "불러오지 못했습니다." — 자동으로 다시 부르지 않고 사람이 누를 때만', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, page([KIM]))))
    render(<CustomerListPage />)
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
