// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import { addDays, todaySeoul } from '../dates'
import ReservationFormModal from './ReservationFormModal.jsx'

// M-02 (#25 할 일: 409 두 종류, 중복 제출 방지, 과거 날짜·지난 시각, 입력 보존, 변경 모드 version 전송).
// #37: 담당 정비사(08 36 후보, 16 assigneeId 필수, 19 재배정·당일 사장 사유, 409 MECHANIC_SLOT_CONFLICT·ASSIGNEE_CHANGE_CLOSED).
// fetch만 대역으로 바꾸고 client.ts의 실제 해석·오류 처리를 거친다(CustomerVehicleFormModal.test.jsx와 같은 방식).
// 담당 후보(36)는 assigneesMock이 따로 받고, 그 밖의 요청은 fetchMock이 받는다(기존 호출 순서 검사가 36에 흔들리지 않게).

const ASSIGNEES_URL = '/api/staff/assignees'
let fetchMock
let assigneesMock
beforeEach(() => {
  fetchMock = vi.fn()
  assigneesMock = vi.fn(() => Promise.resolve(ok({ items: CANDIDATES })))
  vi.stubGlobal('fetch', (url, init) => (url === ASSIGNEES_URL ? assigneesMock(url, init) : fetchMock(url, init)))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, details = null, fieldErrors = []) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details } })
const calls = (method) => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method)
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const checkbox = (labelText) =>
  Array.from(document.querySelectorAll('label')).find((l) => l.textContent.trim() === labelText)?.querySelector('input')
const settle = () => act(async () => {})
const text = () => document.body.textContent
const assigneeSelect = () => document.querySelector('select[id$="-assignee"]')
const reasonInput = () => document.querySelector('input[id$="-reassign-reason"]')

function chooseAssignee(staffId) {
  const el = assigneeSelect()
  act(() => {
    el.value = String(staffId)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function typeReason(value) {
  const el = reasonInput()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** 서울 2026-11-26 13:10으로 고정 (당일·지난 날짜 판정을 실행 시각과 무관하게) */
function fixSeoulNow() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-26T04:10:00Z'))
}

const TOMORROW = addDays(todaySeoul(), 1)
const ITEMS = [{ itemId: 1, name: '엔진오일' }, { itemId: 6, name: '배터리' }]
const VEHICLE = { vehicleId: 4, plateNumber: '78라0004', customerId: 4, customerName: '최지은', phone: '010-0000-0004' }
/** 08 7.1 36 JSON 예시 */
const CANDIDATES = [
  { staffId: 1, name: '박사장', role: 'OWNER', colorIndex: 0 },
  { staffId: 2, name: '김정비', role: 'MECHANIC', colorIndex: 1 },
]
const OWNER = { staffId: 1, role: 'OWNER' }
const MECHANIC = { staffId: 2, role: 'MECHANIC' }

/** VehiclePicker 대역: 누르면 차량 하나를 고른다 (실제 VehiclePicker는 customer feature, pages가 끼운다) */
const fakePicker = ({ onChange }) => <button type="button" onClick={() => onChange(VEHICLE)}>차량 고르기</button>

/** 그린 뒤 담당 후보(36)가 올 때까지 기다린다 */
async function renderCreate(props = {}) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn(), onOpenExisting: vi.fn() }
  render(<ReservationFormModal mode="create" initialDate={TOMORROW} items={ITEMS} login={OWNER} vehiclePicker={fakePicker} {...handlers} {...props} />)
  await settle()
  return handlers
}

function fillCreate() {
  click(button('차량 고르기'))
  click(button('10:00'))
}

describe('M-02 등록', () => {
  it('필수 칸이 비면 보내지 않고 칸 아래에 알린다', async () => {
    await renderCreate()
    click(button('등록'))
    await settle()
    expect(calls('POST')).toHaveLength(0)
    expect(text()).toContain('차량을 골라 주세요.')
    expect(text()).toContain('시각을 골라 주세요.')
  })

  it('두 번 눌러도 요청은 한 번, 성공하면 onSaved (16 요청에 기본 담당 = 로그인 계정)', async () => {
    let resolve
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r }))
    const { onSaved } = await renderCreate()
    fillCreate()
    click(checkbox('엔진오일'))
    click(button('등록'))
    click(document.querySelector('button[type="submit"]'))
    expect(calls('POST')).toHaveLength(1)
    const body = JSON.parse(calls('POST')[0][1].body)
    expect(body).toEqual({ vehicleId: 4, reservedAt: `${TOMORROW}T10:00:00`, assigneeId: 1, purpose: { itemIds: [1], other: false, memo: null } })
    resolve(ok({ reservationId: 9, status: 'RESERVED', reservedAt: `${TOMORROW}T10:00:00`, vehicleId: 4, version: 0 }))
    await settle()
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 9 }))
  })

  it('담당 칸: 후보(36)를 보이고 기본은 로그인 계정, 다른 담당을 고르면 그 값을 보낸다 (R19)', async () => {
    fetchMock.mockResolvedValue(ok({ reservationId: 9, status: 'RESERVED', reservedAt: `${TOMORROW}T10:00:00`, vehicleId: 4, version: 0 }))
    await renderCreate({ login: MECHANIC })
    expect(assigneesMock).toHaveBeenCalledTimes(1)
    expect(Array.from(assigneeSelect().options).map((o) => o.textContent)).toEqual(['담당 정비사를 고르세요', '박사장', '김정비'])
    expect(assigneeSelect().value).toBe('2')
    fillCreate()
    chooseAssignee(1)
    click(button('등록'))
    await settle()
    expect(JSON.parse(calls('POST')[0][1].body).assigneeId).toBe(1)
  })

  it('로그인 계정을 모르면 비워 두고, 고르지 않으면 보내지 않는다', async () => {
    await renderCreate({ login: null })
    expect(assigneeSelect().value).toBe('')
    fillCreate()
    click(button('등록'))
    await settle()
    expect(calls('POST')).toHaveLength(0)
    expect(text()).toContain('담당 정비사를 골라 주세요.')
  })

  it('후보 조회 실패 → 안내 + [다시 불러오기](사람이 누를 때만), 그동안 등록하지 않는다', async () => {
    assigneesMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    await renderCreate()
    expect(text()).toContain('담당 정비사 목록을 불러오지 못했습니다.')
    fillCreate()
    click(button('등록'))
    await settle()
    expect(calls('POST')).toHaveLength(0)
    expect(assigneesMock).toHaveBeenCalledTimes(1) // 자동 재조회 없음
    click(button('다시 불러오기'))
    await settle()
    expect(assigneesMock).toHaveBeenCalledTimes(2)
    expect(assigneeSelect().value).toBe('1')
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true') // 입력 유지
  })

  it('400 assigneeId(X13) → 담당 칸 아래, 입력 유지', async () => {
    fetchMock.mockResolvedValue(fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', null, [{ field: 'assigneeId', reason: '담당 정비사를 확인해 주세요.' }]))
    await renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('담당 정비사를 확인해 주세요.')
    expect(assigneeSelect().getAttribute('aria-invalid')).toBe('true')
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
  })

  it('409 MECHANIC_SLOT_CONFLICT → 안내 + [겹친 예약 보기], 입력 유지·자동 재전송 없음 (R15)', async () => {
    fetchMock.mockResolvedValue(fail(409, 'MECHANIC_SLOT_CONFLICT', '이 정비사는 해당 시각에 이미 예약이 있습니다. 다른 시각이나 다른 담당을 선택해 주세요.', { reservationId: 1 }))
    const { onOpenExisting, onSaved } = await renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('이 정비사는 해당 시각에 이미 예약이 있습니다')
    expect(calls('POST')).toHaveLength(1)
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
    click(button('겹친 예약 보기'))
    expect(onOpenExisting).toHaveBeenCalledWith(1)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('409 RESERVATION_ACTIVE_EXISTS → 안내 + [기존 예약 보기], 입력은 그대로', async () => {
    fetchMock.mockResolvedValue(fail(409, 'RESERVATION_ACTIVE_EXISTS', '이 차량에는 이미 유효한 예약이 있습니다.', { reservationId: 1 }))
    const { onOpenExisting, onSaved } = await renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('이 차량에는 유효한 예약이 있습니다')
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
    click(button('기존 예약 보기'))
    expect(onOpenExisting).toHaveBeenCalledWith(1)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('응답 없음이면 공통 오류 안내, 입력 유지, 자동으로 다시 보내지 않는다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await renderCreate()
    fillCreate()
    click(button('등록'))
    await settle()
    expect(text()).toContain('저장하지 못했습니다.')
    expect(calls('POST')).toHaveLength(1)
    expect(button('10:00').getAttribute('aria-pressed')).toBe('true')
    expect(text()).toContain('78라0004')
  })

  it('오늘이면 지난 시각 버튼은 누를 수 없고, 내일은 모두 고를 수 있다 (서울 13:10 고정)', async () => {
    fixSeoulNow()
    await renderCreate({ initialDate: '2026-11-26' })
    expect(button('13:00').disabled).toBe(true)
    expect(button('13:30').disabled).toBe(false)
    cleanup()
    await renderCreate({ initialDate: '2026-11-27' })
    expect(button('08:00').disabled).toBe(false)
  })

  it('과거 날짜로 열면 오늘로 바꿔 연다 (날짜 ≥ 오늘, R2)', async () => {
    await renderCreate({ initialDate: '2000-01-01' })
    expect(document.querySelector('input[type="date"]').value).toBe(todaySeoul())
  })
})

describe('M-02 변경', () => {
  const target = {
    reservationId: 3,
    version: 2,
    reservedAt: `${TOMORROW}T10:00:00`,
    purpose: { items: [{ itemId: 1, name: '엔진오일' }], other: false, memo: null },
    vehicle: { vehicleId: 2, plateNumber: '34나0002', customerName: '이영희' },
    assignee: { staffId: 2, name: '김정비', colorIndex: 1 },
  }
  /** 서울 2026-11-26 13:10 고정일 때의 당일(15:00)·지난 날짜 예약 */
  const todayTarget = { ...target, reservedAt: '2026-11-26T15:00:00' }
  const pastTarget = { ...target, reservedAt: '2026-11-25T10:00:00' }

  const renderEdit = async (props = {}) => {
    const handlers = { onSaved: vi.fn(), onClose: vi.fn(), onOpenExisting: vi.fn() }
    render(<ReservationFormModal mode="edit" target={target} items={ITEMS} login={MECHANIC} {...handlers} {...props} />)
    await settle()
    return handlers
  }
  const saved = (version) => ok({ reservationId: 3, status: 'RESERVED', reservedAt: `${TOMORROW}T10:00:00`, vehicleId: 2, version })

  it('차량은 바꿀 수 없고, 바뀐 게 없으면 저장 비활성 (R14). 담당 칸은 지금 담당', async () => {
    await renderEdit()
    expect(text()).toContain('34나0002')
    expect(button('차량 고르기')).toBeUndefined()
    expect(button('저장').disabled).toBe(true)
    expect(assigneeSelect().value).toBe('2')
    expect(assigneeSelect().disabled).toBe(false)
  })

  it('읽은 version과 바뀐 칸만 PATCH로 보낸다 (담당이 그대로면 assigneeId 없음)', async () => {
    fetchMock.mockResolvedValue(ok({ reservationId: 3, status: 'RESERVED', reservedAt: `${TOMORROW}T11:00:00`, vehicleId: 2, version: 3 }))
    const { onSaved } = await renderEdit()
    click(button('11:00'))
    click(button('저장'))
    await settle()
    const [url, init] = calls('PATCH')[0]
    expect(url).toBe('/api/reservations/3')
    expect(JSON.parse(init.body)).toEqual({ version: 2, reservedAt: `${TOMORROW}T11:00:00` })
    expect(onSaved).toHaveBeenCalled()
  })

  it('R24 (a) 전날까지: 정비사도 재배정, 사유 칸 없이 { version, assigneeId }', async () => {
    fetchMock.mockResolvedValue(saved(3))
    await renderEdit()
    chooseAssignee(1)
    expect(reasonInput()).toBeNull()
    expect(button('저장').disabled).toBe(false)
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ version: 2, assigneeId: 1 })
  })

  it('R24 (b) 당일 정비사: 담당 칸 잠김 + 안내', async () => {
    fixSeoulNow()
    await renderEdit({ target: todayTarget })
    expect(assigneeSelect().disabled).toBe(true)
    expect(text()).toContain('오늘 예약의 담당은 사장만 바꿀 수 있습니다.')
  })

  it('R24 (c)(d) 당일 사장: 담당을 바꾸면 사유 칸(필수)이 열리고, 비면 보내지 않는다', async () => {
    fixSeoulNow()
    fetchMock.mockResolvedValue(saved(3))
    await renderEdit({ login: OWNER, target: todayTarget })
    expect(assigneeSelect().disabled).toBe(false)
    expect(reasonInput()).toBeNull()
    chooseAssignee(1)
    expect(reasonInput()).not.toBeNull()
    click(button('저장'))
    await settle()
    expect(calls('PATCH')).toHaveLength(0)
    expect(text()).toContain('당일 재배정은 사유를 입력해 주세요.')
    typeReason('  김정비 병가 ')
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ version: 2, assigneeId: 1, reassignReason: '김정비 병가' })
  })

  it('R24 (f) 지난 날짜: 사장도 담당 칸 잠김', async () => {
    fixSeoulNow()
    await renderEdit({ login: OWNER, target: pastTarget })
    expect(assigneeSelect().disabled).toBe(true)
    expect(text()).toContain('지난 날짜의 예약은 담당을 바꿀 수 없습니다.')
  })

  it('#71 처리 필요(어제) 예약: 일시를 그대로 두고 목적만 바꾸면 19를 보낸다 (reservedAt 없음, 08 19)', async () => {
    fixSeoulNow()
    fetchMock.mockResolvedValue(saved(3))
    const { onSaved } = await renderEdit({ target: pastTarget })
    click(checkbox('배터리'))
    click(button('저장'))
    await settle()
    expect(text()).not.toContain('오늘 이후 날짜만 예약할 수 있습니다.')
    expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ version: 2, purpose: { itemIds: [1, 6], other: false, memo: '' } })
    expect(onSaved).toHaveBeenCalled()
  })

  it('#71 당일 사장: 예약 시각(10:00)이 지났어도 일시를 그대로 두면 재배정을 보낸다 (08 19 R24 날짜 기준)', async () => {
    fixSeoulNow()
    fetchMock.mockResolvedValue(saved(3))
    await renderEdit({ login: OWNER, target: { ...target, reservedAt: '2026-11-26T10:00:00' } })
    chooseAssignee(1)
    typeReason('김정비 병가')
    click(button('저장'))
    await settle()
    expect(text()).not.toContain('지난 시각은 고를 수 없습니다.')
    expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ version: 2, assigneeId: 1, reassignReason: '김정비 병가' })
  })

  it('#71 일시를 바꾸면 날짜 검사는 그대로 (어제 예약의 날짜를 더 이전으로)', async () => {
    fixSeoulNow()
    await renderEdit({ target: pastTarget })
    const dateInput = document.querySelector('input[type="date"]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    act(() => {
      setter.call(dateInput, '2026-11-24')
      dateInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click(button('저장'))
    await settle()
    expect(calls('PATCH')).toHaveLength(0)
    expect(text()).toContain('오늘 이후 날짜만 예약할 수 있습니다.')
  })

  it('409 ASSIGNEE_CHANGE_CLOSED → 담당만 원래대로 되돌리고 잠근다, 다른 입력은 유지·자동 재전송 없음', async () => {
    fetchMock.mockResolvedValueOnce(fail(409, 'ASSIGNEE_CHANGE_CLOSED', '지금은 담당 정비사를 바꿀 수 없습니다.'))
    await renderEdit()
    click(button('11:00'))
    chooseAssignee(1)
    click(button('저장'))
    await settle()
    expect(calls('PATCH')).toHaveLength(1)
    expect(text()).toContain('지금은 담당 정비사를 바꿀 수 없습니다.')
    expect(assigneeSelect().value).toBe('2')
    expect(assigneeSelect().disabled).toBe(true)
    expect(button('11:00').getAttribute('aria-pressed')).toBe('true')
    fetchMock.mockResolvedValueOnce(saved(3))
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[1][1].body)).toEqual({ version: 2, reservedAt: `${TOMORROW}T11:00:00` })
  })

  it('409 MECHANIC_SLOT_CONFLICT (R18) → [겹친 예약 보기]', async () => {
    fetchMock.mockResolvedValue(fail(409, 'MECHANIC_SLOT_CONFLICT', '이 정비사는 해당 시각에 이미 예약이 있습니다. 다른 시각이나 다른 담당을 선택해 주세요.', { reservationId: 7 }))
    const { onOpenExisting } = await renderEdit()
    chooseAssignee(1)
    click(button('저장'))
    await settle()
    click(button('겹친 예약 보기'))
    expect(onOpenExisting).toHaveBeenCalledWith(7)
  })

  it('후보 조회 실패여도 담당은 그대로 두고 다른 변경은 저장할 수 있다', async () => {
    assigneesMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    fetchMock.mockResolvedValue(saved(3))
    await renderEdit()
    expect(text()).toContain('담당은 지금 그대로 두고 저장합니다.')
    click(button('11:00'))
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ version: 2, reservedAt: `${TOMORROW}T11:00:00` })
  })

  it('409 CONCURRENT_MODIFICATION → 최신 예약(17)을 담당까지 다시 불러와 채우고, 다시 보내지 않는다', async () => {
    fetchMock
      .mockResolvedValueOnce(fail(409, 'CONCURRENT_MODIFICATION', '다른 사용자가 먼저 바꿨습니다.'))
      .mockResolvedValueOnce(ok({
        reservation: {
          reservationId: 3, reservedAt: `${TOMORROW}T14:00:00`, status: 'RESERVED', needsAction: false, version: 5,
          purpose: { items: [], other: true, memo: '메모' }, assignee: { staffId: 1, name: '박사장', colorIndex: 0 },
        },
        customer: { customerId: 2, name: '이영희', phone: '010-0000-0002', consent: true },
        vehicle: { vehicleId: 2, plateNumber: '34나0002', model: '쏘나타', modelYear: 2018, latestMileage: 60000 },
        recentVisits: [], totalVisitCount: 0, itemStatuses: [],
      }))
    const { onSaved } = await renderEdit()
    click(button('11:00'))
    click(button('저장'))
    await settle()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/reservations/3/panel')
    expect(calls('PATCH')).toHaveLength(1)
    expect(text()).toContain('다른 사용자가 먼저 바꿨습니다.')
    expect(button('14:00').getAttribute('aria-pressed')).toBe('true')
    expect(assigneeSelect().value).toBe('1')
    expect(onSaved).not.toHaveBeenCalled()
    // 다시 고쳐 저장하면 새 version으로 보낸다(담당은 최신 값 그대로라 보내지 않음)
    fetchMock.mockResolvedValueOnce(ok({ reservationId: 3, status: 'RESERVED', reservedAt: `${TOMORROW}T15:00:00`, vehicleId: 2, version: 6 }))
    click(button('15:00'))
    click(button('저장'))
    await settle()
    expect(JSON.parse(calls('PATCH')[1][1].body)).toEqual({ version: 5, reservedAt: `${TOMORROW}T15:00:00` })
  })
})
