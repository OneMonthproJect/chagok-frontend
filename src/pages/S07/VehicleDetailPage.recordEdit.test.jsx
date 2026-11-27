// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, keyDown, render } from '@/shared/lib/domTest'
import { todaySeoul } from '@/shared/lib/date'
import VehicleDetailPage from './VehicleDetailPage.jsx'

// S-07 정비 기록 수정 (#34, 04 F-MNT-04 H1~H11, 09 S-07·M-03, 08 7.1 37·38, 05 POL-124·125):
// [수정] 활성(사장 전체 / 정비사 본인 담당·기간 내) + 비활성 이유, M-03 → 37에 읽은 version + 바꾼 칸만,
// 저장 뒤 11·10·09 다시 불러오기, 409 → 11만 다시 불러와 최신 version + 입력 유지, 403 서버 문구, "수정됨" → 38 이력 패널.

const TODAY = todaySeoul()
const OWNER = { staffId: 1, name: '박사장', role: 'OWNER', shopId: 1, shopName: '차곡카센터' }
const MECHANIC = { staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' }

const VEHICLE = {
  vehicleId: 10,
  plateNumber: '55차0010',
  model: '쏘나타',
  modelYear: 2018,
  latestMileage: 97000,
  version: 0,
  customer: { customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: true },
}

/** 08 11 P0-나머지 records[] 모양 */
const RECORD = (over = {}) => ({
  recordId: 16,
  itemId: 1,
  itemName: '엔진오일',
  type: 'REPLACE',
  date: TODAY,
  memo: null,
  source: 'SHOP',
  inspectResult: null,
  version: 0,
  edited: false,
  staff: { staffId: 2, name: '김정비' },
  mileage: 45000,
  ...over,
})
const visitsPage = (records, mileage = 50000) => ({ // 방문 주행거리(50000)와 기록 주행거리(45000)를 다르게 둬 처음 값이 "기록 값"임을 구분한다
  items: [{ visitKey: '5eed0000-0000-4000-8000-000000000015', visitDate: records[0].date, mileage, staffName: '김정비', records }],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
})

let fetchMock
let me
let visitResponses
let patch
let revisions

beforeEach(() => {
  me = OWNER
  visitResponses = [visitsPage([RECORD()])]
  patch = () => ok({ recordId: 16, vehicleId: 10, version: 1 })
  revisions = () => ok({ items: [] })
  let visitIndex = 0
  fetchMock = vi.fn((path, init) => {
    if (path === '/api/me') return me ? ok(me) : fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    if (path === '/api/vehicles/10') return ok(VEHICLE)
    if (path === '/api/vehicles/10/item-status') return ok({ vehicleId: 10, asOf: TODAY, inputMileage: null, items: [] })
    if (path === '/api/vehicles/10/visits') {
      const data = visitResponses[Math.min(visitIndex, visitResponses.length - 1)]
      visitIndex += 1
      return data === 'fail' ? fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.') : ok(data)
    }
    if (path === '/api/items') {
      return ok([
        { itemId: 1, code: 'ENGINE_OIL', name: '엔진오일', cycleMonths: 6, cycleKm: 10000, active: true, sortOrder: 1 },
        { itemId: 3, code: 'AC_FILTER', name: '에어컨필터', cycleMonths: 6, cycleKm: 10000, active: true, sortOrder: 3 },
      ])
    }
    if (path === '/api/staff/assignees') {
      return ok({ items: [{ staffId: 1, name: '박사장', role: 'OWNER', colorIndex: 0 }, { staffId: 2, name: '김정비', role: 'MECHANIC', colorIndex: 1 }] })
    }
    if (path === '/api/records/16' && init.method === 'PATCH') return patch()
    if (path === '/api/records/16/revisions') return revisions()
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
const fail = (status, code, message, fieldErrors = []) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details: null } })

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/vehicles/10']}>
      <Routes>
        <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const dialog = () => document.querySelector('[role="dialog"]')
const editButton = () => document.querySelector('.visit-record__edit')
const button = (text, root = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const calls = (match) => fetchMock.mock.calls.filter(([url, init]) => match(url, init))
const patchBodies = () => calls((url, init) => url === '/api/records/16' && init.method === 'PATCH').map(([, init]) => JSON.parse(init.body))
const visitCalls = () => calls((url) => url === '/api/vehicles/10/visits')

function field(labelText) {
  const label = Array.from(dialog().querySelectorAll('label')).find((l) => l.textContent.replace('*', '').trim() === labelText)
  return document.getElementById(label.htmlFor)
}

function setValue(element, value) {
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement : element instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}

async function openEdit() {
  renderPage()
  await settle()
  click(editButton())
  await settle()
}

async function save() {
  click(button('저장', dialog()))
  await settle()
  await settle()
}

describe('S-07 정비 기록 수정 버튼 (09 S-07)', () => {
  it('사장: 남이 담당한 지난 기록도 활성', async () => {
    visitResponses = [visitsPage([RECORD({ date: '2020-01-01' })])]
    renderPage()
    await settle()
    expect(editButton().getAttribute('aria-disabled')).toBeNull()
  })

  it('정비사: 본인 담당이 아니면 비활성 + 이유(툴팁·설명), 눌러도 열리지 않는다 (H3)', async () => {
    me = MECHANIC
    visitResponses = [visitsPage([RECORD({ staff: { staffId: 1, name: '박사장' } })])]
    renderPage()
    await settle()
    expect(editButton().getAttribute('aria-disabled')).toBe('true')
    expect(editButton().title).toBe('본인이 담당한 기록만 수정할 수 있습니다.')
    expect(document.getElementById(editButton().getAttribute('aria-describedby')).textContent).toBe('본인이 담당한 기록만 수정할 수 있습니다.')
    click(editButton())
    await settle()
    expect(dialog()).toBeNull()
  })

  it('정비사: 본인 담당이어도 방문일 + 3일이 지나면 비활성 (H10)', async () => {
    me = MECHANIC
    visitResponses = [visitsPage([RECORD({ date: '2020-01-01' })])]
    renderPage()
    await settle()
    expect(editButton().title).toContain('3일')
    expect(editButton().getAttribute('aria-disabled')).toBe('true')
  })

  it('03 조회 실패: 확인 중이 아니라 불러오지 못했다는 이유로 비활성 (리뷰 m2)', async () => {
    me = null
    renderPage()
    await settle()
    expect(editButton().getAttribute('aria-disabled')).toBe('true')
    expect(editButton().title).toBe('계정 정보를 불러오지 못했습니다. 화면을 새로 고쳐 주세요.')
  })

  it('정비사: 본인 담당·오늘 기록이면 활성', async () => {
    me = MECHANIC
    renderPage()
    await settle()
    expect(editButton().getAttribute('aria-disabled')).toBeNull()
  })
})

describe('M-03 정비 기록 수정 (08 37)', () => {
  it('지금 값으로 열린다 — 차량은 표시만, 담당은 11 staff, 주행거리는 그 기록의 주행거리', async () => {
    await openEdit()
    expect(dialog().textContent).toContain('55차0010')
    expect(field('방문일').value).toBe(TODAY)
    expect(field('주행거리').value).toBe('45000')
    expect(field('구분').value).toBe('REPLACE')
    expect(field('항목').value).toBe('1')
    expect(field('담당 정비사').value).toBe('2')
    expect(dialog().querySelector('label') && Array.from(dialog().querySelectorAll('label')).some((l) => l.textContent.includes('점검 결과'))).toBe(false)
  })

  it('메모·주행거리 보완: 읽은 version + 바꾼 칸만 + 사유, 저장 뒤 닫고 11·10·09 다시 불러오기 (H1·H2, 08 37 예시)', async () => {
    await openEdit()
    setValue(field('주행거리'), '52000')
    setValue(field('메모'), '합성유 사용')
    setValue(field('수정 사유'), '입력 누락 보완')
    await save()
    expect(patchBodies()).toEqual([{ version: 0, mileage: 52000, memo: '합성유 사용', reason: '입력 누락 보완' }])
    expect(dialog()).toBeNull()
    expect(visitCalls()).toHaveLength(2)
    expect(calls((url) => url === '/api/vehicles/10/item-status')).toHaveLength(2)
    expect(calls((url) => url === '/api/vehicles/10')).toHaveLength(2)
  })

  it('구분을 점검으로 바꾸면 점검 결과 칸이 열리고 함께 보낸다 (08 37 구분 정정 예시)', async () => {
    await openEdit()
    setValue(field('구분'), 'INSPECT')
    setValue(field('점검 결과'), 'CAUTION')
    await save()
    expect(patchBodies()).toEqual([{ version: 0, type: 'INSPECT', inspectResult: 'CAUTION' }])
  })

  it('바꾼 칸이 없으면 요청하지 않고 안내만 (H8)', async () => {
    await openEdit()
    setValue(field('수정 사유'), '사유만')
    await save()
    expect(patchBodies()).toEqual([])
    expect(dialog().textContent).toContain('바뀐 내용이 없습니다.')
  })

  it('미래 방문일은 칸 오류로 막는다 (H6)', async () => {
    await openEdit()
    setValue(field('방문일'), '2999-01-01')
    await save()
    expect(patchBodies()).toEqual([])
    expect(field('방문일').getAttribute('aria-invalid')).toBe('true')
  })

  it('409: 11만 다시 불러와 최신 version으로, 고친 칸은 그대로·자동 재전송 없음 — 다시 저장하면 새 version (H4, POL-124)', async () => {
    visitResponses = [visitsPage([RECORD()]), visitsPage([RECORD({ version: 1, memo: '다른 직원 메모' })])]
    let count = 0
    patch = () => {
      count += 1
      return count === 1
        ? fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')
        : ok({ recordId: 16, vehicleId: 10, version: 2 })
    }
    await openEdit()
    setValue(field('주행거리'), '52000')
    await save()
    expect(dialog().textContent).toContain('다른 직원이 먼저 수정했습니다.')
    expect(field('주행거리').value).toBe('52000')
    expect(field('메모').value).toBe('다른 직원 메모') // 손대지 않은 칸은 최신 값으로
    expect(patchBodies()).toHaveLength(1)
    expect(visitCalls()).toHaveLength(2)

    await save()
    expect(patchBodies()[1]).toEqual({ version: 1, mileage: 52000 })
  })

  it('409 뒤 11 다시 부르기가 실패하면 옛 version으로 저장하지 않게 저장을 막고 닫았다 다시 열게 안내 (리뷰 m1, POL-124)', async () => {
    visitResponses = [visitsPage([RECORD()]), 'fail']
    patch = () => fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')
    await openEdit()
    setValue(field('메모'), '메모 보완')
    await save()
    expect(dialog().textContent).toContain('최신 내용을 불러오지 못했습니다.')
    expect(dialog().textContent).not.toContain('최신 내용을 다시 불러왔습니다.')
    expect(button('저장', dialog()).disabled).toBe(true)
    expect(field('메모').value).toBe('메모 보완')
    expect(patchBodies()).toHaveLength(1)
  })

  it('409 뒤 다시 받은 11에 그 기록이 없으면 저장을 막는다 (리뷰 m1)', async () => {
    visitResponses = [visitsPage([RECORD()]), visitsPage([RECORD({ recordId: 99 })])]
    patch = () => fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')
    await openEdit()
    setValue(field('메모'), '메모 보완')
    await save()
    expect(dialog().textContent).toContain('최신 이력에서 이 기록을 찾지 못했습니다.')
    expect(button('저장', dialog()).disabled).toBe(true)
  })

  it('403 EDIT_PERIOD_EXPIRED(외부 기록 저장일 기준 등): 서버 문구를 보이고 입력 유지, 다시 보내지 않음', async () => {
    patch = () => fail(403, 'EDIT_PERIOD_EXPIRED', '수정할 수 있는 기간이 지났습니다.')
    await openEdit()
    setValue(field('메모'), '메모 보완')
    await save()
    expect(dialog().textContent).toContain('수정할 수 있는 기간이 지났습니다.')
    expect(field('메모').value).toBe('메모 보완')
    expect(button('다시 시도', dialog())).toBeUndefined() // 403은 다시 보내도 같다 (리뷰 m3, POL-127)
    expect(patchBodies()).toHaveLength(1)
  })

  it('저장 중에는 [취소]·×·Esc·바깥 누름으로 닫히지 않는다 — 늦게 온 저장 성공이 다른 모달을 닫지 않게 (PR #89 리뷰)', async () => {
    let resolvePatch
    patch = () =>
      new Promise((resolve) => {
        resolvePatch = () => resolve(ok({ recordId: 16, vehicleId: 10, version: 1 }))
      })
    await openEdit()
    setValue(field('메모'), '메모 보완')
    click(button('저장', dialog()))
    await settle()
    expect(button('취소', dialog()).disabled).toBe(true)
    click(button('취소', dialog()))
    click(dialog().querySelector('.modal__close'))
    keyDown('Escape')
    click(document.querySelector('.modal-backdrop'))
    await settle()
    expect(dialog()).not.toBeNull()
    expect(field('메모').value).toBe('메모 보완')

    resolvePatch()
    await settle()
    await settle()
    expect(dialog()).toBeNull() // 저장 성공은 그대로 닫는다
    expect(patchBodies()).toHaveLength(1)
  })

  it('400 fieldErrors는 그 칸 아래에 (같은 방문 항목 중복 H7)', async () => {
    patch = () =>
      fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'itemId', reason: '같은 방문에 같은 항목을 두 번 넣을 수 없습니다.' }])
    await openEdit()
    setValue(field('항목'), '3')
    await save()
    expect(dialog().textContent).toContain('같은 방문에 같은 항목을 두 번 넣을 수 없습니다.')
    expect(field('항목').getAttribute('aria-invalid')).toBe('true')
  })
})

describe('수정됨 → 수정 이력 패널 (08 38)', () => {
  it('edited 기록에만 "수정됨", 누르면 38을 불러 수정 날짜 · 수정자 · 「항목명: 전 → 후」 · 사유', async () => {
    visitResponses = [visitsPage([RECORD({ edited: true, version: 2 })])]
    revisions = () =>
      ok({
        items: [
          {
            revisionNo: 1,
            changedAt: '2026-11-25T10:05:00',
            changedBy: { staffId: 1, name: '박사장' },
            reason: '입력 누락 보완',
            changes: [
              { field: 'mileage', before: null, after: 52000 },
              { field: 'memo', before: null, after: '합성유 사용' },
            ],
          },
          {
            revisionNo: 2,
            changedAt: '2026-11-26T09:30:00',
            changedBy: { staffId: 1, name: '박사장' },
            reason: null,
            changes: [
              { field: 'type', before: 'REPLACE', after: 'INSPECT' },
              { field: 'inspectResult', before: null, after: 'CAUTION' },
            ],
          },
        ],
      })
    renderPage()
    await settle()
    click(document.querySelector('.visit-record__edited'))
    await settle()
    const items = Array.from(dialog().querySelectorAll('.record-revisions__item')).map((li) => li.textContent)
    expect(items[0]).toContain('2026.11.25 10:05 · 박사장')
    expect(items[0]).toContain('주행거리: 없음 → 52,000 km')
    expect(items[0]).toContain('사유: 입력 누락 보완')
    expect(items[1]).toContain('구분: 교체 → 점검')
    expect(items[1]).toContain('점검 결과: 없음 → 주의')
    expect(items[1]).not.toContain('사유')
  })

  it('수정하지 않은 기록에는 "수정됨"이 없다', async () => {
    renderPage()
    await settle()
    expect(document.querySelector('.visit-record__edited')).toBeNull()
  })

  it('이력 조회 실패는 안내 + 사람이 누르는 다시 불러오기', async () => {
    visitResponses = [visitsPage([RECORD({ edited: true })])]
    revisions = () => fail(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')
    renderPage()
    await settle()
    click(document.querySelector('.visit-record__edited'))
    await settle()
    expect(dialog().textContent).toContain('이력을 불러오지 못했습니다.')
    expect(calls((url) => url === '/api/records/16/revisions')).toHaveLength(1)
    revisions = () => ok({ items: [] })
    click(button('다시 불러오기', dialog()))
    await settle()
    expect(dialog().textContent).toContain('수정 이력이 없습니다.')
  })
})
