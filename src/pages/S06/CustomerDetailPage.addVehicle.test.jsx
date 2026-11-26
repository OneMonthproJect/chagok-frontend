// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerDetailPage from './CustomerDetailPage.jsx'

// S-06 차량 추가 연결 (#21): [차량 추가] → 인라인 입력, 저장하면 07 다시 불러오기, 취소, S-05에서 열어 둔 채 시작(#19 연결).

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
const ok = (data) => jsonResponse(200, { success: true, data, error: null })

const OH = {
  customerId: 10,
  name: '오세훈',
  phone: '010-0000-0010',
  consent: true,
  vehicles: [{ vehicleId: 10, plateNumber: '55차0010', model: '쏘나타', modelYear: 2018, latestMileage: 97000, dueCount: 0, soonCount: 1 }],
}
const ADDED = {
  ...OH,
  vehicles: [...OH.vehicles, { vehicleId: 99, plateNumber: '12가3456', model: '아반떼', modelYear: null, latestMileage: null, dueCount: 0, soonCount: 0 }],
}

function renderPage(entry = '/customers/10') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const form = () => document.querySelector('form[aria-label="차량 추가"]')
const plates = () => Array.from(document.querySelectorAll('.vehicle-card h3')).map((h) => h.textContent)

function field(labelText) {
  const label = Array.from(document.querySelectorAll('label')).find((l) => l.textContent.replace('*', '').trim() === labelText)
  return document.getElementById(label.htmlFor)
}

function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('S-06 차량 추가', () => {
  it('처음에는 입력이 닫혀 있고, [차량 추가]를 누르면 열리며 그 버튼은 사라진다', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()
    expect(form()).toBeNull()

    click(button('차량 추가'))
    await settle()
    expect(form()).not.toBeNull()
    expect(button('차량 추가')).toBeUndefined()
  })

  it('저장하면 07을 다시 불러와 목록에 새 차량이 보이고 입력은 닫힌다', async () => {
    fetchMock.mockImplementation((url, init) => {
      if (init?.method === 'POST') return Promise.resolve(ok({ customerId: 10, vehicleId: 99 }))
      const gets = fetchMock.mock.calls.filter(([, i]) => i?.method === 'GET').length
      return Promise.resolve(ok(gets <= 1 ? OH : ADDED))
    })
    renderPage()
    await settle()
    expect(plates()).toEqual(['55차0010'])

    click(button('차량 추가'))
    await settle()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    click(button('추가'))
    await settle()
    await settle()

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)
    expect(calls).toEqual(['GET /api/customers/10', 'POST /api/customers/10/vehicles', 'GET /api/customers/10'])
    expect(plates()).toEqual(['55차0010', '12가3456'])
    expect(form()).toBeNull()
  })

  it('[취소]하면 입력이 닫히고 요청이 없다', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage()
    await settle()
    click(button('차량 추가'))
    await settle()
    click(button('취소'))
    await settle()
    expect(form()).toBeNull()
    expect(button('차량 추가')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('S-05가 state.openAddVehicle로 보내면 입력이 열린 채 시작한다 (#19 연결)', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage({ pathname: '/customers/10', state: { openAddVehicle: true } })
    await settle()
    expect(form()).not.toBeNull()
  })

  it('openAddVehicle이 없으면 열리지 않는다', async () => {
    fetchMock.mockResolvedValue(ok(OH))
    renderPage({ pathname: '/customers/10', state: { listSearch: '?q=a' } })
    await settle()
    expect(form()).toBeNull()
  })
})
