import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

// 공통 모달 틀: 머리(제목·부제·닫기) + 내용 + 바닥(footer). M-01·M-02·M-03·차량 추가·수정·이력이 같은 틀을 쓴다.
// 접근성 (COMPONENT_SPEC STEP 06 useDialogA11y): 열리면 첫 입력 칸(또는 data-autofocus·initialFocus)에 초점,
// Tab은 모달 안에서만 돈다(숨김·비활성 요소 제외), Esc는 맨 위 모달만 닫는다, 닫히면 연 요소로 초점이 돌아간다.
// 겹친 모달: 위 모달이 남아 있으면 배경으로 초점을 옮기지 않는다(아래 모달만 닫히면 초점 유지, 위 모달을 닫으면 남은 모달 안으로).
// 닫기(Esc·× 버튼·바깥 누름)는 onClose만 부른다. 입력값을 지킬지(확인 후 닫기 등)는 쓰는 화면이 정한다.
// onClose가 없으면 × 버튼을 그리지 않는다(연결 안 된 버튼 없음). 처음 초점은 React autoFocus 대신 data-autofocus·initialFocus로 준다.
// 사용: <Modal open={open} title="고객·차량 등록" onClose={close} footer={<Button onClick={save}>저장</Button>}>…</Modal>

const SIZES = ['md', 'lg']
// Tab 순서에 들어가는 요소만 (tabindex="-1"은 빼서 마지막 칸 판정이 어긋나지 않게)
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(',')
const FIELDS = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'

// 초점을 실제로 받을 수 있는 요소만 후보로 둔다: 숨김(hidden·inert·display:none·visibility:hidden)과
// 비활성(:disabled, 비활성 fieldset 안 포함)은 뺀다. 처음 초점과 Tab 순환에 같은 검사를 쓴다.
function canFocus(element, dialog) {
  if (element.matches(':disabled')) return false
  if (getComputedStyle(element).visibility === 'hidden') return false
  for (let node = element; node && node !== dialog.parentElement; node = node.parentElement) {
    if (node.hidden || node.hasAttribute('inert')) return false
    if (getComputedStyle(node).display === 'none') return false
  }
  return true
}

function focusable(root, dialog, selector = FOCUSABLE) {
  return Array.from(root.querySelectorAll(selector)).filter((element) => canFocus(element, dialog))
}

// 열린 순서대로 쌓는다. 키보드(Esc·Tab)는 맨 위 모달만 처리한다.
// 항목: { dialog, opener } — opener는 닫힐 때 초점을 돌려줄 요소
const openStack = []

// 아래 모달이 먼저 닫히면, 그 모달 안에서 열린 위 모달의 opener를 아래 모달의 opener로 넘긴다
// (위 모달이 닫힐 때 사라진 요소 대신 배경의 원래 opener로 돌아가게).
function handOverOpener(closing) {
  for (const entry of openStack) {
    if (entry.opener instanceof HTMLElement && closing.dialog.contains(entry.opener)) entry.opener = closing.opener
  }
}

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
  // 연 요소는 그리기 전에 잡는다(효과 시점에는 모달 안 칸으로 초점이 이미 옮겨 갔을 수 있음)
  const [opener] = useState(() => document.activeElement)
  // 효과는 열릴 때 한 번만 건다. 최신 콜백·초점 대상은 ref로 읽는다.
  const onCloseRef = useRef(onClose)
  const initialFocusRef = useRef(initialFocus)
  useEffect(() => {
    onCloseRef.current = onClose
    initialFocusRef.current = initialFocus
  })

  useEffect(() => {
    const dialog = dialogRef.current
    const entry = { dialog, opener }
    openStack.push(entry)

    const autofocus = dialog.querySelector('[data-autofocus]')
    const first =
      initialFocusRef.current?.current ??
      (autofocus && canFocus(autofocus, dialog) ? autofocus : null) ??
      (bodyRef.current ? focusable(bodyRef.current, dialog, FIELDS)[0] : null) ??
      focusable(dialog, dialog)[0] ??
      dialog
    first.focus()

    function onKeyDown(event) {
      if (openStack[openStack.length - 1] !== entry) return
      if (event.key === 'Escape') {
        if (event.isComposing) return // 한글 조합 취소용 Esc는 모달을 닫지 않는다
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable(dialog, dialog)
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
      const index = openStack.indexOf(entry)
      const wasTop = index === openStack.length - 1
      openStack.splice(index, 1)
      if (!wasTop) {
        // 아래 모달만 닫힘: 초점은 위 모달에 그대로 둔다
        handOverOpener(entry)
        return
      }
      const next = openStack[openStack.length - 1]
      const back = entry.opener
      const canReturn = back instanceof HTMLElement && back.isConnected && (!next || next.dialog.contains(back))
      if (canReturn) back.focus()
      else if (next) (focusable(next.dialog, next.dialog)[0] ?? next.dialog).focus()
    }
  }, [opener])

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
          {onClose && (
            <button type="button" className="modal__close" aria-label="닫기" onClick={() => onClose()}>
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <div ref={bodyRef} className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
