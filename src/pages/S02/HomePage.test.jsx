// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, keyDown, render } from '@/shared/lib/domTest'
import HomePage from './HomePage.jsx'

// S-02 예약 상세 패널 (09 S-02, 08 17·18, chagok-frontend#26 테스트):
// 줄 → ?reservation= 패널 열기·닫기, 전체 연락처·점검 주기 순서·강조, 최근 방문·이력 없음 문구, 상세 이동(총 방문 3회 이상만),
// 방문 완료 성공 → S-08 이동, 409 → 패널 다시 조회·이동 안 함·자동 재전송 없음, 500 → 안내만, 404·잘못된 id → 찾을 수 없음

let fetchMock
let location
let handlers

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors: [], details: null } })

/** 08 17 JSON 예시 그대로 (itemStatuses 2개) */
function panelExample(overrides = {}) {
  return {
    reservation: {
      reservationId: 4,
      reservedAt: '2026-11-23T15:00:00',
      status: 'RESERVED',
      needsAction: true,
      version: 0,
      purpose: { items: [{ itemId: 6, name: '배터리' }], other: false, memo: null },
      ...overrides.reservation,
    },
    customer: { customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: true },
    vehicle: { vehicleId: 10, plateNumber: '55차0010', model: '쏘나타', modelYear: 2018, latestMileage: 97000 },
    recentVisits: [
      {
        visitKey: '5eed0000-0000-4000-8000-000000000015',
        visitDate: '2026-10-24',
        mileage: null,
        staffName: '김정비',
        records: [{ recordId: 16, itemId: 1, itemName: '엔진오일', type: 'REPLACE', date: '2026-10-24', memo: null }],
      },
      {
        visitKey: '5eed0000-0000-4000-8000-000000000014',
        visitDate: '2026-08-24',
        mileage: null,
        staffName: '김정비',
        records: [
          { recordId: 14, itemId: 2, itemName: '에어클리너', type: 'REPLACE', date: '2026-08-24', memo: null },
          { recordId: 15, itemId: 3, itemName: '에어컨필터', type: 'REPLACE', date: '2026-08-24', memo: null },
        ],
      },
    ],
    totalVisitCount: 3,
    itemStatuses: [
      {
        itemId: 1, code: 'ENGINE_OIL', name: '엔진오일', status: 'AHEAD', dueReason: null,
        baseRecord: { date: '2026-10-24', mileage: null, type: 'REPLACE' },
        nextDueDate: '2027-04-24', nextDueMileage: null, highlighted: false,
      },
      {
        itemId: 6, code: 'BATTERY', name: '배터리', status: 'SOON', dueReason: null,
        baseRecord: { date: '2023-12-14', mileage: null, type: 'REPLACE' },
        nextDueDate: '2026-12-14', nextDueMileage: null, highlighted: true,
      },
    ],
    ...overrides.rest,
  }
}

/** 08 15 한 줄 (오세훈 예약) */
const LIST_ITEM = {
  reservationId: 4, reservedAt: '2026-11-23T15:00:00', status: 'RESERVED', needsAction: true, version: 0,
  vehicleId: 10, plateNumber: '55차0010', customerId: 10, customerName: '오세훈', phone: '010-0000-0010', purposeSummary: '배터리',
}

beforeEach(() => {
  handlers = {
    list: () => ok({ from: 'x', to: 'x', items: [LIST_ITEM] }),
    panel: () => ok(panelExample()),
    complete: () => ok({ reservationId: 4, status: 'COMPLETED', vehicleId: 10, version: 1 }),
  }
  fetchMock = vi.fn((url, init) => {
    if (url.startsWith('/api/reservations?')) return Promise.resolve(handlers.list())
    if (url === '/api/reservations/4/panel') return Promise.resolve(handlers.panel())
    if (url === '/api/reservations/4/complete' && init.method === 'POST') return Promise.resolve(handlers.complete(init))
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

function renderHome(entry = '/') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/visits/new" element={<p>S-08</p>} />
        <Route path="/vehicles/:vehicleId" element={<p>S-07</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const panel = () => document.querySelector('.rsv-panel')
const button = (text, root = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const calls = (match) => fetchMock.mock.calls.filter(([url, init]) => match(url, init))
const panelCalls = () => calls((url) => url === '/api/reservations/4/panel')
const completeCalls = () => calls((url) => url.endsWith('/complete'))
const listCalls = () => calls((url) => url.startsWith('/api/reservations?'))

describe('S-02 예약 상세 패널', () => {
  it('줄을 누르면 ?reservation=으로 패널을 열고 17을 부른다, 닫기는 쿼리를 지운다(뒤로 가기)', async () => {
    renderHome()
    await settle()
    expect(panel()).toBeNull()
    expect(panelCalls()).toHaveLength(0)

    const row = document.querySelector('.rsv-row')
    click(row)
    await settle()
    expect(location.search).toBe('?reservation=4')
    expect(panelCalls()).toHaveLength(1)
    expect(panel()).not.toBeNull()
    expect(row.getAttribute('aria-current')).toBe('true')

    click(document.querySelector('[aria-label="예약 상세 닫기"]'))
    await settle()
    expect(location.search).toBe('')
    expect(panel()).toBeNull()
  })

  it('목록에서 연 뒤 날짜를 바꾸고 닫으면 바꾼 날짜에 머문다(쿼리만 지움)', async () => {
    renderHome('/?date=2030-03-10')
    await settle()
    click(document.querySelector('.rsv-row'))
    await settle()
    expect(location.search).toBe('?date=2030-03-10&reservation=4')

    click(document.querySelector('[aria-label="다음 날짜"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-11&reservation=4')
    expect(panel()).not.toBeNull() // 날짜를 바꿔도 패널은 그대로

    click(document.querySelector('[aria-label="예약 상세 닫기"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-11')
    expect(panel()).toBeNull()
  })

  it('주소로 바로 열면 닫기·Esc는 쿼리만 지운다(날짜는 그대로)', async () => {
    renderHome('/?date=2026-11-30&reservation=4')
    await settle()
    expect(panel()).not.toBeNull()
    keyDown('Escape') // 열 때 제목에 초점이 있다
    await settle()
    expect(location.pathname).toBe('/')
    expect(location.search).toBe('?date=2026-11-30')
  })

  it('예약·고객(전체 연락처)·차량, 점검 주기는 받은 순서 그대로 목적 항목만 강조', async () => {
    renderHome('/?reservation=4')
    await settle()
    const text = panel().textContent
    expect(text).toContain('11월 23일 (월) 15:00')
    expect(text).toContain('처리 필요')
    expect(text).toContain('010-0000-0010')
    expect(text).toContain('55차0010')
    expect(text).toContain('2018년식')
    expect(text).toContain('97,000 km')

    const rows = Array.from(panel().querySelectorAll('.item-status-list__row'))
    expect(rows.map((r) => r.querySelector('.item-status-list__name').firstChild.textContent)).toEqual(['엔진오일', '배터리'])
    expect(rows[0].classList.contains('is-highlighted')).toBe(false)
    expect(rows[1].classList.contains('is-highlighted')).toBe(true)
    expect(rows[1].textContent).toContain('예약 목적')
    expect(rows[1].textContent).toContain('임박') // 서버 상태 그대로
  })

  it('최근 방문 2회를 보이고, 총 방문 3회면 상세 이동 활성 → S-07', async () => {
    renderHome('/?reservation=4')
    await settle()
    const visits = panel().querySelectorAll('.rsv-visits__visit')
    expect(visits).toHaveLength(2)
    expect(visits[0].textContent).toContain('2026.10.24')
    expect(visits[1].textContent).toContain('에어클리너')

    const detail = button('상세 이동', panel())
    expect(detail.disabled).toBe(false)
    click(detail)
    await settle()
    expect(location.pathname).toBe('/vehicles/10')
  })

  it('총 방문 2회면 상세 이동은 보이지만 비활성, 이력이 없으면 09 5장 문구', async () => {
    handlers.panel = () => ok(panelExample({ rest: { recentVisits: [], totalVisitCount: 2 } }))
    renderHome('/?reservation=4')
    await settle()
    const detail = button('상세 이동', panel())
    expect(detail).toBeDefined()
    expect(detail.disabled).toBe(true)
    expect(panel().textContent).toContain('최근 정비 이력이 없습니다.')
    expect(panel().querySelectorAll('.rsv-visits__visit')).toHaveLength(0)
  })

  it('방문 완료: 읽은 version을 보내고 성공하면 S-08(/visits/new?vehicleId=&reservationId=)로', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { version: 2 } }))
    renderHome('/?reservation=4')
    await settle()
    click(button('방문 완료', panel()))
    await settle()

    expect(completeCalls()).toHaveLength(1)
    expect(JSON.parse(completeCalls()[0][1].body)).toEqual({ version: 2 })
    expect(location.pathname).toBe('/visits/new')
    expect(location.search).toBe('?vehicleId=10&reservationId=4')
  })

  it('409 CONCURRENT_MODIFICATION: 패널을 다시 불러 최신 상태를 보이고, S-08로 가지 않으며 다시 보내지 않는다', async () => {
    let panelVersion = 0
    handlers.panel = () => ok(panelExample({ reservation: { version: panelVersion } }))
    handlers.complete = () => {
      panelVersion = 1 // 다른 직원이 먼저 바꿈
      return fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')
    }
    renderHome('/?reservation=4')
    await settle()
    const listBefore = listCalls().length
    click(button('방문 완료', panel()))
    await settle()
    await settle()

    expect(completeCalls()).toHaveLength(1) // 자동 재전송 없음
    expect(panelCalls()).toHaveLength(2) // 17 다시 조회
    expect(listCalls().length).toBe(listBefore + 1) // 목록도 최신으로
    expect(location.pathname).toBe('/')
    expect(location.search).toBe('?reservation=4')
    const notice = panel().querySelector('.error-notice--warn')
    expect(notice.textContent).toContain('다른 직원이 먼저 수정했습니다.')
    expect(notice.textContent).toContain('최신 내용을 다시 불러와 주세요.') // 서버 message 그대로(문구를 새로 만들지 않음)

    // 사람이 다시 누르면 새로 읽은 version으로 한 번 더 보낸다
    handlers.complete = () => ok({ reservationId: 4, status: 'COMPLETED', vehicleId: 10, version: 2 })
    click(button('방문 완료', panel()))
    await settle()
    expect(completeCalls()).toHaveLength(2)
    expect(JSON.parse(completeCalls()[1][1].body)).toEqual({ version: 1 })
    expect(location.pathname).toBe('/visits/new')
  })

  it('409 INVALID_STATUS_TRANSITION: 다시 불러온 상태(방문 완료)를 보이고 방문 완료 버튼은 없어진다', async () => {
    let status = 'RESERVED'
    handlers.panel = () => ok(panelExample({ reservation: { status, needsAction: false } }))
    handlers.complete = () => {
      status = 'COMPLETED' // 다른 직원이 이미 끝냄
      return fail(409, 'INVALID_STATUS_TRANSITION', '지금 상태에서는 할 수 없는 변경입니다.')
    }
    renderHome('/?reservation=4')
    await settle()
    click(button('방문 완료', panel()))
    await settle()
    await settle()

    expect(panelCalls()).toHaveLength(2)
    expect(location.pathname).toBe('/')
    expect(panel().querySelector('.rsv-status').textContent).toBe('방문 완료')
    expect(button('방문 완료', panel())).toBeUndefined()
    expect(panel().querySelector('.error-notice--warn')).not.toBeNull()
  })

  it('500: 오류 안내만 보이고 이동·재조회·재전송 없음, 다시 불러오기는 사람이 누를 때만', async () => {
    handlers.complete = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderHome('/?reservation=4')
    await settle()
    click(button('방문 완료', panel()))
    await settle()
    await settle()

    expect(completeCalls()).toHaveLength(1)
    expect(panelCalls()).toHaveLength(1)
    expect(location.pathname).toBe('/')
    const notice = panel().querySelector('.error-notice--error')
    expect(notice.textContent).toContain('일시적인 오류가 발생했습니다.')
    expect(button('방문 완료', panel()).disabled).toBe(false)

    click(button('다시 불러오기', notice))
    await settle()
    expect(panelCalls()).toHaveLength(2)
    expect(completeCalls()).toHaveLength(1)
    expect(panel().querySelector('.error-notice')).toBeNull()
  })

  it('방문 완료가 아닌 끝난 예약(완료·취소)은 방문 완료 버튼이 없다', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { status: 'CANCELED', needsAction: false } }))
    renderHome('/?reservation=4')
    await settle()
    expect(panel().querySelector('.rsv-status').textContent).toBe('취소')
    expect(button('방문 완료', panel())).toBeUndefined()
  })

  it('404(없는 예약·다른 정비소 예약 X3)는 패널에 "찾을 수 없습니다."', async () => {
    handlers.panel = () => fail(404, 'NOT_FOUND', '찾을 수 없습니다.')
    renderHome('/?reservation=4')
    await settle()
    expect(panel().textContent).toContain('찾을 수 없습니다.')
    expect(button('방문 완료', panel())).toBeUndefined()
  })

  it('조회 실패는 "불러오지 못했습니다." + 사람이 누르는 다시 불러오기', async () => {
    handlers.panel = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderHome('/?reservation=4')
    await settle()
    expect(panel().textContent).toContain('불러오지 못했습니다.')
    expect(panelCalls()).toHaveLength(1) // 자동으로 다시 부르지 않음

    handlers.panel = () => ok(panelExample())
    click(button('다시 불러오기', panel()))
    await settle()
    expect(panelCalls()).toHaveLength(2)
    expect(panel().textContent).toContain('55차0010')
  })

  it('잘못된 ?reservation= 값은 요청하지 않고 찾을 수 없음', async () => {
    renderHome('/?reservation=abc')
    await settle()
    expect(calls((url) => url.includes('/panel'))).toHaveLength(0)
    expect(panel().textContent).toContain('찾을 수 없습니다.')
  })
})
