// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MESSAGES, NETWORK_ERROR } from '@/shared/api/client'
import { cleanup, click, render } from '@/shared/lib/domTest'
import AddVehicleInline from './AddVehicleInline.jsx'

// S-06 차량 추가 (#21 할 일: 차종 누락 400 표시, 입력 유지, 중복 제출 방지, 추가 뒤 알림). 09 S-06, 08 08, 05 POL-120·125.
// fetch만 대역으로 바꾸고 client.ts의 실제 해석·오류 처리를 거친다.

let fetchMock
let onAdded
let onCancel

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  onAdded = vi.fn()
  onCancel = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

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

const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)
const settle = () => act(async () => {})

function renderForm() {
  render(<AddVehicleInline customerId={10} onAdded={onAdded} onCancel={onCancel} />)
}

const invalidModel = () =>
  jsonResponse(400, {
    success: false,
    data: null,
    error: {
      code: 'INVALID_INPUT',
      message: '입력값이 올바르지 않습니다.',
      fieldErrors: [{ field: 'model', reason: '필수 입력입니다.' }],
      details: null,
    },
  })

describe('AddVehicleInline (S-06 차량 추가)', () => {
  it('열면 첫 칸에 초점이 가고, 연식·주행거리는 선택이다', () => {
    renderForm()
    expect(document.activeElement).toBe(field('차량번호'))
    expect(document.body.textContent).toContain('연식과 주행거리는 정비 시작 때 입력해도 됩니다.')
  })

  it('저장하면 08 08로 보내고(차량번호 공백 제거, 빈 선택 칸은 null) 끝나면 onAdded', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { customerId: 10, vehicleId: 99 }, error: null }))
    renderForm()
    type(field('차량번호'), '12 가 3456')
    type(field('차종'), ' 아반떼 ')
    click(button('추가'))
    await settle()

    expect(posts()).toHaveLength(1)
    expect(posts()[0][0]).toBe('/api/customers/10/vehicles')
    expect(JSON.parse(posts()[0][1].body)).toEqual({ plateNumber: '12가3456', model: '아반떼', modelYear: null, mileage: null })
    expect(onAdded).toHaveBeenCalledTimes(1)
  })

  it('차종을 비우면 요청 없이 칸 아래에 필수 문구', async () => {
    renderForm()
    type(field('차량번호'), '12가3456')
    click(button('추가'))
    await settle()

    expect(posts()).toHaveLength(0)
    expect(field('차종').getAttribute('aria-invalid')).toBe('true')
    expect(document.body.textContent).toContain('필수 입력입니다.')
    expect(document.activeElement).toBe(field('차종'))
  })

  it('서버 400 fieldErrors(차종 누락)를 칸 아래에 보이고 입력값은 그대로 둔다', async () => {
    fetchMock.mockResolvedValue(invalidModel())
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼') // 클라이언트 검사는 통과시키고 서버 400만 확인
    click(button('추가'))
    await settle()

    expect(posts()).toHaveLength(1)
    expect(field('차종').getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(`${field('차종').id}-error`).textContent).toContain('필수 입력입니다.')
    expect(field('차량번호').value).toBe('12가3456')
    expect(field('차종').value).toBe('아반떼')
    expect(onAdded).not.toHaveBeenCalled()
  })

  it('서버 400의 modelYear(상한, 접두 없음)는 연식 칸 아래에 붙는다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: '입력값이 올바르지 않습니다.',
          fieldErrors: [{ field: 'modelYear', reason: '2027년까지 입력할 수 있습니다.' }],
          details: null,
        },
      }),
    )
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    click(button('추가'))
    await settle()

    expect(document.getElementById(`${field('연식').id}-error`).textContent).toContain('2027년까지 입력할 수 있습니다.')
    expect(field('차종').getAttribute('aria-invalid')).toBeNull()
  })

  it('칸에 붙일 수 없는 400은 위 안내로 보이고 입력은 유지한다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: '요청 형식이 올바르지 않습니다.', fieldErrors: [], details: null },
      }),
    )
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    click(button('추가'))
    await settle()

    expect(document.body.textContent).toContain('요청 형식이 올바르지 않습니다.')
    expect(field('차종').value).toBe('아반떼')
    expect(onAdded).not.toHaveBeenCalled()
  })

  it('404(그 사이 사라진 고객)는 위 오류 안내로 보이고 목록 갱신(onAdded)을 하지 않는다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: '찾을 수 없습니다.', fieldErrors: [], details: null },
      }),
    )
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    click(button('추가'))
    await settle()

    expect(document.body.textContent).toContain('찾을 수 없습니다.')
    expect(field('차량번호').value).toBe('12가3456')
    expect(onAdded).not.toHaveBeenCalled()
  })

  it('네트워크 실패여도 입력값을 유지하고, 자동 재전송 없이 사람이 누르는 다시 시도만 있다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    type(field('연식'), '2020')
    type(field('주행거리'), '12,000')
    click(button('추가'))
    await settle()

    expect(posts()).toHaveLength(1)
    expect(field('차량번호').value).toBe('12가3456')
    expect(field('연식').value).toBe('2020')
    expect(field('주행거리').value).toBe('12,000')
    expect(DEFAULT_MESSAGES[NETWORK_ERROR]).toBeTruthy()
    expect(document.body.textContent).toContain(DEFAULT_MESSAGES[NETWORK_ERROR])
    expect(onAdded).not.toHaveBeenCalled()
    expect(button('다시 시도')).toBeDefined()
    await settle()
    expect(posts()).toHaveLength(1)
  })

  it('저장 중에는 버튼이 비활성이고 두 번 눌러도 한 번만 보낸다 (POL-120)', async () => {
    let resolve
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
    renderForm()
    type(field('차량번호'), '12가3456')
    type(field('차종'), '아반떼')
    const submit = button('추가')
    click(submit)
    click(submit)

    expect(posts()).toHaveLength(1)
    expect(submit.disabled).toBe(true) // 저장 중에는 비활성("저장 중…")

    await act(async () => {
      resolve(jsonResponse(200, { success: true, data: { customerId: 10, vehicleId: 99 }, error: null }))
    })
    expect(posts()).toHaveLength(1)
    expect(onAdded).toHaveBeenCalledTimes(1)
  })

  it('[취소]는 onCancel만 부르고 요청하지 않는다', async () => {
    renderForm()
    click(button('취소'))
    await settle() // Button이 onClick을 비동기로 실행한다
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(posts()).toHaveLength(0)
  })
})
