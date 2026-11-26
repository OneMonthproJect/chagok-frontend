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

describe('Modal 경계 (리뷰 반영)', () => {
  it('onClose가 없으면 × 버튼을 그리지 않는다 (연결 안 된 버튼 없음)', () => {
    render(
      <Modal open title="안내">
        <p>내용</p>
      </Modal>,
    )
    expect(document.querySelector('button[aria-label="닫기"]')).toBeNull()
  })

  it('한글 조합 중 Esc는 모달을 닫지 않는다', () => {
    const onClose = vi.fn()
    render(<Form onClose={onClose} />)
    keyDown('Escape', { isComposing: true })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('안의 칸이 React autoFocus를 써도 닫히면 연 요소로 초점이 돌아간다', () => {
    function Screen({ open }) {
      return (
        <>
          <button type="button">신규 등록</button>
          <Modal open={open} title="t" onClose={() => {}}>
            <input aria-label="고객명" autoFocus />
          </Modal>
        </>
      )
    }
    const view = render(<Screen open={false} />)
    const opener = view.container.querySelector('button')
    opener.focus()
    view.rerender(<Screen open />)
    view.rerender(<Screen open={false} />)
    expect(document.activeElement).toBe(opener)
  })

  it('tabindex="-1" 요소는 Tab 순서에서 빼고 마지막 칸을 판정한다', () => {
    render(
      <Modal open title="비밀번호" onClose={() => {}}>
        <input aria-label="비밀번호" />
        <button type="button" tabIndex={-1}>보기</button>
      </Modal>,
    )
    const input = document.querySelector('input')
    input.focus()
    keyDown('Tab')
    expect(document.activeElement.getAttribute('aria-label')).toBe('닫기')
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

describe('Modal 숨김·비활성 요소 제외 (#18 후속, CodeRabbit)', () => {
  it('처음 초점은 숨겨진 칸(hidden·display:none)·비활성 fieldset 안 칸을 건너뛴다', () => {
    render(
      <Modal open title="t" onClose={() => {}}>
        <div hidden>
          <input aria-label="숨김1" />
        </div>
        <div style={{ display: 'none' }}>
          <input aria-label="숨김2" />
        </div>
        <fieldset disabled>
          <input aria-label="비활성" />
        </fieldset>
        <input aria-label="보이는 칸" />
      </Modal>,
    )
    expect(document.activeElement.getAttribute('aria-label')).toBe('보이는 칸')
  })

  it('맨 뒤의 숨겨진 버튼은 Tab 순환의 마지막 요소로 보지 않는다', () => {
    render(
      <Modal open title="t" onClose={() => {}} footer={<><button type="button">저장</button><button type="button" style={{ visibility: 'hidden' }}>숨김</button></>}>
        <input aria-label="칸" />
      </Modal>,
    )
    const save = [...document.querySelectorAll('button')].find((b) => b.textContent === '저장')
    save.focus()
    keyDown('Tab')
    expect(document.activeElement.getAttribute('aria-label')).toBe('닫기')
  })

  it('보일 후보가 없으면 dialog 자체에 초점을 둔다', () => {
    render(
      <Modal open title="안내">
        <div hidden>
          <button type="button">숨김</button>
        </div>
      </Modal>,
    )
    expect(document.activeElement.getAttribute('role')).toBe('dialog')
  })
})

describe('Modal 겹친 모달의 초점 복귀 (#18 후속, CodeRabbit)', () => {
  // 배경 버튼 → 모달 A → A 안의 버튼 → 모달 B 순서로 연다
  function Screen({ a, b }) {
    return (
      <>
        <button type="button">배경</button>
        <Modal open={a} title="A" onClose={() => {}}>
          <button type="button">B 열기</button>
        </Modal>
        <Modal open={b} stacked title="B" onClose={() => {}}>
          <input aria-label="B 칸" />
        </Modal>
      </>
    )
  }

  function openBoth() {
    const view = render(<Screen a={false} b={false} />)
    const background = view.container.querySelector('button')
    background.focus()
    view.rerender(<Screen a b={false} />)
    const openB = [...document.querySelectorAll('button')].find((x) => x.textContent === 'B 열기')
    openB.focus()
    view.rerender(<Screen a b />)
    expect(document.activeElement.getAttribute('aria-label')).toBe('B 칸')
    return { view, background, openB }
  }

  it('위 모달(B)을 닫으면 A 안의 연 버튼으로 돌아간다', () => {
    const { view, openB } = openBoth()
    view.rerender(<Screen a b={false} />)
    expect(document.activeElement).toBe(openB)
  })

  it('아래 모달(A)만 닫히면 초점은 위 모달(B)에 그대로 있다', () => {
    const { view } = openBoth()
    view.rerender(<Screen a={false} b />)
    expect(document.activeElement.getAttribute('aria-label')).toBe('B 칸')
  })

  it('A가 먼저 닫힌 뒤 B를 닫으면 배경의 원래 버튼으로 돌아간다', () => {
    const { view, background } = openBoth()
    view.rerender(<Screen a={false} b />)
    view.rerender(<Screen a={false} b={false} />)
    expect(document.activeElement).toBe(background)
  })

  it('위 모달의 연 요소가 남은 모달 밖이면 남은 모달 안으로 초점을 옮긴다', () => {
    const view = render(<Screen a={false} b={false} />)
    view.container.querySelector('button').focus()
    view.rerender(<Screen a b />) // 둘 다 배경에서 열림
    view.rerender(<Screen a b={false} />)
    const dialogA = document.querySelector('[role="dialog"]')
    expect(dialogA.contains(document.activeElement)).toBe(true)
  })
})
