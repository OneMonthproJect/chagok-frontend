// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import HomePage from './HomePage.jsx'

// S-02 예약 상세 패널의 방문 접수·정정·이력 보기 (F-RSV-09·10, 08 39~41, 09 S-02, chagok-frontend#33):
// 버튼 조건(접수는 예약만, 정정은 끝난 예약만, 이력은 항상), 접수 입력 칸(D-58, 비어 있는 값만), 409 두 종류 → 패널·목록 다시 조회,
// 400·403 → 대화상자가 열린 채 입력 유지, 정정 상태 선택은 사장만(허용표), 이력은 서버 순서 그대로, 패널 담당 라벨.

let fetchMock
let location
let routes
let state

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, fieldErrors = []) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details: null } })

/** 08 17 JSON 예시(최근 방문·점검 주기는 줄임) + 테스트가 바꾸는 상태·version·메모·차량·담당 */
function panelData() {
  return {
    reservation: {
      reservationId: 4,
      reservedAt: '2026-11-23T15:00:00',
      status: state.status,
      needsAction: false,
      version: state.version,
      purpose: { items: [{ itemId: 6, name: '배터리' }], other: false, memo: state.memo },
      ...(state.assignee ? { assignee: state.assignee } : {}),
    },
    customer: { customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: true },
    vehicle: { vehicleId: 10, plateNumber: '55차0010', model: '쏘나타', modelYear: 2018, latestMileage: 97000, ...state.vehicle },
    recentVisits: [],
    totalVisitCount: 0,
    itemStatuses: [],
  }
}

const LIST_ITEM = {
  reservationId: 4, reservedAt: '2026-11-23T15:00:00', status: 'RESERVED', needsAction: false, version: 0,
  vehicleId: 10, plateNumber: '55차0010', customerId: 10, customerName: '오세훈', phone: '010-0000-0010', purposeSummary: '배터리',
}

beforeEach(() => {
  state = { status: 'RESERVED', version: 0, memo: null, vehicle: {}, assignee: undefined }
  routes = {
    me: () => ok({ staffId: 1, name: '박사장', role: 'OWNER', shopId: 1, shopName: '차곡카센터' }),
    start: () => ok({ reservationId: 4, status: 'IN_PROGRESS', vehicleId: 10, version: state.version + 1 }),
    correct: () => ok({ reservationId: 4, status: state.status, vehicleId: 10, version: state.version + 1 }),
    revisions: () => ok({ items: [] }),
  }
  fetchMock = vi.fn((url, init) => {
    if (url === '/api/me') return Promise.resolve(routes.me())
    if (url.startsWith('/api/reservations?')) return Promise.resolve(ok({ from: 'x', to: 'x', items: [LIST_ITEM] }))
    if (url.startsWith('/api/reservations/summary?')) return Promise.resolve(ok({ from: 'x', to: 'x', items: [] }))
    if (url === '/api/reservations/4/panel') return Promise.resolve(ok(panelData()))
    if (url === '/api/reservations/4/start' && init.method === 'POST') return Promise.resolve(routes.start(init))
    if (url === '/api/reservations/4/correct' && init.method === 'POST') return Promise.resolve(routes.correct(init))
    if (url === '/api/reservations/4/revisions') return Promise.resolve(routes.revisions())
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

function open(overrides = {}) {
  Object.assign(state, overrides)
  render(
    <MemoryRouter initialEntries={['/?reservation=4']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/visits/new" element={<p>S-08</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const panel = () => document.querySelector('.rsv-panel')
const dialog = () => document.querySelector('.modal')
const field = (id) => document.getElementById(id)
const button = (text, root = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const calls = (match) => fetchMock.mock.calls.filter(([url, init]) => match(url, init))
const panelCalls = () => calls((url) => url === '/api/reservations/4/panel')
const listCalls = () => calls((url) => url.startsWith('/api/reservations?'))
const summaryCalls = () => calls((url) => url.startsWith('/api/reservations/summary?'))
const startCalls = () => calls((url) => url.endsWith('/start'))
const correctCalls = () => calls((url) => url.endsWith('/correct'))
const revisionCalls = () => calls((url) => url.endsWith('/revisions'))
const bodyOf = (call) => JSON.parse(call[1].body)

/** 입력 칸·textarea·select 값 바꾸기 (React가 알아차리도록 원래 setter + 이벤트) */
function type(element, value) {
  const proto = Object.getPrototypeOf(element)
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}

describe('버튼 조건', () => {
  it('[방문 접수]는 상태 "예약"만, [정정]은 끝난 예약만, [이력 보기]는 모든 상태', async () => {
    for (const [status, start, correct] of [
      ['RESERVED', true, false],
      ['IN_PROGRESS', false, false],
      ['COMPLETED', false, true],
      ['CANCELED', false, true],
      ['NO_SHOW', false, true],
    ]) {
      cleanup()
      open({ status })
      await settle()
      expect(Boolean(button('방문 접수', panel()))).toBe(start)
      expect(Boolean(button('정정', panel()))).toBe(correct)
      expect(button('이력 보기', panel())).toBeDefined()
    }
  })

  it('패널에 담당 정비사 이름+색 라벨, assignee가 없으면 라벨 없음', async () => {
    open({ assignee: { staffId: 2, name: '김정비', colorIndex: 1 } })
    await settle()
    const label = panel().querySelector('.assignee-label')
    expect(label.textContent).toContain('김정비')
    expect(label.className).toContain('assignee-label--c1')

    cleanup()
    open({ assignee: undefined })
    await settle()
    expect(panel().querySelector('.assignee-label')).toBeNull()
  })
})

describe('방문 접수 (08 39)', () => {
  it('차량 값이 다 있으면 대화상자 없이 version만 한 번 보내고, 패널·목록을 다시 불러 진행중을 보인다(S-08로 가지 않음)', async () => {
    routes.start = () => {
      state.status = 'IN_PROGRESS'
      state.version = 4
      return ok({ reservationId: 4, status: 'IN_PROGRESS', vehicleId: 10, version: 4 })
    }
    open({ version: 3 })
    await settle()
    const listBefore = listCalls().length
    const summaryBefore = summaryCalls().length
    click(button('방문 접수', panel()))
    await settle()
    await settle()

    expect(dialog()).toBeNull()
    expect(startCalls()).toHaveLength(1)
    expect(bodyOf(startCalls()[0])).toEqual({ version: 3 })
    expect(panelCalls()).toHaveLength(2)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(summaryCalls().length).toBe(summaryBefore + 1)
    expect(location.pathname).toBe('/')
    expect(panel().querySelector('.rsv-status').textContent).toBe('진행중')
    expect(panel().querySelector('.error-notice--info').textContent).toContain('방문 접수했습니다.')
    expect(button('방문 접수', panel())).toBeUndefined()
    expect(button('방문 완료', panel())).toBeDefined() // 진행중에서도 완료 가능(08 18)
  })

  it('연식만 비어 있으면 연식 칸만 연다. 비운 채로는 보내지 않고, 채우면 version + modelYear를 보낸다 (D-58)', async () => {
    open({ vehicle: { modelYear: null } })
    await settle()
    click(button('방문 접수', panel()))
    await settle()
    expect(field('start-model-year')).not.toBeNull()
    expect(field('start-mileage')).toBeNull()

    click(button('방문 접수', dialog()))
    await settle()
    expect(startCalls()).toHaveLength(0)
    expect(dialog().textContent).toContain('필수 입력입니다.')

    type(field('start-model-year'), '2018')
    click(button('방문 접수', dialog()))
    await settle()
    await settle()
    expect(startCalls()).toHaveLength(1)
    expect(bodyOf(startCalls()[0])).toEqual({ version: 0, modelYear: 2018 })
    expect(dialog()).toBeNull()
  })

  it('연식·주행거리가 모두 비어 있으면 두 칸을 열고, 숫자가 아니면 보내지 않으며, 채우면 둘 다 보낸다', async () => {
    open({ vehicle: { modelYear: null, latestMileage: null } })
    await settle()
    click(button('방문 접수', panel()))
    await settle()
    type(field('start-model-year'), '2019')
    type(field('start-mileage'), '12a')
    click(button('방문 접수', dialog()))
    await settle()
    expect(startCalls()).toHaveLength(0)
    expect(dialog().textContent).toContain('숫자만 입력해 주세요.')

    type(field('start-mileage'), '52000')
    click(button('방문 접수', dialog()))
    await settle()
    expect(bodyOf(startCalls()[0])).toEqual({ version: 0, modelYear: 2019, mileage: 52000 })
  })

  it('400 fieldErrors: 대화상자가 열린 채 입력값을 지키고 칸 아래에 서버 문구, 패널을 다시 읽지 않는다', async () => {
    routes.start = () => fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'modelYear', reason: '1980년 이후여야 합니다.' }])
    open({ vehicle: { modelYear: null } })
    await settle()
    click(button('방문 접수', panel()))
    await settle()
    type(field('start-model-year'), '1970')
    click(button('방문 접수', dialog()))
    await settle()
    await settle()

    expect(startCalls()).toHaveLength(1)
    expect(dialog()).not.toBeNull()
    expect(field('start-model-year').value).toBe('1970')
    expect(field('start-model-year').getAttribute('aria-invalid')).toBe('true')
    expect(dialog().textContent).toContain('1980년 이후여야 합니다.')
    expect(panelCalls()).toHaveLength(1)
  })

  it('409 CONCURRENT_MODIFICATION(입력 대화상자): 닫고 패널·목록을 다시 불러 안내, 다시 보내지 않는다', async () => {
    routes.start = () => fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')
    open({ vehicle: { latestMileage: null } })
    await settle()
    const listBefore = listCalls().length
    click(button('방문 접수', panel()))
    await settle()
    type(field('start-mileage'), '98000')
    click(button('방문 접수', dialog()))
    await settle()
    await settle()

    expect(startCalls()).toHaveLength(1)
    expect(dialog()).toBeNull()
    expect(panelCalls()).toHaveLength(2)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(panel().querySelector('.error-notice--warn').textContent).toContain('다른 직원이 먼저 수정했습니다.')
  })

  it('409 INVALID_STATUS_TRANSITION(바로 보냄): 다시 불러온 상태를 보이고 접수 버튼이 없어진다', async () => {
    routes.start = () => {
      state.status = 'CANCELED'
      return fail(409, 'INVALID_STATUS_TRANSITION', '지금 상태에서는 할 수 없는 변경입니다.')
    }
    open()
    await settle()
    click(button('방문 접수', panel()))
    await settle()
    await settle()

    expect(startCalls()).toHaveLength(1)
    expect(panel().querySelector('.rsv-status').textContent).toBe('취소')
    expect(panel().querySelector('.error-notice--warn').textContent).toContain('지금 상태에서는 할 수 없는 변경입니다.')
    expect(button('방문 접수', panel())).toBeUndefined()
  })

  it('500(바로 보냄): 패널에 오류 안내만, 재조회·재전송 없음', async () => {
    routes.start = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    open()
    await settle()
    click(button('방문 접수', panel()))
    await settle()
    await settle()
    expect(startCalls()).toHaveLength(1)
    expect(panelCalls()).toHaveLength(1)
    expect(panel().querySelector('.error-notice--error').textContent).toContain('일시적인 오류가 발생했습니다.')
  })
})

describe('지난 예약 정정 (08 40)', () => {
  it('사장: 노쇼 → 허용표의 선택지(그대로·취소·방문 완료), 취소 + 사유를 보내고 패널·목록을 다시 부른다', async () => {
    routes.correct = () => {
      state.status = 'CANCELED'
      state.version = 2
      return ok({ reservationId: 4, status: 'CANCELED', vehicleId: 10, version: 2 })
    }
    open({ status: 'NO_SHOW', version: 1 })
    await settle()
    const listBefore = listCalls().length
    click(button('정정', panel()))
    await settle()
    expect(Array.from(field('correct-status').options).map((o) => o.textContent)).toEqual(['그대로 (노쇼)', '취소', '방문 완료'])

    type(field('correct-status'), 'CANCELED')
    type(field('correct-reason'), '고객이 전날 전화로 취소함')
    click(button('정정', dialog()))
    await settle()
    await settle()

    expect(correctCalls()).toHaveLength(1)
    expect(bodyOf(correctCalls()[0])).toEqual({ version: 1, status: 'CANCELED', reason: '고객이 전날 전화로 취소함' })
    expect(dialog()).toBeNull()
    expect(listCalls().length).toBe(listBefore + 1)
    expect(panel().querySelector('.rsv-status').textContent).toBe('취소')
    expect(panel().querySelector('.error-notice--info').textContent).toContain('정정했습니다.')
  })

  it('사장: 방문 완료는 상태 선택지가 없고(완료 → 취소·노쇼 불가) 메모만 고친다', async () => {
    open({ status: 'COMPLETED' })
    await settle()
    click(button('정정', panel()))
    await settle()
    expect(field('correct-status')).toBeNull()
    expect(dialog().textContent).not.toContain('상태 정정은 사장만')
  })

  it('정비사: 상태 선택 없이 메모만, 403 EDIT_PERIOD_EXPIRED면 대화상자에 문구를 보이고 입력을 지킨다', async () => {
    routes.me = () => ok({ staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' })
    routes.correct = () => fail(403, 'EDIT_PERIOD_EXPIRED', '수정 기간(3일)이 지났습니다.')
    open({ status: 'NO_SHOW', memo: '배터리 교체', version: 2 })
    await settle()
    click(button('정정', panel()))
    await settle()
    expect(field('correct-status')).toBeNull()
    expect(dialog().textContent).toContain('상태 정정은 사장만 할 수 있습니다.')
    expect(field('correct-memo').value).toBe('배터리 교체')

    type(field('correct-memo'), '배터리 교체, 단자 청소 요청')
    click(button('정정', dialog()))
    await settle()
    await settle()

    expect(bodyOf(correctCalls()[0])).toEqual({ version: 2, purposeMemo: '배터리 교체, 단자 청소 요청' })
    expect(dialog()).not.toBeNull()
    expect(dialog().textContent).toContain('수정 기간(3일)이 지났습니다.')
    expect(field('correct-memo').value).toBe('배터리 교체, 단자 청소 요청')
    expect(panelCalls()).toHaveLength(1)
  })

  it('바뀐 것이 없으면 보내지 않고 알린다. 메모를 지우면 빈 문자열로 보낸다', async () => {
    open({ status: 'CANCELED', memo: '에어컨 냄새' })
    await settle()
    click(button('정정', panel()))
    await settle()
    click(button('정정', dialog()))
    await settle()
    expect(correctCalls()).toHaveLength(0)
    expect(dialog().textContent).toContain('바뀐 내용이 없습니다.')

    type(field('correct-memo'), '')
    click(button('정정', dialog()))
    await settle()
    expect(bodyOf(correctCalls()[0])).toEqual({ version: 0, purposeMemo: '' })
  })

  it('409 INVALID_STATUS_TRANSITION: 대화상자를 닫고 패널·목록을 다시 부른다, 다시 보내지 않는다', async () => {
    routes.correct = () => fail(409, 'INVALID_STATUS_TRANSITION', '지금 상태에서는 할 수 없는 변경입니다.')
    open({ status: 'COMPLETED' })
    await settle()
    const listBefore = listCalls().length
    click(button('정정', panel()))
    await settle()
    type(field('correct-memo'), '메모')
    click(button('정정', dialog()))
    await settle()
    await settle()

    expect(correctCalls()).toHaveLength(1)
    expect(dialog()).toBeNull()
    expect(panelCalls()).toHaveLength(2)
    expect(listCalls().length).toBe(listBefore + 1)
    expect(panel().querySelector('.error-notice--warn').textContent).toContain('지금 상태에서는 할 수 없는 변경입니다.')
  })
})

describe('이력 보기 (08 41)', () => {
  it('열 때 한 번 부르고, 서버 순서대로 종류·일시·바꾼 사람·전 → 후·사유를 보인다 (08 41 JSON 예시)', async () => {
    routes.revisions = () =>
      ok({
        items: [
          {
            kind: 'ASSIGNEE', changedAt: '2026-11-21T16:20:00', changedBy: { staffId: 1, name: '박사장' }, reason: null,
            changes: [{ field: 'assignee', before: { staffId: 2, name: '김정비' }, after: { staffId: 1, name: '박사장' } }],
          },
          {
            kind: 'STATUS', changedAt: '2026-11-25T09:10:00', changedBy: { staffId: 1, name: '박사장' }, reason: '고객이 전날 전화로 취소함',
            changes: [{ field: 'status', before: 'NO_SHOW', after: 'CANCELED' }],
          },
          {
            kind: 'MEMO', changedAt: '2026-11-25T09:10:00', changedBy: { staffId: 1, name: '박사장' }, reason: '고객이 전날 전화로 취소함',
            changes: [{ field: 'purposeMemo', before: null, after: '배터리 교체, 단자 청소 요청' }],
          },
        ],
      })
    open({ status: 'CANCELED' })
    await settle()
    click(button('이력 보기', panel()))
    await settle()

    expect(revisionCalls()).toHaveLength(1)
    const items = Array.from(dialog().querySelectorAll('.rsv-revisions__item')).map((li) => li.textContent)
    expect(items).toHaveLength(3)
    expect(items[0]).toContain('담당 재배정')
    expect(items[0]).toContain('2026.11.21 16:20 · 박사장')
    expect(items[0]).toContain('김정비 → 박사장')
    expect(items[0]).not.toContain('사유')
    expect(items[1]).toContain('상태 정정')
    expect(items[1]).toContain('노쇼 → 취소')
    expect(items[1]).toContain('사유: 고객이 전날 전화로 취소함')
    expect(items[2]).toContain('메모 정정')
    expect(items[2]).toContain('없음 → 배터리 교체, 단자 청소 요청')
  })

  it('이력이 없으면 안내, 실패하면 사람이 누르는 다시 불러오기만 (자동 재요청 없음)', async () => {
    open()
    await settle()
    click(button('이력 보기', panel()))
    await settle()
    expect(dialog().textContent).toContain('변경 이력이 없습니다.')
    click(button('닫기', dialog()))
    await settle()

    routes.revisions = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    click(button('이력 보기', panel()))
    await settle()
    expect(dialog().textContent).toContain('불러오지 못했습니다.')
    expect(revisionCalls()).toHaveLength(2)

    routes.revisions = () => ok({ items: [] })
    click(button('다시 불러오기', dialog()))
    await settle()
    expect(revisionCalls()).toHaveLength(3)
    expect(dialog().textContent).toContain('변경 이력이 없습니다.')
  })
})
