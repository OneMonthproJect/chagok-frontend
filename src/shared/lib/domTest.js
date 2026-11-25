// 테스트 전용: jsdom 환경(`// @vitest-environment jsdom`) 테스트에서 React 컴포넌트를 그리고 누른다.
// 운영 코드에서 import하지 않는다. 추가 패키지 없이 react-dom/client + act만 쓴다.
import { act } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mounted = new Set()

export function render(ui) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(ui))
  const handle = {
    container,
    rerender(next) {
      act(() => root.render(next))
    },
    unmount() {
      if (!mounted.has(handle)) return
      mounted.delete(handle)
      act(() => root.unmount())
      container.remove()
    },
  }
  mounted.add(handle)
  return handle
}

/** afterEach에서 부른다: 그린 것을 모두 지우고 body를 비운다 */
export function cleanup() {
  for (const handle of [...mounted]) handle.unmount()
  document.body.innerHTML = ''
}

/** 사람이 누른 것처럼 mousedown → click */
export function click(element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    element.click()
  })
}

/** 지금 초점이 있는 요소(없으면 body)에서 키를 누른다 */
export function keyDown(key, options = {}) {
  const target = document.activeElement ?? document.body
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }))
  })
}
