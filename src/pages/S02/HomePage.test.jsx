// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, keyDown, render } from '@/shared/lib/domTest'
import { shiftMonth, todaySeoul } from '@/features/reservation/dates'
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
/** 08 42 응답: data = { from, to, items } (from·to는 요청 그대로라 테스트에서는 보지 않음) */
const summaryOk = (items) => ok({ from: 'x', to: 'x', items })
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
    summary: () => summaryOk([]),
    panel: () => ok(panelExample()),
    complete: () => ok({ reservationId: 4, status: 'COMPLETED', vehicleId: 10, version: 1 }),
    cancel: () => ok({ reservationId: 4, status: 'CANCELED', vehicleId: 10, version: 1 }),
    noShow: () => ok({ reservationId: 4, status: 'NO_SHOW', vehicleId: 10, version: 1 }),
  }
  fetchMock = vi.fn((url, init) => {
    if (url.startsWith('/api/reservations?')) return Promise.resolve(handlers.list())
    if (url.startsWith('/api/reservations/summary?')) return Promise.resolve(handlers.summary())
    if (url === '/api/reservations/4/panel') return Promise.resolve(handlers.panel())
    if (url === '/api/reservations/4/complete' && init.method === 'POST') return Promise.resolve(handlers.complete(init))
    if (url === '/api/reservations/4/cancel' && init.method === 'POST') return Promise.resolve(handlers.cancel(init))
    if (url === '/api/reservations/4/no-show' && init.method === 'POST') return Promise.resolve(handlers.noShow(init))
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
const summaryCalls = () => calls((url) => url.startsWith('/api/reservations/summary?'))
const cell = (date) => document.querySelector(`.mcal-day[data-date="${date}"]`)
const cancelCalls = () => calls((url) => url.endsWith('/cancel'))
const noShowCalls = () => calls((url) => url.endsWith('/no-show'))
const dialog = () => document.querySelector('.modal')

describe('S-02 예약 상세 패널', () => {
  it('줄을 누르면 ?reservation=으로 패널을 열고 17을 부른다, 닫기는 쿼리를 지운다(뒤로 가기)', async () => {
    renderHome('/?view=month') // 줄(날짜 목록)은 월 보기에만 있다 (#36)
    await settle()
    expect(panel()).toBeNull()
    expect(panelCalls()).toHaveLength(0)

    const row = document.querySelector('.rsv-row')
    click(row)
    await settle()
    expect(location.search).toBe('?view=month&reservation=4')
    expect(panelCalls()).toHaveLength(1)
    expect(panel()).not.toBeNull()
    expect(row.getAttribute('aria-current')).toBe('true')

    click(document.querySelector('[aria-label="예약 상세 닫기"]'))
    await settle()
    expect(location.search).toBe('?view=month')
    expect(panel()).toBeNull()
  })

  it('목록에서 연 뒤 날짜를 바꾸고 닫으면 바꾼 날짜에 머문다(쿼리만 지움)', async () => {
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    click(document.querySelector('.rsv-row'))
    await settle()
    expect(location.search).toBe('?date=2030-03-10&view=month&reservation=4')

    click(document.querySelector('[aria-label="다음 날짜"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-11&view=month&reservation=4')
    expect(panel()).not.toBeNull() // 날짜를 바꿔도 패널은 그대로

    click(document.querySelector('[aria-label="예약 상세 닫기"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-11&view=month')
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

  it('P0-나머지 꼬리표 (#29): 점검 주기 요약에 "지난 방문 거절"·"지난 점검 주의(메모)", 목적 항목은 "예약 목적 · …"로 잇고 상태는 그대로', async () => {
    const base = panelExample()
    handlers.panel = () =>
      ok({
        ...base,
        itemStatuses: [
          { ...base.itemStatuses[0], lastDecline: { date: '2026-10-24', memo: null }, lastCaution: null },
          { ...base.itemStatuses[1], lastDecline: null, lastCaution: { date: '2026-09-24', memo: '단자 부식' } },
        ],
      })
    renderHome('/?reservation=4')
    await settle()
    const rows = Array.from(panel().querySelectorAll('.item-status-list__row'))
    expect(rows.map((r) => r.querySelector('.item-status-list__tag')?.textContent)).toEqual([
      '지난 방문 거절(2026.10.24)',
      '예약 목적 · 지난 점검 주의(2026.09.24, 단자 부식)',
    ])
    expect(rows[0].textContent).toContain('여유')
    expect(rows[1].textContent).toContain('임박')
  })

  it('최근 이력 (#29): 점검 결과는 값이 있을 때만, 외부(source CUSTOMER_STATEMENT)는 "고객 진술", source가 없으면 type EXTERNAL로', async () => {
    const base = panelExample()
    handlers.panel = () =>
      ok({
        ...base,
        recentVisits: [
          {
            ...base.recentVisits[0],
            records: [
              { recordId: 16, itemId: 5, itemName: '타이어 상태 점검', type: 'INSPECT', date: '2026-10-24', memo: '앞 타이어 마모', source: 'SHOP', inspectResult: 'CAUTION' },
              { recordId: 17, itemId: 3, itemName: '에어컨필터', type: 'EXTERNAL', date: '2026-10-01', memo: null, source: 'CUSTOMER_STATEMENT', inspectResult: null },
            ],
          },
          { ...base.recentVisits[1] }, // P0-핵심 모양(source·inspectResult 없음)
        ],
      })
    renderHome('/?reservation=4')
    await settle()
    const lines = Array.from(panel().querySelectorAll('.rsv-visits__records li'))
    expect(lines[0].querySelector('.rsv-visits__result').textContent).toBe('주의')
    expect(lines[0].querySelector('.rsv-visits__source')).toBeNull()
    expect(lines[1].querySelector('.rsv-visits__source').textContent).toBe('고객 진술')
    expect(lines[1].querySelector('.rsv-visits__result')).toBeNull()
    expect(lines[2].querySelector('.rsv-visits__result')).toBeNull()
    expect(lines[2].querySelector('.rsv-visits__source')).toBeNull()
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
    renderHome('/?view=month&reservation=4')
    await settle()
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('방문 완료', panel()))
    await settle()
    await settle()

    expect(completeCalls()).toHaveLength(1) // 자동 재전송 없음
    expect(panelCalls()).toHaveLength(2) // 17 다시 조회
    expect(listCalls().length).toBe(listBefore + 1) // 목록도 최신으로
    expect(summaryCalls().length).toBe(summaryBefore + 1) // 캘린더 건수(42)도 다시 부른다(#30)
    expect(location.pathname).toBe('/')
    expect(location.search).toBe('?view=month&reservation=4')
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
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('방문 완료', panel()))
    await settle()
    await settle()

    expect(completeCalls()).toHaveLength(1)
    expect(panelCalls()).toHaveLength(1)
    expect(listCalls().length).toBe(listBefore) // 목록·캘린더 건수도 다시 부르지 않는다
    expect(summaryCalls().length).toBe(summaryBefore)
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

// M-02 연결 (chagok-frontend#25): 머리 [+ 예약 등록], 패널 [변경] → 변경 모드(읽은 version + 바뀐 칸) → 패널·목록 다시 조회
describe('S-02 예약 등록·변경 (M-02)', () => {
  const tomorrow = () => {
    const d = new Date(Date.now() + 9 * 3600 * 1000 + 24 * 3600 * 1000)
    return d.toISOString().slice(0, 10)
  }
  const patchCalls = () => calls((url, init) => url === '/api/reservations/4' && init?.method === 'PATCH')

  it('[+ 예약 등록]은 M-02를 연다 (담당 기본값 = 로그인 계정, #37)', async () => {
    renderHome('/')
    await settle()
    click(button('+ 예약 등록'))
    await settle()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('예약 등록')
    expect(dialog.querySelector('select[id$="-assignee"]').value).toBe('2')
  })

  it('패널 [변경] → 지금 담당(17 assignee)으로 열고, 재배정은 { version, assigneeId }. 409 담당 중복이면 [겹친 예약 보기]로 그 예약 패널 (#37)', async () => {
    const day = tomorrow()
    handlers.panel = () => ok(panelExample({
      reservation: { reservedAt: `${day}T15:00:00`, needsAction: false, version: 2, assignee: { staffId: 2, name: '김정비', colorIndex: 1 } },
    }))
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) =>
      url === '/api/reservations/4' && init?.method === 'PATCH'
        ? Promise.resolve(jsonResponse(409, {
          success: false, data: null,
          error: { code: 'MECHANIC_SLOT_CONFLICT', message: '이 정비사는 해당 시각에 이미 예약이 있습니다. 다른 시각이나 다른 담당을 선택해 주세요.', fieldErrors: [], details: { reservationId: 7 } },
        }))
        : base(url, init))

    renderHome(`/?date=${day}&reservation=4`)
    await settle()
    click(button('변경', panel()))
    await settle()
    const dialog = document.querySelector('[role="dialog"]')
    const select = dialog.querySelector('select[id$="-assignee"]')
    expect(select.value).toBe('2')
    act(() => {
      select.value = '1'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    click(button('저장', dialog))
    await settle()
    expect(JSON.parse(patchCalls()[0][1].body)).toEqual({ version: 2, assigneeId: 1 })
    click(button('겹친 예약 보기', dialog))
    await settle()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(new URLSearchParams(location.search).get('reservation')).toBe('7')
  })

  it('패널 [변경] → 차량 고정 변경 모드, 시각만 바꾸면 version + reservedAt만 PATCH, 저장 뒤 패널 다시 조회', async () => {
    const day = tomorrow()
    handlers.panel = () => ok(panelExample({ reservation: { reservedAt: `${day}T15:00:00`, needsAction: false, version: 2 } }))
    handlers.patch = () => ok({ reservationId: 4, status: 'RESERVED', reservedAt: `${day}T16:00:00`, vehicleId: 10, version: 3 })
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) =>
      url === '/api/reservations/4' && init?.method === 'PATCH' ? Promise.resolve(handlers.patch()) : base(url, init))

    renderHome(`/?date=${day}&view=month&reservation=4`)
    await settle()
    click(button('변경', panel()))
    await settle()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('예약 변경')
    expect(dialog.textContent).toContain('55차0010')
    expect(button('저장', dialog).disabled).toBe(true)

    const before = panelCalls().length
    const summaryBefore = summaryCalls().length
    click(button('16:00', dialog))
    click(button('저장', dialog))
    await settle()

    expect(patchCalls()).toHaveLength(1)
    expect(JSON.parse(patchCalls()[0][1].body)).toEqual({ version: 2, reservedAt: `${day}T16:00:00` })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(panelCalls().length).toBeGreaterThan(before)
    expect(summaryCalls().length).toBeGreaterThan(summaryBefore) // 같은 날 저장이어도 캘린더 건수를 다시 부른다(#30)
  })

  it('같은 달의 다른 날로 저장되면 그 날짜로 옮기고, 조회 기간이 같아도 42를 다시 부른다 (#30)', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { reservedAt: '2030-03-10T15:00:00', needsAction: false, version: 2 } }))
    handlers.patch = () => ok({ reservationId: 4, status: 'RESERVED', reservedAt: '2030-03-20T16:00:00', vehicleId: 10, version: 3 })
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) =>
      url === '/api/reservations/4' && init?.method === 'PATCH' ? Promise.resolve(handlers.patch()) : base(url, init))

    renderHome('/?date=2030-03-10&view=month&reservation=4')
    await settle()
    click(button('변경', panel()))
    await settle()
    const dialog = document.querySelector('[role="dialog"]')
    const before = summaryCalls().length
    click(button('16:00', dialog))
    click(button('저장', dialog))
    await settle()

    expect(patchCalls()).toHaveLength(1)
    expect(new URLSearchParams(location.search).get('date')).toBe('2030-03-20')
    expect(summaryCalls().length).toBeGreaterThan(before)
    expect(summaryCalls().at(-1)[0]).toBe('/api/reservations/summary?from=2030-02-24&to=2030-04-06')
  })

  it('진행중·끝난 예약은 [변경]이 없다 (08 19)', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { status: 'COMPLETED', needsAction: false } }))
    renderHome('/?reservation=4')
    await settle()
    expect(button('변경', panel())).toBeUndefined()
  })
})

// 취소·노쇼 (chagok-frontend#31, 08 20·21, 09 S-02 5번): 확인 대화상자 → 읽은 version 전송 → 성공·409 모두 패널·목록 다시 조회
describe('S-02 예약 취소·노쇼', () => {
  it('[취소] → 확인 대화상자(대상·문구, 처음 초점은 돌아가기) → 확인하면 version을 한 번 보내고 패널·목록을 다시 부른다', async () => {
    let status = 'RESERVED'
    handlers.panel = () => ok(panelExample({ reservation: { status, version: status === 'RESERVED' ? 3 : 4, needsAction: false } }))
    handlers.cancel = () => {
      status = 'CANCELED'
      return ok({ reservationId: 4, status: 'CANCELED', vehicleId: 10, version: 4 })
    }
    renderHome('/?view=month&reservation=4')
    await settle()
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('취소', panel()))
    await settle()

    expect(cancelCalls()).toHaveLength(0) // 확인 전에는 보내지 않는다
    expect(dialog().textContent).toContain('예약을 취소할까요?')
    expect(dialog().textContent).toContain('55차0010 · 오세훈')
    expect(dialog().textContent).toContain('11월 23일 (월) 15:00')
    expect(dialog().textContent).toContain('취소한 예약은 정정으로만 되돌릴 수 있습니다.')
    expect(document.activeElement.textContent).toBe('돌아가기')

    click(button('예약 취소', dialog()))
    await settle()
    await settle()

    expect(cancelCalls()).toHaveLength(1)
    expect(JSON.parse(cancelCalls()[0][1].body)).toEqual({ version: 3 })
    expect(dialog()).toBeNull()
    expect(panelCalls()).toHaveLength(2)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(summaryCalls().length).toBe(summaryBefore + 1) // 취소는 칸 총 건수에서 빠지므로 42를 다시 부른다(#30)
    expect(panel().querySelector('.rsv-status').textContent).toBe('취소')
    expect(panel().querySelector('.error-notice--info').textContent).toContain('예약을 취소했습니다.')
    expect(button('취소', panel())).toBeUndefined() // 끝난 예약은 버튼 없음
  })

  it('[돌아가기]는 보내지 않고 닫는다', async () => {
    renderHome('/?reservation=4')
    await settle()
    click(button('취소', panel()))
    await settle()
    click(button('돌아가기', dialog()))
    await settle()
    expect(dialog()).toBeNull()
    expect(cancelCalls()).toHaveLength(0)
    expect(panel()).not.toBeNull() // 패널은 그대로
  })

  it('[노쇼] → 확인하면 21을 보낸다', async () => {
    renderHome('/?reservation=4')
    await settle()
    click(button('노쇼', panel()))
    await settle()
    expect(dialog().textContent).toContain('노쇼로 처리할까요?')
    click(button('노쇼 처리', dialog()))
    await settle()
    expect(noShowCalls()).toHaveLength(1)
    expect(JSON.parse(noShowCalls()[0][1].body)).toEqual({ version: 0 })
  })

  it('409 INVALID_STATUS_TRANSITION: 패널·목록을 다시 불러 최신 상태를 보이고 다시 보내지 않는다', async () => {
    let status = 'RESERVED'
    handlers.panel = () => ok(panelExample({ reservation: { status, needsAction: status === 'RESERVED' } }))
    handlers.noShow = () => {
      status = 'COMPLETED' // 다른 직원이 이미 방문 완료
      return fail(409, 'INVALID_STATUS_TRANSITION', '지금 상태에서는 할 수 없는 변경입니다.')
    }
    renderHome('/?view=month&reservation=4')
    await settle()
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('노쇼', panel()))
    await settle()
    click(button('노쇼 처리', dialog()))
    await settle()
    await settle()

    expect(noShowCalls()).toHaveLength(1) // 자동 재전송 없음
    expect(panelCalls()).toHaveLength(2)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(summaryCalls().length).toBe(summaryBefore + 1) // 409 뒤에도 42를 다시 부른다(#30)
    expect(panel().querySelector('.rsv-status').textContent).toBe('방문 완료')
    expect(panel().querySelector('.error-notice--warn').textContent).toContain('지금 상태에서는 할 수 없는 변경입니다.')
    expect(button('노쇼', panel())).toBeUndefined()
  })

  it('500: 오류 안내만, 재조회·재전송 없음', async () => {
    handlers.cancel = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderHome('/?reservation=4')
    await settle()
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('취소', panel()))
    await settle()
    click(button('예약 취소', dialog()))
    await settle()
    await settle()
    expect(cancelCalls()).toHaveLength(1)
    expect(panelCalls()).toHaveLength(1)
    expect(listCalls().length).toBe(listBefore)
    expect(summaryCalls().length).toBe(summaryBefore)
    expect(panel().querySelector('.error-notice--error').textContent).toContain('일시적인 오류가 발생했습니다.')
  })

  it('노쇼는 시각이 지난 "예약"(needsAction)만, 취소는 "예약"·"진행중"', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { status: 'RESERVED', needsAction: false } }))
    renderHome('/?reservation=4')
    await settle()
    expect(button('취소', panel())).toBeDefined()
    expect(button('노쇼', panel())).toBeUndefined() // 시각 전

    cleanup()
    handlers.panel = () => ok(panelExample({ reservation: { status: 'IN_PROGRESS', needsAction: false } }))
    renderHome('/?reservation=4')
    await settle()
    expect(button('취소', panel())).toBeDefined()
    expect(button('노쇼', panel())).toBeUndefined() // 진행중은 노쇼 불가

    for (const status of ['COMPLETED', 'CANCELED', 'NO_SHOW']) {
      cleanup()
      handlers.panel = () => ok(panelExample({ reservation: { status, needsAction: false } }))
      renderHome('/?reservation=4')
      await settle()
      expect(button('취소', panel())).toBeUndefined()
      expect(button('노쇼', panel())).toBeUndefined()
    }
  })
})

// 요약 숫자 (chagok-frontend#28, 08 04): 서버 숫자 그대로, 다른 날짜에서만 "목록 →", 04 실패해도 목록·패널은 그대로
describe('S-02 요약 숫자', () => {
  const home = { date: '2026-11-23', todayReservationCount: 2, todayContactCount: 5, todayReservations: [] }
  const withHome = (respond) => {
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) => (url === '/api/home' ? Promise.resolve(respond()) : base(url, init)))
  }

  it('오늘 예약 2건·오늘 연락할 고객 5명 (07 7.5)', async () => {
    withHome(() => ok(home))
    renderHome('/')
    await settle()
    const cards = document.querySelector('.summary-cards').textContent
    expect(cards).toContain('2건')
    expect(cards).toContain('5명')
    expect(button('목록 →')).toBeUndefined() // 오늘을 보고 있으면 오늘로 갈 버튼이 없다
  })

  it('다른 날짜를 보고 있으면 "목록 →"으로 오늘로 돌아온다', async () => {
    withHome(() => ok(home))
    renderHome('/?date=2026-01-05')
    await settle()
    click(button('목록 →'))
    await settle()
    expect(location.search).toBe('')
  })

  it('04가 실패해도 목록은 그대로 보이고, 요약만 안내 + 다시 시도', async () => {
    withHome(() => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.'))
    renderHome('/?view=month')
    await settle()
    expect(document.body.textContent).toContain('요약 숫자를 불러오지 못했습니다.')
    expect(document.querySelectorAll('.rsv-row').length).toBe(1)
  })
})

describe('S-02 월 캘린더 (F-RSV-05, #30) — ?view=month', () => {
  const day = (date, counts = {}) => ({ date, total: 0, reserved: 0, inProgress: 0, completed: 0, canceled: 0, noShow: 0, ...counts })

  it('그 달 42칸(일요일 시작)으로 42를 한 번 부르고, 칸의 숫자는 서버 값 그대로', async () => {
    handlers.summary = () => summaryOk([
      // total은 서버 값(취소 제외) — 화면이 상태별 숫자를 더해 6으로 만들지 않는다
      day('2030-03-10', { total: 3, reserved: 1, inProgress: 1, canceled: 2, noShow: 1 }),
      day('2030-03-11', { canceled: 1 }), // 취소만 있는 날: 총 건수 없이 취소 1
      day('2030-03-31', { total: 1, reserved: 1 }), // 월말 23:30 예약 → 서버가 준 날짜 칸
    ])
    renderHome('/?date=2030-03-10&view=month')
    await settle()

    expect(summaryCalls().map(([url]) => url)).toEqual(['/api/reservations/summary?from=2030-02-24&to=2030-04-06'])
    expect(document.querySelectorAll('.mcal-day')).toHaveLength(42)
    expect(document.querySelector('.mcal__title').textContent).toBe('2030년 3월')

    const busy = cell('2030-03-10')
    expect(busy.querySelector('.mcal-day__total').textContent).toBe('3건')
    expect(Array.from(busy.querySelectorAll('.mcal-count')).map((c) => c.textContent)).toEqual(['예약 1', '진행중 1', '취소 2', '노쇼 1'])
    expect(busy.getAttribute('aria-pressed')).toBe('true') // 고른 날짜
    expect(busy.getAttribute('aria-label')).toContain('3건, 예약 1, 진행중 1, 취소 2, 노쇼 1')

    expect(cell('2030-03-11').querySelector('.mcal-day__total')).toBeNull()
    expect(cell('2030-03-11').textContent).toContain('취소 1')
    expect(cell('2030-03-31').querySelector('.mcal-day__total').textContent).toBe('1건')
    expect(cell('2030-04-01').querySelector('.mcal-day__total')).toBeNull()
    expect(cell('2030-03-12').textContent).toBe('12') // 빈 날은 칸만 (문구 없음)
    expect(cell('2030-02-24').classList.contains('is-outside')).toBe(true)
  })

  it('날짜 칸을 누르면 ?date=가 바뀌어 그날 목록(15)을 부르고, 같은 달이면 42를 다시 부르지 않는다', async () => {
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    click(cell('2030-03-20'))
    await settle()
    expect(location.search).toBe('?date=2030-03-20&view=month')
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-20&to=2030-03-20')
    expect(summaryCalls()).toHaveLength(1)
    expect(cell('2030-03-20').getAttribute('aria-pressed')).toBe('true')

    // 목록 줄 → 예약 상세 패널 (P0-핵심 흐름 그대로)
    click(document.querySelector('.rsv-row'))
    await settle()
    expect(location.search).toBe('?date=2030-03-20&view=month&reservation=4')
    expect(panel()).not.toBeNull()
  })

  it('다음 달 → 그 달 1일, 이전 달·오늘로', async () => {
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    click(document.querySelector('[aria-label="다음 달"]'))
    await settle()
    expect(location.search).toBe('?date=2030-04-01&view=month')
    expect(summaryCalls().at(-1)[0]).toBe('/api/reservations/summary?from=2030-03-31&to=2030-05-11')

    click(document.querySelector('[aria-label="이전 달"]'))
    click(document.querySelector('[aria-label="이전 달"]'))
    await settle()
    expect(location.search).toBe('?date=2030-02-01&view=month')

    click(document.querySelector('.mcal__today'))
    await settle()
    expect(location.search).toBe('?view=month') // 오늘은 URL에서 뺀다
    expect(document.querySelector('.mcal-day.is-today').getAttribute('aria-pressed')).toBe('true')
  })

  it('42가 실패하면 안내 + 사람이 누르는 다시 시도, 목록은 그대로 (자동 재요청 없음)', async () => {
    handlers.summary = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    expect(document.body.textContent).toContain('예약 건수를 불러오지 못했습니다.')
    expect(document.querySelectorAll('.mcal-day')).toHaveLength(42)
    expect(document.querySelectorAll('.rsv-row')).toHaveLength(1)
    await settle()
    expect(summaryCalls()).toHaveLength(1)

    handlers.summary = () => summaryOk([day('2030-03-10', { total: 1, reserved: 1 })])
    click(button('다시 시도', document.querySelector('.mcal')))
    await settle()
    expect(summaryCalls()).toHaveLength(2)
    expect(cell('2030-03-10').querySelector('.mcal-day__total').textContent).toBe('1건')
    expect(document.body.textContent).not.toContain('예약 건수를 불러오지 못했습니다.')
  })

  it('목록 줄에 담당 이름+색 라벨, assignee가 없으면(P0-핵심 응답) 라벨 없음', async () => {
    handlers.list = () => ok({ from: 'x', to: 'x', items: [{ ...LIST_ITEM, assignee: { staffId: 2, name: '김정비', colorIndex: 1 } }] })
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    const label = document.querySelector('.rsv-row .assignee-label')
    expect(label.textContent).toBe('담당 김정비') // 화면 읽기용 "담당 " + 이름 (색만으로 구분하지 않음)
    expect(label.classList.contains('assignee-color--c1')).toBe(true)

    cleanup()
    handlers.list = () => ok({ from: 'x', to: 'x', items: [LIST_ITEM] })
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    expect(document.querySelector('.rsv-row .assignee-label')).toBeNull()
  })

  it('달을 빠르게 옮기면 늦게 온 이전 달 응답은 버린다', async () => {
    let resolveMarch
    handlers.summary = () => new Promise((resolve) => { resolveMarch = resolve })
    renderHome('/?date=2030-03-10&view=month')
    await settle()
    handlers.summary = () => summaryOk([day('2030-04-15', { total: 1, reserved: 1 })])
    click(document.querySelector('[aria-label="다음 달"]'))
    await settle()
    expect(cell('2030-04-15').querySelector('.mcal-day__total').textContent).toBe('1건')

    resolveMarch(summaryOk([day('2030-04-15', { total: 9, reserved: 9 })])) // 3월 달력 응답이 늦게 도착
    await settle()
    expect(cell('2030-04-15').querySelector('.mcal-day__total').textContent).toBe('1건')
  })

  it('오늘이 있는 달로 옮기면 1일이 아니라 오늘을 고른다 (URL에서 date가 빠짐)', async () => {
    const today = todaySeoul()
    renderHome('/?view=month')
    await settle()
    click(document.querySelector('[aria-label="이전 달"]'))
    await settle()
    expect(location.search).toBe(`?view=month&date=${shiftMonth(today, -1)}`)
    click(document.querySelector('[aria-label="다음 달"]'))
    await settle()
    expect(location.search).toBe('?view=month')
    expect(cell(today).getAttribute('aria-pressed')).toBe('true')
  })
})

// 주 캘린더 (chagok-frontend#36, 04 F-RSV-05 「주 보기」, 09 S-02, D-63 B08): 기본 보기, 월요일 시작, 08 15 주 기간,
// 30분 칸·08:00 전/20:00 이후 영역, 카드 → 상세 패널, 주 이동, 월↔주 전환, 로딩·오류·빈 주
describe('S-02 주 캘린더 (F-RSV-05, #36) — 기본 보기', () => {
  // 2030-03-13은 수요일 → 그 주는 3월 11일(월) ~ 17일(일)
  const week = (items) => () => ok({ from: '2030-03-11', to: '2030-03-17', items })
  const at = (id, reservedAt, extra = {}) => ({ ...LIST_ITEM, reservationId: id, reservedAt, needsAction: false, plateNumber: `12가000${id}`, customerName: `고객${id}`, ...extra })
  // 가로 타임라인(#83): 행 = 날짜, 열 = 시간(머리줄 글자가 열 이름)
  const dayRow = (date) => document.querySelector(`.wcal__day[data-date="${date}"]`).closest('tr')
  const columns = () => Array.from(document.querySelectorAll('.wcal__table thead th')).slice(1).map((th) => th.textContent)
  const cardsIn = (time, date) => Array.from(dayRow(date).querySelectorAll('td')[columns().indexOf(time)].querySelectorAll('.wcal-card'))
  const viewButton = (text) => button(text, document.querySelector('.home-view-switch'))

  it('?view= 없으면 주 보기: 그 주(월~일) 15를 한 번 부르고 42·날짜 목록은 부르지 않는다', async () => {
    renderHome('/?date=2030-03-13')
    await settle()
    expect(listCalls().map(([url]) => url)).toEqual(['/api/reservations?from=2030-03-11&to=2030-03-17'])
    expect(summaryCalls()).toHaveLength(0)
    expect(document.querySelector('.mcal')).toBeNull()
    expect(document.querySelector('.rsv-row')).toBeNull() // 주 보기에는 아래 날짜 목록이 없다
    expect(document.querySelector('.wcal__title').textContent).toBe('2030년 3월 11일 ~ 17일')
    expect(Array.from(document.querySelectorAll('.wcal__day')).map((th) => th.dataset.date))
      .toEqual(['2030-03-11', '2030-03-12', '2030-03-13', '2030-03-14', '2030-03-15', '2030-03-16', '2030-03-17'])
    expect(document.querySelector('.wcal__weekday').textContent).toBe('월')
    expect(viewButton('주').getAttribute('aria-pressed')).toBe('true')
    expect(viewButton('월').getAttribute('aria-pressed')).toBe('false')
  })

  it('카드는 30분 칸에(같은 칸 여러 건은 쌓음), 08:00 전은 맨 앞 열·20:00 이후는 맨 뒤 열, 담당 색 띠+이름', async () => {
    handlers.list = week([
      at(1, '2030-03-11T07:30:00', { assignee: { staffId: 1, name: '박사장', colorIndex: 0 } }),
      at(2, '2030-03-13T10:00:00', { assignee: { staffId: 1, name: '박사장', colorIndex: 0 } }),
      at(3, '2030-03-13T10:00:00', { assignee: { staffId: 2, name: '김정비', colorIndex: 1 }, status: 'CANCELED' }),
      at(4, '2030-03-15T19:30:00', { needsAction: true }),
      at(5, '2030-03-17T20:00:00'),
    ])
    renderHome('/?date=2030-03-13')
    await settle()

    const cols = columns()
    expect(cols[0]).toBe('08:00 전')
    expect(cols[1]).toBe('08:00')
    expect(cols.at(-2)).toBe('19:30')
    expect(cols.at(-1)).toBe('20:00 이후')
    expect(cols).toHaveLength(26) // 맨 앞 열 + 24칸 + 맨 뒤 열
    expect(document.querySelectorAll('.wcal__table tbody tr')).toHaveLength(7) // 날짜 7줄

    expect(cardsIn('08:00 전', '2030-03-11').map((c) => c.querySelector('.wcal-card__plate').textContent)).toEqual(['12가0001'])
    const busy = cardsIn('10:00', '2030-03-13')
    expect(busy.map((c) => c.querySelector('.wcal-card__time').textContent)).toEqual(['10:00', '10:00'])
    expect(busy[0].textContent).toContain('고객2')
    expect(busy[0].querySelector('.assignee-label').textContent).toBe('담당 박사장') // 색만으로 구분하지 않음
    expect(busy[0].classList.contains('assignee-color--c0')).toBe(true)
    expect(busy[1].classList.contains('assignee-color--c1')).toBe(true)
    expect(busy[0].querySelector('.rsv-status')).toBeNull() // "예약"은 배지 없이
    expect(busy[1].querySelector('.rsv-status').textContent).toBe('취소') // 서버 상태 그대로
    expect(cardsIn('19:30', '2030-03-15')[0].textContent).toContain('처리 필요')
    expect(cardsIn('19:30', '2030-03-15')[0].querySelector('.assignee-label')).toBeNull() // assignee 없음(P0-핵심 응답)
    expect(cardsIn('20:00 이후', '2030-03-17')).toHaveLength(1)
  })

  it('빈 주: 칸만 비워 두고(문구 없음) 맨 앞·맨 뒤 열도 없다', async () => {
    handlers.list = week([])
    renderHome('/?date=2030-03-13')
    await settle()
    expect(document.querySelectorAll('.wcal-card')).toHaveLength(0)
    expect(columns()).toHaveLength(24)
    expect(document.querySelectorAll('.wcal__table tbody tr')).toHaveLength(7)
    expect(document.querySelector('.wcal').textContent).not.toContain('없습니다')
  })

  it('카드를 누르면 ?reservation=으로 상세 패널(17)을 열고 그 카드를 표시한다', async () => {
    handlers.list = week([at(4, '2030-03-13T15:00:00')])
    renderHome('/?date=2030-03-13')
    await settle()
    click(document.querySelector('.wcal-card'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&reservation=4')
    expect(panelCalls()).toHaveLength(1)
    expect(panel()).not.toBeNull()
    expect(document.querySelector('.wcal-card').getAttribute('aria-current')).toBe('true')
  })

  it('다음 주 → 그 주 월요일, 이전 주, 오늘로 (오늘이 있는 주로 옮기면 오늘)', async () => {
    renderHome('/?date=2030-03-13')
    await settle()
    click(document.querySelector('[aria-label="다음 주"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-18')
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-18&to=2030-03-24')

    click(document.querySelector('[aria-label="이전 주"]'))
    click(document.querySelector('[aria-label="이전 주"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-04')
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-04&to=2030-03-10')

    click(document.querySelector('.wcal__today'))
    await settle()
    expect(location.search).toBe('') // 오늘은 URL에서 뺀다
    expect(document.querySelector('.wcal__day.is-today').dataset.date).toBe(todaySeoul())
    expect(document.querySelector('.wcal__today').disabled).toBe(true)
  })

  it('주 경계 월 넘김: 3월 31일(일)의 주는 3/25~3/31, 다음 주는 4/1~4/7', async () => {
    renderHome('/?date=2030-03-31')
    await settle()
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-25&to=2030-03-31')
    click(document.querySelector('[aria-label="다음 주"]'))
    await settle()
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-04-01&to=2030-04-07')
    expect(document.querySelector('.wcal__title').textContent).toBe('2030년 4월 1일 ~ 7일')
  })

  it('[월]·[주] 전환: 날짜·열린 패널은 그대로, 보이는 보기의 API만 부른다', async () => {
    renderHome('/?date=2030-03-13&reservation=4')
    await settle()
    expect(summaryCalls()).toHaveLength(0)

    click(viewButton('월'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&reservation=4&view=month')
    expect(summaryCalls()).toHaveLength(1)
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-13&to=2030-03-13') // 아래 날짜 목록
    expect(document.querySelector('.wcal')).toBeNull()
    expect(cell('2030-03-13').getAttribute('aria-pressed')).toBe('true')
    expect(panel()).not.toBeNull()

    const listBefore = listCalls().length
    click(viewButton('주'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&reservation=4')
    expect(listCalls().length).toBe(listBefore + 1)
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-11&to=2030-03-17')
    expect(summaryCalls()).toHaveLength(1) // 주 보기로 돌아와도 42를 다시 부르지 않는다
    expect(document.querySelector('.mcal')).toBeNull()
  })

  it('15가 실패하면 안내 + 사람이 누르는 다시 시도, 표는 그대로 (자동 재요청 없음)', async () => {
    handlers.list = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderHome('/?date=2030-03-13')
    await settle()
    await settle()
    expect(document.querySelector('.wcal').textContent).toContain('예약을 불러오지 못했습니다.')
    expect(columns()).toHaveLength(24)
    expect(document.querySelectorAll('.wcal__table tbody tr')).toHaveLength(7)
    expect(listCalls()).toHaveLength(1)

    handlers.list = week([at(4, '2030-03-13T15:00:00')])
    click(button('다시 시도', document.querySelector('.wcal')))
    await settle()
    expect(listCalls()).toHaveLength(2)
    expect(document.querySelectorAll('.wcal-card')).toHaveLength(1)
    expect(document.querySelector('.wcal').textContent).not.toContain('예약을 불러오지 못했습니다.')
  })

  it('불러오는 동안 안내 한 줄, 늦게 온 이전 주 응답은 버린다', async () => {
    let resolveFirst
    handlers.list = () => new Promise((resolve) => { resolveFirst = resolve })
    renderHome('/?date=2030-03-13')
    await settle()
    expect(document.querySelector('.wcal__status').textContent).toBe('예약을 불러오는 중…')
    expect(document.querySelector('.wcal__table').getAttribute('aria-busy')).toBe('true')

    handlers.list = () => ok({ from: '2030-03-18', to: '2030-03-24', items: [at(7, '2030-03-19T09:00:00')] })
    click(document.querySelector('[aria-label="다음 주"]'))
    await settle()
    expect(document.querySelector('.wcal__status')).toBeNull()
    resolveFirst(week([at(8, '2030-03-19T09:00:00')])()) // 앞 주 요청이 늦게 도착
    await settle()
    expect(Array.from(document.querySelectorAll('.wcal-card__plate')).map((b) => b.textContent)).toEqual(['12가0007'])
  })

  it('409(패널 방문 완료) 뒤에는 주 15를 다시 부르고 42는 부르지 않는다', async () => {
    handlers.complete = () => fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.')
    renderHome('/?date=2030-03-13&reservation=4')
    await settle()
    const listBefore = listCalls().length
    click(button('방문 완료', panel()))
    await settle()
    await settle()
    expect(completeCalls()).toHaveLength(1)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-11&to=2030-03-17')
    expect(summaryCalls()).toHaveLength(0)
  })

  it('[취소] 성공 뒤에도 주 15를 다시 불러 카드 상태를 바꾼다', async () => {
    let status = 'RESERVED'
    handlers.list = () => week([at(4, '2030-03-13T15:00:00', { status })])()
    handlers.panel = () => ok(panelExample({ reservation: { status, needsAction: false } }))
    handlers.cancel = () => {
      status = 'CANCELED'
      return ok({ reservationId: 4, status: 'CANCELED', vehicleId: 10, version: 1 })
    }
    renderHome('/?date=2030-03-13&reservation=4')
    await settle()
    const listBefore = listCalls().length
    click(button('취소', panel()))
    await settle()
    click(button('예약 취소', dialog()))
    await settle()
    await settle()
    expect(cancelCalls()).toHaveLength(1)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(document.querySelector('.wcal-card .rsv-status').textContent).toBe('취소')
    expect(summaryCalls()).toHaveLength(0)
  })

  it('같은 주의 다른 날로 변경 저장되면 그 날짜로 옮기고, 조회 기간이 같아도 주 15를 다시 부른다', async () => {
    handlers.panel = () => ok(panelExample({ reservation: { reservedAt: '2030-03-13T15:00:00', needsAction: false, version: 2 } }))
    const patch = () => ok({ reservationId: 4, status: 'RESERVED', reservedAt: '2030-03-15T16:00:00', vehicleId: 10, version: 3 })
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) =>
      url === '/api/reservations/4' && init?.method === 'PATCH' ? Promise.resolve(patch()) : base(url, init))

    renderHome('/?date=2030-03-13&reservation=4')
    await settle()
    click(button('변경', panel()))
    await settle()
    const modal = document.querySelector('[role="dialog"]')
    const before = listCalls().length
    click(button('16:00', modal))
    click(button('저장', modal))
    await settle()

    expect(new URLSearchParams(location.search).get('date')).toBe('2030-03-15')
    expect(listCalls().length).toBeGreaterThan(before)
    expect(listCalls().at(-1)[0]).toBe('/api/reservations?from=2030-03-11&to=2030-03-17')
    expect(summaryCalls()).toHaveLength(0)
  })

  it('카드로 패널을 연 뒤 [월]로 바꾸고 닫으면 월 보기에 머문다(뒤로 가기 아님, 쿼리만 지움)', async () => {
    handlers.list = week([at(4, '2030-03-13T15:00:00')])
    renderHome('/?date=2030-03-13')
    await settle()
    click(document.querySelector('.wcal-card'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&reservation=4')

    click(viewButton('월'))
    await settle()
    click(document.querySelector('[aria-label="예약 상세 닫기"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&view=month')
    expect(document.querySelector('.mcal')).not.toBeNull()
    expect(panel()).toBeNull()
  })

  it('?view=에 month가 아닌 값이 오면 주 보기', async () => {
    renderHome('/?date=2030-03-13&view=day')
    await settle()
    expect(document.querySelector('.wcal')).not.toBeNull()
    expect(summaryCalls()).toHaveLength(0)
  })
})

// "내 담당만" 토글 (04 F-RSV-05, 09 S-02 「보기 옵션」, chagok-docs#146 (c)안, chagok-frontend#36):
// 주 보기에서만 보이고 기본 전체. 켜면 ?mine=1 + 주 15에 03 staffId(테스트 계정 김정비 = 2)를 assigneeId로. 월 보기는 토글 없음·42·15 전체.
describe('S-02 "내 담당만" 토글 (F-RSV-05, #36) — 주 보기만', () => {
  const WEEK_ALL = '/api/reservations?from=2030-03-11&to=2030-03-17'
  const WEEK_MINE = `${WEEK_ALL}&assigneeId=2`
  const mineSwitch = () => document.querySelector('[role="switch"]')
  const listUrls = () => listCalls().map(([url]) => url)
  let meResponse

  beforeEach(() => {
    meResponse = () => Promise.resolve(ok({ staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' }))
    const base = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) => (url === '/api/me' ? meResponse() : base(url, init)))
  })

  it('기본은 꺼짐(전체): 스위치 이름 "내 담당만", 15에 assigneeId 없음', async () => {
    renderHome('/?date=2030-03-13')
    await settle()
    expect(mineSwitch().getAttribute('aria-checked')).toBe('false')
    expect(mineSwitch().disabled).toBe(false)
    expect(mineSwitch().closest('label').textContent.trim()).toBe('내 담당만')
    expect(listUrls()).toEqual([WEEK_ALL])
  })

  it('켜면 ?mine=1 + 15 assigneeId=03 staffId, 끄면 쿼리를 지우고 전체를 다시 부른다', async () => {
    renderHome('/?date=2030-03-13')
    await settle()
    click(mineSwitch())
    await settle()
    expect(location.search).toBe('?date=2030-03-13&mine=1')
    expect(mineSwitch().getAttribute('aria-checked')).toBe('true')
    expect(listUrls()).toEqual([WEEK_ALL, WEEK_MINE])

    click(mineSwitch())
    await settle()
    expect(location.search).toBe('?date=2030-03-13')
    expect(mineSwitch().getAttribute('aria-checked')).toBe('false')
    expect(listUrls()).toEqual([WEEK_ALL, WEEK_MINE, WEEK_ALL])
  })

  it('?mine=1로 들어오면 03을 받은 뒤 처음부터 내 담당만 부른다(전체를 먼저 부르지 않음), 받기 전엔 스위치 잠금', async () => {
    let resolveMe
    meResponse = () => new Promise((resolve) => { resolveMe = resolve })
    renderHome('/?date=2030-03-13&mine=1')
    await settle()
    expect(mineSwitch().disabled).toBe(true)
    expect(listUrls()).toEqual([])

    resolveMe(ok({ staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' }))
    await settle()
    await settle()
    expect(mineSwitch().disabled).toBe(false)
    expect(mineSwitch().getAttribute('aria-checked')).toBe('true')
    expect(listUrls()).toEqual([WEEK_MINE])
  })

  it('03이 실패하면 스위치를 끈 채 잠그고 전체를 보인다(자동 재요청 없음)', async () => {
    meResponse = () => Promise.resolve(fail(500, 'INTERNAL_ERROR', '서버 오류'))
    renderHome('/?date=2030-03-13&mine=1')
    await settle()
    await settle()
    expect(mineSwitch().disabled).toBe(true)
    expect(mineSwitch().getAttribute('aria-checked')).toBe('false')
    expect(mineSwitch().title).toBe('내 계정 정보를 불러오지 못해 쓸 수 없습니다.')
    expect(listUrls()).toEqual([WEEK_ALL])
    expect(calls((url) => url === '/api/me')).toHaveLength(1)
  })

  it('주를 옮겨도 켠 상태가 남고 그 주 15에 assigneeId를 붙인다', async () => {
    renderHome('/?date=2030-03-13&mine=1')
    await settle()
    click(document.querySelector('[aria-label="다음 주"]'))
    await settle()
    expect(location.search).toBe('?date=2030-03-18&mine=1')
    expect(listUrls()).toEqual([WEEK_MINE, '/api/reservations?from=2030-03-18&to=2030-03-24&assigneeId=2'])
  })

  it('월 보기에는 토글이 없고 42·15 모두 전체, [주]로 돌아오면 켠 상태 그대로', async () => {
    renderHome('/?date=2030-03-13&view=month&mine=1')
    await settle()
    expect(mineSwitch()).toBeNull()
    expect(summaryCalls().every(([url]) => !url.includes('assigneeId'))).toBe(true)
    expect(listUrls()).toEqual(['/api/reservations?from=2030-03-13&to=2030-03-13'])

    click(button('주', document.querySelector('.home-view-switch')))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&mine=1')
    expect(mineSwitch().getAttribute('aria-checked')).toBe('true')
    expect(listUrls().at(-1)).toBe(WEEK_MINE)
  })

  it('카드 → 패널, 예약이 바뀐 뒤 다시 부를 때도 내 담당만', async () => {
    handlers.list = () => ok({ from: '2030-03-11', to: '2030-03-17', items: [{ ...LIST_ITEM, reservedAt: '2030-03-13T15:00:00' }] })
    renderHome('/?date=2030-03-13&mine=1')
    await settle()
    click(document.querySelector('.wcal-card'))
    await settle()
    expect(location.search).toBe('?date=2030-03-13&mine=1&reservation=4')
    expect(mineSwitch().getAttribute('aria-checked')).toBe('true')

    handlers.complete = () => fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.')
    const listBefore = listCalls().length
    click(button('방문 완료', panel()))
    await settle()
    await settle()
    expect(completeCalls()).toHaveLength(1)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(listUrls().every((url) => url === WEEK_MINE)).toBe(true)
  })
})
