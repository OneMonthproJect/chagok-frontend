// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import VehiclePicker from './VehiclePicker.jsx'

// VehiclePicker (M-02·S-08이 pages에서 끼움): 검색어 없으면 최근 2대, 차량 단위 선택지, 선택 표시, onRegister가 없으면 등록 버튼 없음

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const listBody = (items) => ({ success: true, data: { items, page: 0, size: 20, totalElements: items.length, totalPages: 1 }, error: null })

const ITEMS = [
  {
    customerId: 10,
    name: '오세훈',
    phone: '010-0000-0010',
    consent: true,
    vehicles: [
      { vehicleId: 10, plateNumber: '55차0010' },
      { vehicleId: 11, plateNumber: '66카0011' },
    ],
  },
  { customerId: 9, name: '장미래', phone: '010-0000-0009', consent: false, vehicles: [{ vehicleId: 9, plateNumber: '44자0009' }] },
  { customerId: 12, name: '차없음', phone: '010-0000-0012', consent: true, vehicles: [] },
]

const wait = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)))
const options = () => Array.from(document.querySelectorAll('[role="option"]'))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

function typeSearch(value) {
  const input = document.querySelector('input[type="search"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('VehiclePicker', () => {
  it('검색어가 없으면 최근 2대, 고르면 onChange(차량·고객)', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(listBody(ITEMS))))
    const onChange = vi.fn()
    render(<VehiclePicker value={null} onChange={onChange} />)
    await wait()
    expect(options().map((o) => o.querySelector('.license-plate').textContent)).toEqual(['55차0010', '66카0011'])
    click(options()[1])
    expect(onChange).toHaveBeenCalledWith({ vehicleId: 11, plateNumber: '66카0011', customerId: 10, customerName: '오세훈', phone: '010-0000-0010' })
  })

  it('검색하면 차량 단위로 모두, 고른 차량은 "선택됨", 차량 없는 고객은 빠진다', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(listBody(ITEMS))))
    render(<VehiclePicker value={9} onChange={() => {}} />)
    typeSearch('0')
    await wait()
    expect(options()).toHaveLength(3)
    const selected = options().find((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected.textContent).toContain('44자0009')
    expect(selected.textContent).toContain('선택됨')
  })

  it('검색 결과 없음 문구, onRegister가 없으면 등록 버튼도 없다', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(listBody([]))))
    render(<VehiclePicker value={null} onChange={() => {}} />)
    typeSearch('홍길동')
    await wait()
    expect(document.body.textContent).toContain('검색 결과가 없습니다.')
    expect(button('+ 신규 고객·차량 등록')).toBeUndefined()
  })

  it('onRegister가 있으면 검색어를 넘긴다', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(listBody([]))))
    const onRegister = vi.fn()
    render(<VehiclePicker value={null} onChange={() => {}} onRegister={onRegister} />)
    typeSearch(' 12가3456 ')
    await wait()
    click(button('+ 신규 고객·차량 등록'))
    await act(async () => {})
    expect(onRegister).toHaveBeenCalledWith('12가3456')
  })
})
