// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import VehicleDetailPage from './VehicleDetailPage.jsx'

// S-07 차량 수정 (#32, 04 F-CUS-06, 08 23, 05 POL-124·125): [수정] → 머리 아래 인라인 입력, 09에서 읽은 version + 바꾼 칸만,
// 저장 뒤 09 다시 불러오기, 409(그 사이 방문 기록 저장 포함) → 09 다시 불러와 최신 주행거리 + 고친 칸 유지,
// 값이 있던 연식·최근 주행거리는 비울 수 없음. VehicleDetailPage.test.jsx(#22)와 나눠 둔다(열린 PR #63과 겹치지 않게).

let fetchMock
let vehicles
let patch

beforeEach(() => {
  vehicles = []
  patch = null
  let index = 0
  fetchMock = vi.fn((path, init) => {
    if (path === '/api/vehicles/4' && init.method === 'PATCH') return patch()
    if (path === '/api/vehicles/4') {
      const data = vehicles[Math.min(index, vehicles.length - 1)]
      index += 1
      return ok(data)
    }
    if (path === '/api/vehicles/4/item-status') return ok({ vehicleId: 4, asOf: '2026-11-26', inputMileage: null, items: [] })
    if (path === '/api/vehicles/4/visits') return ok({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    return Promise.reject(new Error(`unexpected ${path}`))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message) => jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details: null } })

/** 08 09 JSON 예시 */
const VEHICLE = {
  vehicleId: 4,
  plateNumber: '78라0004',
  model: 'K5',
  modelYear: 2020,
  latestMileage: 45000,
  version: 0,
  customer: { customerId: 4, name: '최지은', phone: '010-0000-0004', consent: true },
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/vehicles/4']}>
      <Routes>
        <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const form = () => document.querySelector('form[aria-label="차량 수정"]')
const vehicleCalls = () =>
  fetchMock.mock.calls
    .filter(([url]) => url === '/api/vehicles/4')
    .map(([url, init]) => `${init.method} ${url}${init.body ? ` ${init.body}` : ''}`)

function field(labelText) {
  const label = Array.from(form().querySelectorAll('label')).find((l) => l.textContent.replace('*', '').trim() === labelText)
  return document.getElementById(label.htmlFor)
}

function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function openEdit() {
  renderPage()
  await settle()
  click(button('수정'))
  await settle()
}

describe('S-07 차량 수정 (#32)', () => {
  it('[수정]을 누르면 지금 값으로 입력이 열린다 (고객 칸은 없다)', async () => {
    vehicles = [VEHICLE]
    await openEdit()
    expect(field('차량번호').value).toBe('78라0004')
    expect(field('차종').value).toBe('K5')
    expect(field('연식').value).toBe('2020')
    expect(field('최근 주행거리').value).toBe('45000')
    expect(form().textContent).not.toContain('고객명')
  })

  it('차종만 바꿔 저장하면 23에 읽은 version + model만 보내고, 09를 다시 불러오며 입력은 닫힌다 (08 23 예시)', async () => {
    vehicles = [VEHICLE, { ...VEHICLE, model: 'K5 하이브리드', version: 1 }]
    patch = () => ok({ vehicleId: 4, plateNumber: '78라0004', model: 'K5 하이브리드', modelYear: 2020, latestMileage: 45000, version: 1 })
    await openEdit()
    type(field('차종'), 'K5 하이브리드')
    click(button('저장'))
    await settle()

    expect(vehicleCalls()).toEqual(['GET /api/vehicles/4', 'PATCH /api/vehicles/4 {"version":0,"model":"K5 하이브리드"}', 'GET /api/vehicles/4'])
    expect(form()).toBeNull()
    expect(document.querySelector('.vehicle-header__spec').textContent).toContain('K5 하이브리드')
  })

  it('409(그 사이 방문 기록 저장): 09를 다시 불러와 최신 주행거리, 고친 칸은 그대로 — 다음 저장은 새 version, 주행거리를 옛 값으로 덮어쓰지 않음', async () => {
    vehicles = [VEHICLE, { ...VEHICLE, latestMileage: 47000, version: 1 }]
    let patches = 0
    patch = () => {
      patches += 1
      return patches === 1 ? fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.') : ok({ ...VEHICLE, model: 'K5 LPG', version: 2 })
    }
    await openEdit()
    type(field('차종'), 'K5 LPG')
    click(button('저장'))
    await settle()

    expect(document.body.textContent).toContain('다른 직원이 먼저 수정했습니다.')
    expect(document.querySelector('.vehicle-header__spec').textContent).toContain('47,000 km')
    expect(field('차종').value).toBe('K5 LPG')
    expect(vehicleCalls()).toHaveLength(3) // 자동으로 다시 보내지 않음

    expect(field('최근 주행거리').value).toBe('47000') // 손대지 않은 칸은 최신 값으로

    click(button('저장'))
    await settle()
    expect(vehicleCalls()[3]).toBe('PATCH /api/vehicles/4 {"version":1,"model":"K5 LPG"}')
  })

  it('값이 있던 연식·최근 주행거리를 비우면 보내지 않고 "비울 수 없습니다."', async () => {
    vehicles = [VEHICLE]
    await openEdit()
    type(field('연식'), '')
    type(field('최근 주행거리'), '')
    click(button('저장'))
    await settle()

    for (const label of ['연식', '최근 주행거리']) {
      expect(document.getElementById(`${field(label).id}-error`).textContent).toContain('비울 수 없습니다.')
    }
    expect(vehicleCalls()).toEqual(['GET /api/vehicles/4'])
  })
})
