// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import VisitPreview, { PREVIEW_DELAY_MS } from './VisitPreview.jsx'

// S-08 저장 전 미리보기 (09 S-08 3번, 04 F-VIS-01·T8·T11, 08 10, 05 POL-125, #35):
// 처음엔 날짜 기준, 입력 멈춘 뒤 0.5초에 ?mileage=, 빠르게 바꾸면 마지막 값만, 늦게 온 이전 응답은 버림, 비우면 mileage 없이,
// 숫자가 아니면 부르지 않음, 실패는 사람이 누르는 다시 불러오기(자동 재요청 없음), 400은 다시 불러오기 없음.

const unknown = (itemId, code, name) => ({ itemId, code, name, status: 'UNKNOWN', dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null })
const OTHER_ITEMS = [
  unknown(2, 'AIR_CLEANER', '에어클리너'),
  unknown(3, 'AC_FILTER', '에어컨필터'),
  unknown(4, 'BRAKE_PAD', '브레이크패드'),
  unknown(5, 'TIRE', '타이어 상태 점검'),
  unknown(6, 'BATTERY', '배터리'),
]
const ENGINE_OIL = {
  itemId: 1, code: 'ENGINE_OIL', name: '엔진오일',
  baseRecord: { date: '2026-09-24', mileage: 45000, type: 'REPLACE' },
  nextDueDate: '2027-03-24', nextDueMileage: 55000,
}
/** 08 10 차량 4(78라0004), 주행거리 없이 — 엔진오일 여유 */
const DATE_ONLY = { vehicleId: 4, asOf: '2026-11-24', inputMileage: null, items: [{ ...ENGINE_OIL, status: 'AHEAD', dueReason: null }, ...OTHER_ITEMS] }
/** 08 10 JSON 예시: 55,000 → 엔진오일 도래(KM, T8) */
const KM_55000 = { ...DATE_ONLY, inputMileage: 55000, items: [{ ...ENGINE_OIL, status: 'DUE', dueReason: 'KM' }, ...OTHER_ITEMS] }

let fetchMock
/** 경로 → 응답 함수 (부를 때마다 새 Response) */
let routes

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data) => () => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, fieldErrors = []) => () =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details: null } })

const BASE = '/api/vehicles/4/item-status'
const calls = () => fetchMock.mock.calls.map(([path]) => path)
const flush = () => act(() => vi.advanceTimersByTimeAsync(0))
const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))
const badges = () => Array.from(document.querySelectorAll('.item-status-list__row')).map((row) => row.querySelector('.item-status-list__name').textContent)
const firstRowText = () => document.querySelector('.item-status-list__row').textContent
const meta = () => document.querySelector('.visit-preview__meta')?.textContent ?? null
const state = () => document.querySelector('.visit-preview__state').textContent
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

beforeEach(() => {
  vi.useFakeTimers()
  routes = { [BASE]: ok(DATE_ONLY), [`${BASE}?mileage=55000`]: ok(KM_55000) }
  fetchMock = vi.fn((path) => routes[path]?.() ?? Promise.reject(new Error(`unexpected ${path}`)))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderPreview(mileage = '') {
  const handle = render(<VisitPreview vehicleId={4} mileage={mileage} />)
  return (next) => handle.rerender(<VisitPreview vehicleId={4} mileage={next} />)
}

describe('S-08 저장 전 미리보기', () => {
  it('처음엔 주행거리 없이 날짜 기준으로 부른다 — 기록되지 않음 표시, 6개 항목을 받은 순서대로', async () => {
    renderPreview()
    await flush()

    expect(calls()).toEqual([BASE])
    expect(document.querySelector('.visit-preview__chip').textContent).toBe('저장 전 미리보기 — 기록되지 않음')
    expect(document.querySelector('.visit-preview__title').textContent).toBe('확인이 필요한 항목')
    expect(meta()).toBe('판정 기준일 오늘(2026.11.24) · 날짜 기준만 — 주행거리를 넣으면 거리 기준도 봅니다. 방문일은 미리보기 기준을 바꾸지 않습니다.')
    expect(badges()).toEqual(['엔진오일', '에어클리너', '에어컨필터', '브레이크패드', '타이어 상태 점검', '배터리'])
    expect(document.querySelector('.status-badge').textContent).toBe('여유') // 엔진오일 (서버 값 그대로)
    expect(state()).toBe('최신')
  })

  it('시나리오 B(T8): 55,000을 넣으면 0.5초 뒤 ?mileage=55000 — 엔진오일이 km 근거로 도래', async () => {
    const setMileage = renderPreview()
    await flush()
    setMileage('55000')
    await wait(PREVIEW_DELAY_MS - 1)
    expect(calls()).toEqual([BASE])

    await wait(1)
    expect(calls()).toEqual([BASE, `${BASE}?mileage=55000`])
    expect(document.querySelector('.status-badge').textContent).toBe('도래')
    expect(firstRowText()).toContain('55,000 km (도래 근거)')
    expect(meta()).toContain('날짜 + 입력한 주행거리 55,000 km 기준')
  })

  it('입력 중에는 부르지 않고 멈춘 뒤 마지막 값만 부른다 (쉼표는 빼고 읽는다)', async () => {
    const setMileage = renderPreview()
    await flush()
    for (const text of ['5', '55', '55,0', '55,00', '55,000']) {
      setMileage(text)
      await wait(200)
    }
    await wait(PREVIEW_DELAY_MS)
    expect(calls()).toEqual([BASE, `${BASE}?mileage=55000`])
  })

  it('늦게 온 이전 응답은 버린다 — 이전 결과는 흐리게 둔 채 불러오는 중', async () => {
    let releaseSlow
    routes[`${BASE}?mileage=50000`] = () => new Promise((resolve) => (releaseSlow = () => resolve(jsonResponse(200, { success: true, data: { ...DATE_ONLY, inputMileage: 50000 }, error: null }))))
    const setMileage = renderPreview()
    await flush()

    setMileage('50000')
    await wait(PREVIEW_DELAY_MS)
    expect(state()).toBe('불러오는 중')
    expect(document.querySelector('.item-status-list').classList.contains('is-loading')).toBe(true)

    setMileage('55000')
    await wait(PREVIEW_DELAY_MS)
    expect(meta()).toContain('55,000 km')
    releaseSlow()
    await flush()
    expect(meta()).toContain('55,000 km')
    expect(firstRowText()).toContain('도래')
  })

  it('주행거리를 비우면 mileage 없이 다시 부른다(T11), 숫자가 아니면 부르지 않고 마지막 결과를 둔다', async () => {
    const setMileage = renderPreview('55000')
    await flush()
    expect(calls()).toEqual([`${BASE}?mileage=55000`])

    setMileage('55a')
    await wait(PREVIEW_DELAY_MS * 2)
    expect(calls()).toEqual([`${BASE}?mileage=55000`])
    expect(meta()).toContain('55,000 km')

    setMileage('')
    await wait(PREVIEW_DELAY_MS)
    expect(calls()).toEqual([`${BASE}?mileage=55000`, BASE])
    expect(meta()).toContain('날짜 기준만')
  })

  it('500·네트워크 실패는 저장에 영향 없다는 안내 + 사람이 누를 때만 다시 불러오기 (자동 재요청 없음, POL-125)', async () => {
    routes[BASE] = fail(500, 'INTERNAL_ERROR', '잠시 후 다시 시도해 주세요.')
    renderPreview()
    await flush()

    const notice = document.querySelector('.error-notice')
    expect(notice.textContent).toContain('미리보기를 불러오지 못했습니다.')
    expect(notice.textContent).toContain('기록 저장에는 영향이 없습니다.')
    expect(state()).toBe('불러오지 못함')
    await wait(10_000)
    expect(calls()).toEqual([BASE])

    routes[BASE] = ok(DATE_ONLY)
    click(button('다시 불러오기'))
    await flush()
    expect(calls()).toEqual([BASE, BASE])
    expect(document.querySelector('.error-notice')).toBeNull()
    expect(badges()).toHaveLength(6)
  })

  it('경계: 0·2,000,000(08 0.1)도 ?mileage=로 그대로 부른다', async () => {
    routes[`${BASE}?mileage=0`] = ok({ ...DATE_ONLY, inputMileage: 0 })
    routes[`${BASE}?mileage=2000000`] = ok({ ...DATE_ONLY, inputMileage: 2000000 })
    const setMileage = renderPreview()
    await flush()
    setMileage('0')
    await wait(PREVIEW_DELAY_MS)
    setMileage('2,000,000')
    await wait(PREVIEW_DELAY_MS)
    expect(calls()).toEqual([BASE, `${BASE}?mileage=0`, `${BASE}?mileage=2000000`])
    expect(meta()).toContain('2,000,000 km')
  })

  it('400(주행거리 범위 밖)은 서버의 칸 이유를 보이고 다시 불러오기 버튼이 없다 — 고치면 다시 부른다', async () => {
    routes[`${BASE}?mileage=2000001`] = fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [
      { field: 'mileage', reason: '0 이상 2,000,000 이하의 정수여야 합니다.' },
    ])
    const setMileage = renderPreview()
    await flush()
    setMileage('2000001')
    await wait(PREVIEW_DELAY_MS)

    const notice = document.querySelector('.error-notice').textContent
    expect(notice).toContain('미리보기를 불러오지 못했습니다.')
    expect(notice).toContain('0 이상 2,000,000 이하의 정수여야 합니다.')
    expect(notice).not.toContain('기록 저장에는 영향이 없습니다.')
    expect(button('다시 불러오기')).toBeUndefined()

    setMileage('55000')
    await wait(PREVIEW_DELAY_MS)
    expect(document.querySelector('.error-notice')).toBeNull()
    expect(firstRowText()).toContain('도래')
  })
})
