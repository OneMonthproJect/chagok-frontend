// @vitest-environment jsdom
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerDetailPage from './CustomerDetailPage.jsx'

// S-06 고객 수정 (#32, 04 F-CUS-06, 08 22, 05 POL-120·124·125): [수정] → 인라인 입력, 07에서 읽은 version + 바꾼 칸만 보내기,
// 저장 뒤 07 다시 불러오기, 409 → 07 다시 불러와 최신 값 + 고친 칸 유지(손대지 않은 칸은 최신 값) + 다음 저장은 새 version, 400 fieldErrors는 칸 아래(입력 유지),
// 저장 중 비활성·두 번 눌러도 한 번, 바꾼 칸 없으면 요청 없음, S-05 M-01 "기존 고객 수정"(state.openEdit)으로 연 채 시작

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
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data) => jsonResponse(200, { success: true, data, error: null })
const fail = (status, code, message, fieldErrors = []) =>
  jsonResponse(status, { success: false, data: null, error: { code, message, fieldErrors, details: null } })

/** 08 07 JSON 예시 */
const OH = {
  customerId: 10,
  name: '오세훈',
  phone: '010-0000-0010',
  consent: true,
  version: 0,
  vehicles: [{ vehicleId: 10, plateNumber: '55차0010', model: '쏘나타', modelYear: 2018, latestMileage: 97000, dueCount: 0, soonCount: 1 }],
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
const form = () => document.querySelector('form[aria-label="고객 수정"]')
const calls = () => fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}${init.body ? ` ${init.body}` : ''}`)

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

const consentBox = () => form().querySelector('input[type="checkbox"]')

/** 07은 차례대로 details를, 22는 patch()가 준 응답을 */
function serve(details, patch) {
  let index = 0
  fetchMock.mockImplementation((url, init) => {
    if (init.method === 'PATCH') return patch()
    const detail = details[Math.min(index, details.length - 1)]
    index += 1
    return ok(detail)
  })
}

async function openEdit() {
  renderPage()
  await settle()
  click(button('수정'))
  await settle()
}

describe('S-06 고객 수정 (#32)', () => {
  it('[수정]을 누르면 지금 값(전체 연락처·동의)으로 입력이 열리고, 그 버튼은 사라진다', async () => {
    serve([OH])
    await openEdit()
    expect(form()).not.toBeNull()
    expect(field('고객명').value).toBe('오세훈')
    expect(field('연락처').value).toBe('010-0000-0010')
    expect(consentBox().checked).toBe(true)
    expect(button('수정')).toBeUndefined()
  })

  it('동의만 해제하고 저장하면 22에 읽은 version + consent만 보내고, 07을 다시 불러오며 입력은 닫힌다', async () => {
    serve([OH, { ...OH, consent: false, version: 1 }], () => ok({ customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: false, version: 1 }))
    await openEdit()
    click(consentBox())
    click(button('저장'))
    await settle()

    expect(calls()).toEqual(['GET /api/customers/10', 'PATCH /api/customers/10 {"version":0,"consent":false}', 'GET /api/customers/10'])
    expect(form()).toBeNull()
    expect(document.querySelector('.customer-info').textContent).toContain('안내 수신 미동의')
  })

  it('409 동시 수정: 07을 다시 불러와 위 카드에 최신 값, 입력은 그대로, 다음 저장은 새 version (자동 재전송 없음)', async () => {
    const latest = { ...OH, name: '오세훈2', phone: '010-9999-0010', version: 3 }
    let patches = 0
    serve([OH, latest], () => {
      patches += 1
      return patches === 1
        ? fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.')
        : ok({ customerId: 10, name: '오세현', phone: '010-9999-0010', consent: true, version: 4 })
    })
    await openEdit()
    type(field('고객명'), '오세현')
    click(button('저장'))
    await settle()

    expect(calls()).toEqual(['GET /api/customers/10', 'PATCH /api/customers/10 {"version":0,"name":"오세현"}', 'GET /api/customers/10'])
    expect(document.body.textContent).toContain('다른 직원이 먼저 수정했습니다.')
    expect(document.querySelector('.customer-info h2').textContent).toBe('오세훈2') // 최신 값
    expect(document.querySelector('.customer-info').textContent).toContain('010-9999-0010')
    expect(field('고객명').value).toBe('오세현') // 입력 유지
    expect(field('연락처').value).toBe('010-9999-0010') // 손대지 않은 칸은 최신 값으로(옛 값으로 덮어쓰지 않게)

    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(3) // 자동으로 다시 보내지 않음

    // 사람이 다시 저장: 다시 불러온 version 3, 최신 값과 다른 칸(고친 이름)만
    click(button('저장'))
    await settle()
    expect(calls()[3]).toBe('PATCH /api/customers/10 {"version":3,"name":"오세현"}')
  })

  it('409 뒤 07을 다시 받는 동안에는 [저장]이 비활성 — 옛 version으로 다시 보내지 않는다', async () => {
    let resolveReload
    let gets = 0
    fetchMock.mockImplementation((url, init) => {
      if (init.method === 'PATCH') return fail(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.')
      gets += 1
      return gets === 1 ? ok(OH) : new Promise((resolve) => (resolveReload = resolve))
    })
    await openEdit()
    type(field('고객명'), '오세현')
    click(button('저장'))
    await settle()

    const save = () => Array.from(form().querySelectorAll('button')).find((b) => b.type === 'submit')
    expect(save().disabled).toBe(true)
    act(() => form().requestSubmit())
    await settle()
    expect(calls().filter((c) => c.startsWith('PATCH'))).toHaveLength(1)

    await act(async () => resolveReload(new Response(JSON.stringify({ success: true, data: { ...OH, version: 1 }, error: null }), { status: 200 })))
    await settle()
    expect(save().disabled).toBe(false)
  })

  it('400 fieldErrors는 그 칸 아래에, 입력값은 그대로', async () => {
    serve([OH], () => fail(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'phone', reason: '9~20자로 입력해 주세요.' }]))
    await openEdit()
    type(field('연락처'), '010-123-45678')
    click(button('저장'))
    await settle()

    const phone = field('연락처')
    expect(phone.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(`${phone.id}-error`).textContent).toContain('9~20자로 입력해 주세요.')
    expect(phone.value).toBe('010-123-45678')
    expect(form()).not.toBeNull()
  })

  it('저장 중에는 버튼이 비활성이고 두 번 눌러도 22는 한 번 (POL-120)', async () => {
    let resolvePatch
    serve([OH], () => new Promise((resolve) => (resolvePatch = resolve)))
    await openEdit()
    click(consentBox())
    click(button('저장'))
    await settle()
    const save = Array.from(form().querySelectorAll('button')).find((b) => b.type === 'submit')
    expect(save.disabled).toBe(true)
    act(() => form().requestSubmit())
    await settle()
    expect(calls().filter((c) => c.startsWith('PATCH'))).toHaveLength(1)

    resolvePatch(new Response(JSON.stringify({ success: true, data: { ...OH, consent: false, version: 1 }, error: null }), { status: 200 }))
    await settle()
  })

  it('네트워크 실패: 입력 유지, 위에 안내 — 다시 시도는 사람이 누를 때만 (POL-125)', async () => {
    serve([OH], () => Promise.reject(new TypeError('Failed to fetch')))
    await openEdit()
    type(field('고객명'), '오세현')
    click(button('저장'))
    await settle()
    await settle()

    expect(document.body.textContent).toContain('서버에 연결하지 못했습니다.')
    expect(field('고객명').value).toBe('오세현')
    expect(calls().filter((c) => c.startsWith('PATCH'))).toHaveLength(1)
  })

  it('바꾼 칸이 없으면 22를 부르지 않고 닫는다', async () => {
    serve([OH])
    await openEdit()
    click(button('저장'))
    await settle()
    expect(calls()).toEqual(['GET /api/customers/10'])
    expect(form()).toBeNull()
  })

  it('이름을 비우면 보내지 않고 칸 아래 문구, 취소하면 닫힌다', async () => {
    serve([OH])
    await openEdit()
    type(field('고객명'), ' ')
    click(button('저장'))
    await settle()
    expect(document.getElementById(`${field('고객명').id}-error`).textContent).toContain('필수 입력입니다.')
    expect(calls()).toEqual(['GET /api/customers/10'])

    click(button('취소'))
    await settle()
    expect(form()).toBeNull()
  })

  it('S-05 M-01 "기존 고객 수정"(state.openEdit)으로 오면 입력을 연 채 시작한다', async () => {
    serve([OH])
    renderPage({ pathname: '/customers/10', state: { openEdit: true } })
    await settle()
    expect(form()).not.toBeNull()
    expect(field('고객명').value).toBe('오세훈')
  })
})
