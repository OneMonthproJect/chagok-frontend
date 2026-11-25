import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

// 공통 모달 틀: 머리(제목·부제·닫기) + 내용 + 바닥(footer). M-01·M-02·M-03·차량 추가·수정·이력이 같은 틀을 쓴다.
// 접근성 (COMPONENT_SPEC STEP 06 useDialogA11y): 열리면 첫 입력 칸(또는 data-autofocus·initialFocus)에 초점,
// Tab은 모달 안에서만 돈다, Esc는 맨 위 모달만 닫는다, 닫히면 연 요소로 초점이 돌아간다.
// 닫기(Esc·× 버튼·바깥 누름)는 onClose만 부른다. 입력값을 지킬지(확인 후 닫기 등)는 쓰는 화면이 정한다.
// 사용: <Modal open={open} title="고객·차량 등록" onClose={close} footer={<Button onClick={save}>저장</Button>}>…</Modal>

const SIZES = ['md', 'lg']
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')
const FIELDS = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'

// 열린 순서대로 쌓는다. 키보드(Esc·Tab)는 맨 위 모달만 처리한다.
const openStack = []

export default function Modal({ open, ...props }) {
  if (!open) return null
  return <ModalDialog {...props} />
}

function ModalDialog({ title, subtitle, size = 'md', stacked = false, onClose, footer, children, initialFocus }) {
  const titleId = useId()
  const subtitleId = useId()
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const pressedOnBackdrop = useRef(false)
  // 효과는 열릴 때 한 번만 건다. 최신 콜백·초점 대상은 ref로 읽는다.
  const onCloseRef = useRef(onClose)
  const initialFocusRef = useRef(initialFocus)
  useEffect(() => {
    onCloseRef.current = onClose
    initialFocusRef.current = initialFocus
  })

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const entry = {}
    openStack.push(entry)

    const first =
      initialFocusRef.current?.current ??
      dialog.querySelector('[data-autofocus]') ??
      bodyRef.current?.querySelector(FIELDS) ??
      dialog.querySelector(FOCUSABLE) ??
      dialog
    first.focus()

    function onKeyDown(event) {
      if (openStack[openStack.length - 1] !== entry) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(dialog.querySelectorAll(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === firstItem || !dialog.contains(active) || active === dialog)) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && (active === lastItem || !dialog.contains(active))) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openStack.splice(openStack.indexOf(entry), 1)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  // 바깥(배경)에서 누르고 뗐을 때만 닫는다. 안에서 끌다가 밖에서 뗀 경우는 닫지 않는다.
  function handleBackdropMouseDown(event) {
    pressedOnBackdrop.current = event.target === event.currentTarget
  }
  function handleBackdropClick(event) {
    if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose?.()
    pressedOnBackdrop.current = false
  }

  const sizeClass = SIZES.includes(size) ? size : 'md'
  return createPortal(
    <div
      className={`modal-backdrop${stacked ? ' modal-backdrop--stacked' : ''}`}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`modal modal--${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
      >
        <div className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">{title}</h2>
            {subtitle && <p id={subtitleId} className="modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="modal__close" aria-label="닫기" onClick={() => onClose?.()}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div ref={bodyRef} className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
