// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MESSAGES, NETWORK_ERROR } from '@/shared/api/client'
import { cleanup, click, render } from '@/shared/lib/domTest'
import CustomerVehicleFormModal from './CustomerVehicleFormModal.jsx'

// M-01 (#19 할 일: 동의 기본 미체크, 차종 누락 400 표시, 중복 제출 방지, 네트워크 실패 입력 보존).
// fetch만 대역으로 바꾸고 client.ts의 실제 해석·오류 처리를 거친다.

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
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

/** 라벨 글자로 입력 칸 찾기 (FormField가 label[for]로 잇는다) */
function field(labelText) {
  const label = Array.from(document.querySelectorAll('label')).find((l) => l.textContent.replace('*', '').trim() === labelText)
  return document.getElementById(label.htmlFor)
}

/** React 제어 입력에 사람이 친 것처럼 값 넣기 */
function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

/** 대기 중인 Promise·상태 갱신을 끝까지 */
const settle = () => act(async () => {})

function fillRequired() {
  type(field('고객명'), '홍길동')
  type(field('연락처'), '010-1234-5678')
  type(field('차량번호'), '12가 3456')
  type(field('차종'), '아반떼')
}

function renderModal(props = {}) {
  const onCreated = vi.fn()
  const onClose = vi.fn()
  render(<CustomerVehicleFormModal onCreated={onCreated} onClose={onClose} {...props} />)
  return { onCreated, onClose }
}

describe('M-01 처음 상태', () => {
  it('안내 수신 동의는 체크 안 됨이 기본 (D-11), 검색어는 알맞은 칸에', () => {
    renderModal({ initialQuery: '홍길동' })
    const consent = document.querySelector('input[type="checkbox"]')
    expect(consent.checked).toBe(false)
    expect(field('고객명').value).toBe('홍길동')
    expect(document.body.textContent).toContain('고객에게 물어보고 체크하세요')
    expect(document.body.textContent).toContain('연식과 주행거리는 정비 시작 때 입력해도 됩니다.')
  })
})

describe('M-01 저장', () => {
  it('차종을 비우고 등록하면 보내지 않고 차종 칸 아래에 문구', async () => {
    renderModal()
    type(field('고객명'), '홍길동')
    type(field('연락처'), '010-1234-5678')
    type(field('차량번호'), '12가3456')
    click(button('등록'))
    await settle()
    expect(posts()).toHaveLength(0)
    expect(field('차종').getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(`${field('차종').id}-error`).textContent).toContain('필수 입력입니다.')
  })

  it('서버 400 fieldErrors(vehicle.model)를 차종 칸 아래에, 입력값은 그대로', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: '입력값을 확인해 주세요.',
          fieldErrors: [{ field: 'vehicle.model', reason: '50자 이하로 입력해 주세요.' }],
          details: null,
        },
      }),
    )
    renderModal()
    fillRequired()
    click(button('등록'))
    await settle()
    expect(posts()).toHaveLength(1)
    expect(document.getElementById(`${field('차종').id}-error`).textContent).toContain('50자 이하로 입력해 주세요.')
    expect(field('고객명').value).toBe('홍길동')
    expect(field('차량번호').value).toBe('12가 3456')
  })

  it('저장 중에는 버튼이 비활성이고 두 번 눌러도 요청은 한 번 (POL-120)', async () => {
    let finish
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { onCreated } = renderModal()
    fillRequired()
    const save = button('등록')
    click(save)
    click(save)
    await settle()
    expect(posts()).toHaveLength(1)
    const pending = Array.from(document.querySelectorAll('button[type="submit"]'))[0]
    expect(pending.disabled).toBe(true)

    finish(jsonResponse(200, { success: true, data: { customerId: 12, vehicleId: 13 }, error: null }))
    await settle()
    expect(onCreated).toHaveBeenCalledWith({ customerId: 12, vehicleId: 13, name: '홍길동', plateNumber: '12가3456' })
    const body = JSON.parse(posts()[0][1].body)
    expect(body).toEqual({
      name: '홍길동',
      phone: '010-1234-5678',
      consent: false,
      vehicle: { plateNumber: '12가3456', model: '아반떼', modelYear: null, mileage: null },
    })
  })

  it('네트워크 실패: 입력값 유지, 위에 안내, 자동 재전송 없음 — 다시 시도는 사람이 누를 때만 (POL-125)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { onCreated } = renderModal()
    fillRequired()
    type(field('연식'), '2020')
    click(button('등록'))
    await settle()

    expect(posts()).toHaveLength(1)
    expect(onCreated).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alert"]').textContent).toContain(DEFAULT_MESSAGES[NETWORK_ERROR])
    expect(field('고객명').value).toBe('홍길동')
    expect(field('연락처').value).toBe('010-1234-5678')
    expect(field('차종').value).toBe('아반떼')
    expect(field('연식').value).toBe('2020')

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(posts()).toHaveLength(1)

    click(button('다시 시도'))
    await settle()
    expect(posts()).toHaveLength(2)
  })
})

describe('M-01 같은 연락처·차량번호 기존 고객', () => {
  const existing = {
    success: true,
    data: {
      items: [
        { customerId: 10, name: '오세훈', phone: '010-0000-0010', consent: true, vehicles: [{ vehicleId: 10, plateNumber: '55차0010' }] },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    },
    error: null,
  }

  it('연락처 칸을 벗어나면 05로 찾아 위에 보이고, 연결한 행동만 버튼으로', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, existing)))
    const onPick = vi.fn()
    renderModal({ onPick, pickKinds: ['add'] })
    type(field('연락처'), '010-0000-0010')
    act(() => field('연락처').dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    await settle()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers?q=010-0000-0010')
    expect(document.body.textContent).toContain('이미 있는 고객이면 고르세요')
    expect(document.body.textContent).toContain('같은 연락처')
    expect(button('차량 보기')).toBeUndefined()
    click(button('이 고객에 차량 추가'))
    await settle()
    expect(onPick).toHaveBeenCalledWith({ kind: 'add', customerId: 10 })
  })

  it('행동을 연결하지 않은 화면에서는 안내만 (버튼 없음)', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, existing)))
    renderModal()
    type(field('연락처'), '010-0000-0010')
    act(() => field('연락처').dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    await settle()
    expect(document.body.textContent).toContain('이미 있는 고객이면 고르세요')
    expect(button('이 고객에 차량 추가')).toBeUndefined()
  })
})
