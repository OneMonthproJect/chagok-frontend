// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Modal from '@/shared/ui/Modal.jsx'
import { cleanup, click, keyDown, render } from '@/shared/lib/domTest'

// Modal 닫기·초점 (#18 테스트, COMPONENT_SPEC STEP 06 useDialogA11y)

afterEach(cleanup)

const dialogs = () => document.querySelectorAll('[role="dialog"]')

function Form({ onClose, open = true, ...rest }) {
  return (
    <Modal open={open} title="고객·차량 등록" subtitle="필수 칸을 채워 주세요" onClose={onClose} footer={<button type="button">저장</button>} {...rest}>
      <input aria-label="고객명" />
      <input aria-label="연락처" />
    </Modal>
  )
}

describe('Modal 열기', () => {
  it('open=false면 그리지 않는다', () => {
    render(<Form open={false} onClose={() => {}} />)
    expect(dialogs()).toHaveLength(0)
  })

  it('dialog 역할·aria-modal·제목 연결을 갖고 body에 그린다', () => {
    render(<Form onClose={() => {}} />)
    const dialog = dialogs()[0]
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'))
    expect(title.textContent).toBe('고객·차량 등록')
    const subtitle = document.getElementById(dialog.getAttribute('aria-describedby'))
    expect(subtitle.textContent).toBe('필수 칸을 채워 주세요')
    expect(dialog.closest('.modal-backdrop').parentElement).toBe(document.body)
  })

  it('열리면 닫기 버튼이 아니라 첫 입력 칸에 초점을 둔다', () => {
    render(<Form onClose={() => {}} />)
    expect(document.activeElement.getAttribute('aria-label')).toBe('고객명')
  })

  it('data-autofocus가 있으면 그 요소에 초점을 둔다', () => {
    render(
      <Modal open title="t" onClose={() => {}}>
        <input aria-label="a" />
        <input aria-label="b" data-autofocus />
      </Modal>,
    )
    expect(document.activeElement.getAttribute('aria-label')).toBe('b')
  })
})

describe('Modal 닫기', () => {
  it('Esc를 누르면 onClose', () => {
    const onClose = vi.fn()
    render(<Form onClose={onClose} />)
    keyDown('Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('× 닫기 버튼을 누르면 onClose', () => {
    const onClose = vi.fn()
    render(<Form onClose={onClose} />)
    click(document.querySelector('button[aria-label="닫기"]'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('바깥(배경)을 누르면 onClose, 안을 누르면 닫지 않는다', () => {
    const onClose = vi.fn()
    render(<Form onClose={onClose} />)
    click(dialogs()[0])
    click(document.querySelector('input'))
    expect(onClose).not.toHaveBeenCalled()
    click(document.querySelector('.modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('겹쳐 열면 Esc는 맨 위 모달만 닫는다', () => {
    const lower = vi.fn()
    const upper = vi.fn()
    render(
      <>
        <Modal open title="예약 등록" onClose={lower}>
          <input aria-label="차량" />
        </Modal>
        <Modal open stacked title="고객·차량 등록" onClose={upper}>
          <input aria-label="고객명" />
        </Modal>
      </>,
    )
    expect(document.querySelector('.modal-backdrop--stacked')).not.toBeNull()
    keyDown('Escape')
    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
  })

  it('닫히면 연 요소로 초점이 돌아간다', () => {
    function Screen({ open }) {
      return (
        <>
          <button type="button">신규 등록</button>
          <Form open={open} onClose={() => {}} />
        </>
      )
    }
    const view = render(<Screen open={false} />)
    const opener = view.container.querySelector('button')
    opener.focus()
    view.rerender(<Screen open />)
    expect(document.activeElement.getAttribute('aria-label')).toBe('고객명')
    view.rerender(<Screen open={false} />)
    expect(dialogs()).toHaveLength(0)
    expect(document.activeElement).toBe(opener)
  })
})

describe('Modal 초점 가두기 (Tab)', () => {
  it('마지막 요소에서 Tab → 처음, 처음에서 Shift+Tab → 마지막', () => {
    render(<Form onClose={() => {}} />)
    const focusables = dialogs()[0].querySelectorAll('button, input')
    const first = focusables[0] // × 닫기
    const last = focusables[focusables.length - 1] // 저장
    last.focus()
    keyDown('Tab')
    expect(document.activeElement).toBe(first)
    keyDown('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
