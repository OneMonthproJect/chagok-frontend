// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import VisitRecordPage from './VisitRecordPage.jsx'

// S-08 방문·정비 기록 (09 S-08·5장, 04 F-MNT-01, 08 09·12·13, 05 POL-30·120~125, D-58, #23 테스트):
// 차량 채움·검색, 방문일 기본 서울 오늘, 고른 항목만 12로 저장 → S-07, 0개면 저장 비활성, 저장 중 비활성·한 번만,
// 400 칸 옆·입력값 유지, 500·네트워크는 사람이 누르는 다시 시도(자동 재전송 없음), 연식·주행거리 빈 차량(D-58),
// 주행거리 경계(0·2,000,000 / 2,000,001·-1), 미래 방문일, 404 → 찾을 수 없음,
// 저장 전 미리보기(10, #35)는 방문 정보 아래에 있고 실패해도 저장을 막지 않음(자세한 동작은 VisitPreview.test.jsx)

let fetchMock
let location
/** "METHOD 경로" 또는 경로 → 응답 (부를 때마다 새 Response) */
let routes

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T15:30:00Z')) // 서울은 2026-11-24 00:30 — 브라우저 시간대와 관계없이 24일
  routes = {}
  fetchMock = vi.fn((path, init = {}) => {
    const method = init.method ?? 'GET'
    const handler = routes[`${method} ${path}`] ?? (method === 'GET' ? routes[path] : undefined)
    if (handler) return handler(init)
    if (method === 'GET' && path.startsWith('/api/customers')) return routes.customers?.() ?? Promise.reject(new Error(`unexpected ${path}`))
    if (method === 'GET' && /^\/api\/vehicles\/\d+\/item-status/.test(path)) return (routes.itemStatus ?? ok(ITEM_STATUS))(init)
    return Promise.reject(new Error(`unexpected ${method} ${path}`))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data) => () => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, fieldErrors = []) => () =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details: null } })

/** 08 09 JSON 예시 (시나리오 B의 78라0004) */
const VEHICLE = {
  vehicleId: 4,
  plateNumber: '78라0004',
  model: 'K5',
  modelYear: 2020,
  latestMileage: 45000,
  customer: { customerId: 4, name: '최지은', phone: '010-0000-0004', consent: true },
}
/** 07 7.2 66카0011 — 연식·주행거리가 비어 있음(D-58) */
const EMPTY_VEHICLE = {
  vehicleId: 11,
  plateNumber: '66카0011',
  model: '스포티지',
  modelYear: null,
  latestMileage: null,
  customer: { customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: true },
}

const item = (itemId, code, name, sortOrder, active = true) => ({ itemId, code, name, cycleMonths: 6, cycleKm: 10000, active, sortOrder })
/** 08 13 JSON 예시 (순서를 섞어 sortOrder 순으로 보이는지 본다) */
const ITEMS = [
  item(6, 'BATTERY', '배터리', 6),
  item(1, 'ENGINE_OIL', '엔진오일', 1),
  item(2, 'AIR_CLEANER', '에어클리너', 2),
  item(3, 'AC_FILTER', '에어컨필터', 3),
  item(4, 'BRAKE_PAD', '브레이크패드', 4),
  item(5, 'TIRE', '타이어 상태 점검', 5),
]
const SAVED = { vehicleId: 4, visitKey: '3f1c2b9e-0000-4000-8000-000000000012', savedCount: 2 }
/** 08 10 (주행거리 없이). 미리보기 자체는 VisitPreview.test.jsx가 본다 */
const ITEM_STATUS = {
  vehicleId: 4,
  asOf: '2026-11-24',
  inputMileage: null,
  items: ITEMS.map((i) => ({ itemId: i.itemId, code: i.code, name: i.name, status: 'UNKNOWN', dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null })),
}

/** 08 7.1 36 JSON 예시 (A 정비소 사장·정비사) */
const ASSIGNEES = {
  items: [
    { staffId: 1, name: '박사장', role: 'OWNER', colorIndex: 0 },
    { staffId: 2, name: '김정비', role: 'MECHANIC', colorIndex: 1 },
  ],
}
/** 08 03 — 정비사(mech_a)로 로그인. 직접 진입이면 담당 기본값 */
const ME = { staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' }

function serve({ vehicle = ok(VEHICLE), items = ok(ITEMS), save = ok(SAVED), id = 4, assignees = ok(ASSIGNEES), me = ok(ME) } = {}) {
  routes[`/api/vehicles/${id}`] = vehicle
  routes['/api/items'] = items
  routes[`POST /api/vehicles/${id}/visits`] = save
  routes['/api/staff/assignees'] = assignees
  routes['/api/me'] = me
}

function LocationProbe() {
  location = useLocation()
  return null
}

function renderPage(entry = '/visits/new?vehicleId=4') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/visits/new" element={<VisitRecordPage />} />
        <Route path="/vehicles/:vehicleId" element={<p>S-07</p>} />
        <Route path="/" element={<p>S-02</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const waitSearch = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)))
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const saveButton = () => Array.from(document.querySelectorAll('.s08__actions button')).at(-1)
const input = (id) => document.getElementById(id)
const fieldMessage = (id) => document.getElementById(`${id}-error`)?.textContent ?? null
const rowNames = () => Array.from(document.querySelectorAll('.item-record-row__name')).map((el) => el.textContent)
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const postBody = (n = 0) => JSON.parse(posts()[n][1].body)

function type(id, value) {
  const el = input(id)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function choose(itemId, choice) {
  click(document.querySelector(`input[name="record-${itemId}"][value="${choice}"]`))
}

describe('S-08 방문·정비 기록', () => {
  it('차량(09)과 항목(13)을 불러 채운다 — 방문일 기본은 서울 오늘, 항목은 쓰는 것만 sortOrder 순, 미리보기(10)는 날짜 기준으로', async () => {
    serve({ items: ok([...ITEMS, item(7, 'ENGINE_OIL', '쓰지 않는 항목', 7, false)]) })
    renderPage()
    await settle()

    // 직접 진입이면 예약(17)은 부르지 않는다
    expect(fetchMock.mock.calls.map(([path]) => path).sort()).toEqual([
      '/api/items',
      '/api/me',
      '/api/staff/assignees',
      '/api/vehicles/4',
      '/api/vehicles/4/item-status',
    ])
    expect(document.querySelector('.vehicle-header__plate').textContent).toBe('78라0004')
    // 순서: 방문 정보 → 미리보기 → 항목 기록 → 담당 정비사 (09 S-08 2·3·4·5번)
    const titles = Array.from(document.querySelectorAll('.s08 h2')).map((h) => h.textContent)
    expect(titles.slice(-4)).toEqual(['방문 정보', '확인이 필요한 항목', '정비 항목 기록', '담당 정비사'])
    expect(document.querySelector('.visit-preview__chip').textContent).toBe('저장 전 미리보기 — 기록되지 않음')
    expect(document.querySelector('.vehicle-header__customer').textContent).toContain('최지은')
    expect(input('visit-date').value).toBe('2026-11-24')
    expect(input('visit-date').getAttribute('max')).toBe('2026-11-24')
    expect(input('visit-model-year')).toBeNull() // 연식이 있는 차량은 연식 칸 없음
    expect(rowNames()).toEqual(['엔진오일', '에어클리너', '에어컨필터', '브레이크패드', '타이어 상태 점검', '배터리'])
    // 줄마다 기록 안 함(기본)/교체/점검 — P0-핵심에 거절·외부 없음
    const labels = Array.from(document.querySelectorAll('.item-record-row')[0].querySelectorAll('label')).map((l) => l.textContent)
    expect(labels).toEqual(['기록 안 함', '교체', '점검'])
    expect(document.querySelectorAll('input[value="NONE"]:checked')).toHaveLength(6)
    expect(document.body.textContent).not.toMatch(/정상|불량|고장/)
  })

  it('고른 항목이 없으면 저장 비활성, 고르면 메모 칸이 열리고 활성', async () => {
    serve()
    renderPage()
    await settle()

    expect(saveButton().disabled).toBe(true)
    expect(document.querySelector('.s08__summary').textContent).toBe('기록할 항목을 1개 이상 골라 주세요.')
    expect(input('record-memo-1')).toBeNull()

    choose(1, 'REPLACE')
    expect(saveButton().disabled).toBe(false)
    expect(saveButton().textContent).toBe('1건 저장')
    expect(input('record-memo-1')).not.toBeNull()
    expect(document.querySelector('.s08__summary').textContent).toBe('1개 항목 · 엔진오일(교체)')

    choose(1, 'NONE')
    expect(saveButton().disabled).toBe(true)
    click(saveButton())
    expect(posts()).toHaveLength(0)
  })

  it('저장: 고른 줄만 08 12 모양으로 보내고(방문일 문자열 그대로) 성공하면 S-07로', async () => {
    serve()
    renderPage()
    await settle()

    type('visit-mileage', '55000')
    choose(5, 'INSPECT')
    choose(1, 'REPLACE')
    type('record-memo-5', '앞 타이어 마모 확인')
    click(saveButton())
    await settle()

    expect(posts()).toHaveLength(1)
    expect(posts()[0][0]).toBe('/api/vehicles/4/visits')
    expect(postBody()).toEqual({
      visitDate: '2026-11-24',
      mileage: 55000,
      mechanicId: 2, // 직접 진입 → 로그인 계정(#62)
      records: [
        { itemId: 1, type: 'REPLACE', memo: null },
        { itemId: 5, type: 'INSPECT', memo: '앞 타이어 마모 확인' },
      ],
    })
    expect(location.pathname).toBe('/vehicles/4')
  })

  it('미리보기(10) 실패는 미리보기 안에만 보이고 입력·저장을 막지 않는다', async () => {
    serve()
    routes.itemStatus = fail(500, 'INTERNAL_ERROR', '잠시 후 다시 시도해 주세요.')
    renderPage()
    await settle()

    expect(document.querySelector('.visit-preview .error-notice').textContent).toContain('기록 저장에는 영향이 없습니다.')
    expect(document.querySelectorAll('.error-notice')).toHaveLength(1)
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(1)
    expect(location.pathname).toBe('/vehicles/4')
  })

  it('저장 중에는 버튼 비활성, 두 번 눌러도 요청은 한 번 (POL-120)', async () => {
    let finish
    serve({ save: () => new Promise((resolve) => (finish = () => resolve(new Response(JSON.stringify({ success: true, data: SAVED, error: null }), { status: 200 })))) })
    renderPage()
    await settle()

    choose(1, 'REPLACE')
    click(saveButton())
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(1)
    expect(saveButton().disabled).toBe(true)
    expect(saveButton().getAttribute('aria-busy')).toBe('true')

    await act(async () => finish())
    await settle()
    expect(location.pathname).toBe('/vehicles/4')
  })

  it('400 fieldErrors는 칸 옆에, 입력값 유지, 이동하지 않음 (POL-121, 주행거리 2,000,001)', async () => {
    serve({
      save: fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [
        { field: 'mileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' },
        { field: 'records[0].memo', reason: '200자 이하로 입력해 주세요.' },
      ]),
    })
    renderPage()
    await settle()

    type('visit-mileage', '2000001')
    choose(4, 'INSPECT')
    type('record-memo-4', '패드 확인')
    click(saveButton())
    await settle()

    expect(fieldMessage('visit-mileage')).toContain('0 이상 2,000,000 이하로 입력해 주세요.')
    expect(input('visit-mileage').getAttribute('aria-invalid')).toBe('true')
    expect(fieldMessage('record-memo-4')).toContain('200자 이하로 입력해 주세요.')
    expect(document.querySelector('.error-notice').textContent).toContain('입력값을 확인해 주세요.')
    expect(input('visit-mileage').value).toBe('2000001')
    expect(input('record-memo-4').value).toBe('패드 확인')
    expect(location.pathname).toBe('/visits/new')

    // 고치면 그 칸의 오류가 사라진다
    type('visit-mileage', '2000000')
    expect(fieldMessage('visit-mileage')).toBeNull()
  })

  it('주행거리 경계: 0·2,000,000은 그대로 보내고, -1·소수는 보내지 않고 칸에 (08 0.1)', async () => {
    serve()
    renderPage()
    await settle()
    choose(1, 'REPLACE')

    type('visit-mileage', '-1')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(fieldMessage('visit-mileage')).toContain('0 이상의 정수로 입력해 주세요.')

    type('visit-mileage', '1.5')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)

    type('visit-mileage', '0')
    click(saveButton())
    await settle()
    expect(postBody(0).mileage).toBe(0)
  })

  it('주행거리 2,000,000(상한)은 그대로 보낸다', async () => {
    serve()
    renderPage()
    await settle()
    choose(1, 'REPLACE')
    type('visit-mileage', '2,000,000')
    click(saveButton())
    await settle()
    expect(postBody(0).mileage).toBe(2_000_000)
  })

  it('미래 방문일은 보내지 않는다', async () => {
    serve()
    renderPage()
    await settle()
    choose(1, 'REPLACE')
    type('visit-date', '2026-11-25')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(fieldMessage('visit-date')).toContain('오늘 이전 날짜만 입력할 수 있습니다.')
  })

  it('500은 위쪽 안내 + 사람이 누르는 다시 시도만, 입력값 유지 (POL-125·129)', async () => {
    let count = 0
    serve({
      save: () => {
        count += 1
        return count === 1 ? fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')() : ok(SAVED)()
      },
    })
    renderPage()
    await settle()

    type('visit-mileage', '55000')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    await settle()

    const notice = document.querySelector('.error-notice')
    expect(notice.textContent).toContain('저장하지 못했습니다.')
    expect(notice.textContent).toContain('일시적인 오류가 발생했습니다.')
    expect(posts()).toHaveLength(1) // 자동으로 다시 보내지 않음
    expect(input('visit-mileage').value).toBe('55000')
    expect(document.querySelector('input[name="record-1"][value="REPLACE"]').checked).toBe(true)

    click(button('다시 시도'))
    await settle()
    expect(posts()).toHaveLength(2)
    expect(postBody(1)).toEqual(postBody(0))
    expect(location.pathname).toBe('/vehicles/4')
  })

  it('네트워크 오류도 입력값 유지, 다시 보내지 않음', async () => {
    serve({ save: () => Promise.reject(new TypeError('Failed to fetch')) })
    renderPage()
    await settle()

    choose(6, 'INSPECT')
    click(saveButton())
    await settle()
    await settle()

    expect(document.querySelector('.error-notice').textContent).toContain('서버에 연결하지 못했습니다.')
    // 실제로는 저장됐을 수 있어(응답만 끊김) 입력값을 잃지 않고 S-07을 새 창으로 열어 확인하게 한다(08 0.2)
    const check = document.querySelector('.s08__check-saved')
    expect(check.getAttribute('href')).toBe('/vehicles/4')
    expect(check.getAttribute('target')).toBe('_blank')
    expect(posts()).toHaveLength(1)
    expect(document.querySelector('input[name="record-6"][value="INSPECT"]').checked).toBe(true)
    expect(location.pathname).toBe('/visits/new')
  })

  it('D-58: 연식·주행거리가 비어 있는 차량은 안내 + 두 칸 필수, 연식은 vehicle.modelYear로 보낸다', async () => {
    serve({ vehicle: ok(EMPTY_VEHICLE), id: 11, save: ok({ ...SAVED, vehicleId: 11 }) })
    renderPage('/visits/new?vehicleId=11')
    await settle()

    expect(document.body.textContent).toContain('연식·주행거리를 입력해 주세요.')
    expect(input('visit-model-year')).not.toBeNull()
    expect(input('visit-mileage').getAttribute('aria-required')).toBe('true')

    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(fieldMessage('visit-mileage')).toContain('차량의 주행거리가 비어 있어 입력해 주세요.')
    expect(fieldMessage('visit-model-year')).toContain('차량의 연식이 비어 있어 입력해 주세요.')

    type('visit-mileage', '12000')
    type('visit-model-year', '2019')
    click(saveButton())
    await settle()
    expect(postBody()).toEqual({
      visitDate: '2026-11-24',
      mileage: 12000,
      vehicle: { modelYear: 2019 },
      mechanicId: 2,
      records: [{ itemId: 1, type: 'REPLACE', memo: null }],
    })
    expect(location.pathname).toBe('/vehicles/11')
  })

  it('없는 차량·다른 정비소 차량(404, X5)이면 찾을 수 없음', async () => {
    serve({ vehicle: fail(404, 'NOT_FOUND', '찾을 수 없습니다.'), id: 12 })
    renderPage('/visits/new?vehicleId=12')
    await settle()
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
    expect(document.querySelector('.s08__footer')).toBeNull()
    // 미리보기(08 10)는 차량을 불러온 뒤에만 그린다 — 404면 부르지 않는다(VisitPreview 404 주석의 근거)
    expect(fetchMock.mock.calls.map(([path]) => path)).not.toContain('/api/vehicles/12/item-status')

    click(button('홈으로'))
    expect(location.pathname).toBe('/')
  })

  it('vehicleId가 숫자가 아니면 부르지 않고 찾을 수 없음', async () => {
    serve()
    renderPage('/visits/new?vehicleId=abc')
    await settle()
    expect(fetchMock.mock.calls.map(([path]) => path)).not.toContain('/api/vehicles/abc')
    expect(document.body.textContent).toContain('찾을 수 없습니다.')
  })

  it('차량을 지정하지 않으면 검색해서 고르고, 고르면 주소에 vehicleId가 들어간다', async () => {
    serve()
    routes.customers = ok({
      items: [{ customerId: 4, name: '최지은', phone: '010-****-0004', consent: true, vehicles: [{ vehicleId: 4, plateNumber: '78라0004' }] }],
      page: 0, size: 20, totalElements: 1, totalPages: 1,
    })
    renderPage('/visits/new')
    await waitSearch()

    expect(document.querySelector('.s08__footer')).toBeNull()
    click(document.querySelector('[role="option"]'))
    await settle()

    expect(location.search).toBe('?vehicleId=4')
    expect(document.querySelector('.vehicle-header__plate').textContent).toBe('78라0004')

    // 다시 바꿀 수 있다
    click(button('차량 바꾸기'))
    await settle() // Button은 누른 뒤 다음 차례에 onClick을 부른다(submitGuard)
    expect(location.search).toBe('')
    expect(document.querySelector('.vehicle-picker')).not.toBeNull()
  })

  it('차량을 바꾸면 앞 차량에 넣던 주행거리·기록·메모를 비운다(다른 차량에 저장되지 않게)', async () => {
    serve()
    serve({ vehicle: ok(EMPTY_VEHICLE), id: 11 })
    routes.customers = ok({
      items: [
        { customerId: 4, name: '최지은', phone: '010-****-0004', consent: true, vehicles: [{ vehicleId: 4, plateNumber: '78라0004' }] },
        { customerId: 10, name: '오세훈', phone: '010-****-0010', consent: true, vehicles: [{ vehicleId: 11, plateNumber: '66카0011' }] },
      ],
      page: 0, size: 20, totalElements: 2, totalPages: 1,
    })
    renderPage('/visits/new')
    await waitSearch()
    click(document.querySelectorAll('[role="option"]')[0])
    await settle()

    type('visit-mileage', '55000')
    choose(1, 'REPLACE')
    type('record-memo-1', '엔진오일 교체')
    expect(saveButton().disabled).toBe(false)

    click(button('차량 바꾸기'))
    await settle()
    await waitSearch()
    click(document.querySelectorAll('[role="option"]')[1])
    await settle()

    expect(document.querySelector('.vehicle-header__plate').textContent).toBe('66카0011')
    expect(input('visit-mileage').value).toBe('')
    expect(input('visit-date').value).toBe('2026-11-24')
    expect(document.querySelectorAll('input[value="NONE"]:checked')).toHaveLength(6)
    expect(input('record-memo-1')).toBeNull()
    expect(saveButton().disabled).toBe(true)
  })

  it('예약에서 왔으면(reservationId) 차량을 바꾸지 못하고, reservationId는 요청에 넣지 않는다 (08 12, POL-95)', async () => {
    serve()
    renderPage('/visits/new?vehicleId=4&reservationId=3')
    await settle()

    expect(button('차량 바꾸기')).toBeUndefined()
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(postBody()).not.toHaveProperty('reservationId')
  })

  it('항목(13) 조회 실패는 사람이 누르는 다시 불러오기', async () => {
    let count = 0
    serve({
      items: () => {
        count += 1
        return count === 1 ? fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')() : ok(ITEMS)()
      },
    })
    renderPage()
    await settle()

    expect(document.body.textContent).toContain('정비 항목을 불러오지 못했습니다.')
    expect(saveButton().disabled).toBe(true)
    expect(count).toBe(1)

    click(button('다시 불러오기'))
    await settle()
    expect(rowNames()).toHaveLength(6)
  })

  it('취소는 이전 화면으로(처음 연 화면이면 S-07)', async () => {
    serve()
    renderPage()
    await settle()
    click(button('취소'))
    await settle()
    expect(location.pathname).toBe('/vehicles/4')
  })
})

// 담당 정비사 (#62, 09 S-08 5번, 04 F-MNT-01, 05 POL-59·120~129, 08 03·12·17·36, X13)
describe('S-08 담당 정비사 (P0-나머지)', () => {
  /** 08 17 패널 — 담당 기본값에 쓰는 reservation.assignee만 의미가 있다 */
  const panel = (assignee) => ({
    reservation: {
      reservationId: 3,
      reservedAt: '2026-11-24T10:00:00',
      status: 'COMPLETED',
      needsAction: false,
      version: 1,
      purpose: { items: [], other: false, memo: null },
      ...(assignee === undefined ? {} : { assignee }),
    },
    customer: VEHICLE.customer,
    vehicle: { vehicleId: 4, plateNumber: '78라0004', model: 'K5', modelYear: 2020, latestMileage: 45000 },
    recentVisits: [],
    totalVisitCount: 0,
    itemStatuses: [],
  })
  const OWNER = { staffId: 1, name: '박사장', colorIndex: 0 }

  const select = () => input('visit-mechanic')
  const optionLabels = () => Array.from(select().options).filter((o) => o.value !== '').map((o) => o.textContent)
  const infoNotice = () => document.querySelector('.error-notice--info')?.textContent ?? null
  function pick(staffId) {
    act(() => {
      select().value = String(staffId)
      select().dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  const pathsCalled = (path) => fetchMock.mock.calls.filter(([p]) => p === path).length

  it('직접 진입: 후보(36)를 순서대로 보이고 기본값은 로그인 계정(03), 저장 요청에 mechanicId', async () => {
    serve()
    renderPage()
    await settle()

    expect(optionLabels()).toEqual(['박사장 (사장)', '김정비 (정비사)'])
    expect(select().value).toBe('2')
    expect(select().disabled).toBe(false)
    expect(infoNotice()).toBeNull()
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(postBody().mechanicId).toBe(2)
  })

  it('정비사도 다른 사람(사장)을 담당으로 고를 수 있다', async () => {
    serve()
    renderPage()
    await settle()

    pick(1)
    expect(select().value).toBe('1')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(postBody().mechanicId).toBe(1)
  })

  it('예약 경유: 그 예약의 담당(17 reservation.assignee)이 기본값 — 로그인 계정이 아니어도', async () => {
    serve()
    routes['/api/reservations/3/panel'] = ok(panel(OWNER))
    renderPage('/visits/new?vehicleId=4&reservationId=3')
    await settle()

    expect(pathsCalled('/api/reservations/3/panel')).toBe(1)
    expect(select().value).toBe('1')
    expect(infoNotice()).toBeNull()
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(postBody().mechanicId).toBe(1)
    expect(postBody()).not.toHaveProperty('reservationId') // 예약과 데이터로 잇지 않는다(POL-95)
  })

  it('예약 경유인데 예약을 읽지 못하면(17 실패) 로그인 계정 + 확인 안내, 자동으로 다시 부르지 않음', async () => {
    serve()
    routes['/api/reservations/3/panel'] = fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderPage('/visits/new?vehicleId=4&reservationId=3')
    await settle()

    expect(select().value).toBe('2')
    expect(infoNotice()).toContain('예약의 담당을 확인하지 못해 로그인 계정으로 채웠습니다.')
    expect(pathsCalled('/api/reservations/3/panel')).toBe(1)
    // 사람이 고르면 안내를 거둔다
    pick(1)
    expect(infoNotice()).toBeNull()
  })

  it('예약 응답에 assignee가 없거나(17 #89 전) 후보에 없는 담당이면 로그인 계정 + 확인 안내', async () => {
    for (const assignee of [undefined, { staffId: 9, name: '없는 사람', colorIndex: 0 }]) {
      serve()
      routes['/api/reservations/3/panel'] = ok(panel(assignee))
      renderPage('/visits/new?vehicleId=4&reservationId=3')
      await settle()
      expect(select().value).toBe('2')
      expect(infoNotice()).toContain('담당을 확인해 주세요.')
      cleanup()
    }
  })

  it('예약 경유인데 예약(17)도 로그인 계정(03)도 읽지 못하면 비워 두고 "골라 주세요" 안내', async () => {
    serve({ me: fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.') })
    routes['/api/reservations/3/panel'] = fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderPage('/visits/new?vehicleId=4&reservationId=3')
    await settle()

    expect(select().value).toBe('')
    expect(infoNotice()).toContain('예약의 담당을 확인하지 못했습니다. 담당을 골라 주세요.')
    expect(infoNotice()).not.toContain('로그인 계정으로 채웠습니다')
  })

  it('기본값을 정하는 동안(36 응답 전)은 칸·저장이 잠긴다', async () => {
    let finish
    serve({ assignees: () => new Promise((resolve) => (finish = () => resolve(new Response(JSON.stringify({ success: true, data: ASSIGNEES, error: null }), { status: 200 })))) })
    renderPage()
    await settle()

    choose(1, 'REPLACE')
    expect(select().disabled).toBe(true)
    expect(saveButton().disabled).toBe(true)

    await act(async () => finish())
    await settle()
    expect(select().value).toBe('2')
    expect(saveButton().disabled).toBe(false)
  })

  it('후보(36) 조회 실패: 저장 막힘·입력 유지, 다시 불러오기는 사람이 누를 때만 (POL-125)', async () => {
    let count = 0
    serve({
      assignees: () => {
        count += 1
        return count === 1 ? fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')() : ok(ASSIGNEES)()
      },
    })
    renderPage()
    await settle()

    type('visit-mileage', '55000')
    choose(1, 'REPLACE')
    type('record-memo-1', '엔진오일 교체')
    expect(document.body.textContent).toContain('담당 정비사 목록을 불러오지 못했습니다.')
    expect(select()).toBeNull()
    expect(saveButton().disabled).toBe(true)
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(count).toBe(1)

    click(button('다시 불러오기'))
    await settle()
    expect(count).toBe(2)
    expect(select().value).toBe('2')
    // 입력값 그대로
    expect(input('visit-mileage').value).toBe('55000')
    expect(input('record-memo-1').value).toBe('엔진오일 교체')
    expect(saveButton().disabled).toBe(false)
  })

  it('X13 400(mechanicId)은 담당 칸 옆에, 입력값 유지·이동 없음, 다시 고르면 칸 오류가 사라진다', async () => {
    serve({ save: fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'mechanicId', reason: '담당 정비사를 확인해 주세요.' }]) })
    renderPage()
    await settle()

    type('visit-mileage', '55000')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()

    expect(fieldMessage('visit-mechanic')).toContain('담당 정비사를 확인해 주세요.')
    expect(select().getAttribute('aria-invalid')).toBe('true')
    expect(document.querySelector('.error-notice--error').textContent).toContain('입력값을 확인해 주세요.')
    expect(document.querySelector('.error-notice--error').textContent).not.toContain('담당 정비사를 확인해 주세요.') // 위쪽에 겹쳐 보이지 않음
    expect(input('visit-mileage').value).toBe('55000')
    expect(location.pathname).toBe('/visits/new')
    expect(posts()).toHaveLength(1)

    pick(1)
    expect(fieldMessage('visit-mechanic')).toBeNull()
  })

  it('400에 담당과 다른 칸이 함께 오면 각 칸에 나눠 보인다', async () => {
    serve({
      save: fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [
        { field: 'mileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' },
        { field: 'mechanicId', reason: '담당 정비사를 확인해 주세요.' },
      ]),
    })
    renderPage()
    await settle()

    type('visit-mileage', '2000001')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(fieldMessage('visit-mileage')).toContain('0 이상 2,000,000 이하로 입력해 주세요.')
    expect(fieldMessage('visit-mechanic')).toContain('담당 정비사를 확인해 주세요.')
  })

  it('로그인 계정(03)을 읽지 못하면 비워 두고, 고르지 않고 저장하면 보내지 않고 칸 오류', async () => {
    serve({ me: fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.') })
    renderPage()
    await settle()

    expect(select().value).toBe('')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(fieldMessage('visit-mechanic')).toContain('담당 정비사를 골라 주세요.')

    pick(2)
    click(saveButton())
    await settle()
    expect(postBody().mechanicId).toBe(2)
  })

  it('경계: 후보가 빈 배열이면 고를 수 없고 저장하지 않는다', async () => {
    serve({ assignees: ok({ items: [] }) })
    renderPage()
    await settle()

    expect(optionLabels()).toEqual([])
    expect(select().value).toBe('')
    choose(1, 'REPLACE')
    click(saveButton())
    await settle()
    expect(posts()).toHaveLength(0)
    expect(fieldMessage('visit-mechanic')).toContain('담당 정비사를 골라 주세요.')
  })
})
