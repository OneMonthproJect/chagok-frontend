// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Button from '@/shared/ui/Button.jsx'
import { cleanup, render } from '@/shared/lib/domTest'

// 기존 기능 호환(POL-120 잠금·aria-busy·기존 props) + v3 보완(variant·size·loading·진행 표시)

afterEach(cleanup)

function button(view) {
  return view.container.querySelector('button')
}

describe('Button 기존 동작 호환', () => {
  it('기본은 type=button, class "button"(primary)', () => {
    const el = button(render(<Button>저장</Button>))
    expect(el.getAttribute('type')).toBe('button')
    expect(el.className).toBe('button')
    expect(el.getAttribute('aria-busy')).toBe('false')
    expect(el.textContent).toBe('저장')
  })

  it('secondary는 이전과 같은 class, 다른 props는 그대로 넘긴다', () => {
    const el = button(render(<Button variant="secondary" type="submit" name="close" disabled>닫기</Button>))
    expect(el.className).toBe('button button--secondary')
    expect(el.getAttribute('type')).toBe('submit')
    expect(el.getAttribute('name')).toBe('close')
    expect(el.disabled).toBe(true)
  })

  it('요청 중에는 비활성 + aria-busy + 진행 문구, 두 번 눌러도 onClick은 한 번 (POL-120)', async () => {
    let finish
    const onClick = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const view = render(<Button onClick={onClick} pendingText="저장 중…">저장</Button>)
    const el = button(view)

    act(() => {
      el.click()
      el.click()
    })
    await act(async () => {})
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('aria-busy')).toBe('true')
    expect(el.textContent).toBe('저장 중…')
    expect(el.querySelector('.button__spinner')?.getAttribute('aria-hidden')).toBe('true')

    await act(async () => finish())
    expect(el.disabled).toBe(false)
    expect(el.getAttribute('aria-busy')).toBe('false')
    expect(el.textContent).toBe('저장')
  })

  it('실패해도 잠금이 풀려 다시 누를 수 있다 (자동 재전송 없음, POL-125)', async () => {
    const onClick = vi.fn(() => Promise.reject(new Error('fail')))
    const el = button(render(<Button onClick={onClick}>저장</Button>))
    await act(async () => el.click())
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(el.disabled).toBe(false)
  })
})

describe('Button v3 보완', () => {
  it.each([
    ['ghost', 'md', 'button button--ghost'],
    ['danger', 'md', 'button button--danger'],
    ['primary', 'sm', 'button button--sm'],
    ['secondary', 'lg', 'button button--secondary button--lg'],
    ['unknown', 'xl', 'button'],
  ])('variant=%s size=%s → class "%s"', (variant, size, expected) => {
    const el = button(render(<Button variant={variant} size={size}>버튼</Button>))
    expect(el.className).toBe(expected)
  })

  it('loading이면 onClick 없이도 비활성 + aria-busy + 진행 문구', () => {
    const el = button(render(<Button type="submit" loading pendingText="로그인 중…">로그인</Button>))
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('aria-busy')).toBe('true')
    expect(el.textContent).toBe('로그인 중…')
  })
})
