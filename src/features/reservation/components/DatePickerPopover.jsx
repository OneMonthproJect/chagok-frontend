import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WEEKDAYS, addDays, formatDayLabel, formatMonthLabel, monthGrid, monthStart, shiftMonth } from '../dates'
import './DatePickerPopover.css'

// 날짜 선택 팝오버 (#83, 09 S-02 날짜 이동 보완). 이동 바의 기간 표시를 누르면 연다. 조회할 날짜를 고르는 용도라
// 고를 수 있는 날짜에 제한이 없다(M-02 예약 등록 가능 기간과 별개). 날짜는 서울 날짜 문자열만 다룬다(08 0.1).
// - 날짜를 누르면 onPick(날짜). [오늘]은 onPick(today). [취소]·Esc·바깥 누름은 onClose만(아무것도 바꾸지 않음).
// - 키보드: 날짜에서 ←→(하루)·↑↓(한 주) 이동, 달을 넘으면 그 달을 보인다. Enter·Space로 고른다. 닫히면 초점은 연 버튼으로(쓰는 쪽).
//   Tab으로 팝오버 밖 요소로 나가면 닫는다(열린 채 Esc를 못 듣는 상태를 남기지 않음).
// - 캘린더 카드가 overflow: hidden이라 body에 띄우고 연 버튼 아래에 고정 위치로 둔다. 화면 밖으로 나가지 않게
//   좌우를 맞추고, 아래 공간이 모자라면(화면 아래쪽의 날짜 목록 등) 위로 펼친다.
// 사용: <DatePickerPopover value="2026-11-24" today="2026-11-27" anchorRef={buttonRef} onPick={…} onClose={…} />

const WIDTH = 304
const MARGIN = 8

/** 연 버튼 아래 가운데, 화면 좌우 안쪽으로. 아래 공간이 모자라면 위로 펼치고, 위도 모자라면 화면 안쪽 끝에 맞춘다 */
function place(anchor, height) {
  const rect = anchor.getBoundingClientRect()
  const maxLeft = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)
  const left = Math.min(Math.max(rect.left + rect.width / 2 - WIDTH / 2, MARGIN), maxLeft)
  const below = rect.bottom + 6
  const above = rect.top - 6 - height
  const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN)
  let top = below
  if (below + height > window.innerHeight - MARGIN) top = above >= MARGIN ? above : Math.min(below, maxTop)
  return { top, left }
}

/** 화면 읽기용 이름: "11월 27일 (금), 오늘, 선택됨" */
function dayName(day, today, value) {
  const parts = [formatDayLabel(day)]
  if (day === today) parts.push('오늘')
  if (day === value) parts.push('선택됨')
  return parts.join(', ')
}

const ARROWS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

export default function DatePickerPopover({ value, today, anchorRef, onPick, onClose }) {
  const [view, setView] = useState(() => monthStart(value)) // 보이는 달의 1일
  const [focusDate, setFocusDate] = useState(value) // 날짜 칸 중 Tab으로 들어올 칸
  const [position, setPosition] = useState(null)
  const panelRef = useRef(null)
  const moveFocusRef = useRef(true) // 열 때·화살표로 옮길 때만 날짜 칸으로 초점을 옮긴다(달 넘김 버튼은 초점 유지)
  const { days } = monthGrid(view)
  const rovingDate = days.includes(focusDate) ? focusDate : view

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return undefined
    const update = () => setPosition(place(anchor, panelRef.current?.offsetHeight ?? 0))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef])

  useEffect(() => {
    if (!moveFocusRef.current) return
    moveFocusRef.current = false
    // 위치(top·left)가 정해지기 전에 초점이 걸려도 페이지가 스크롤로 튀지 않게
    panelRef.current?.querySelector(`[data-date="${rovingDate}"]`)?.focus({ preventScroll: true })
  }, [rovingDate])

  // 바깥을 누르면 닫는다(연 버튼은 자기 클릭으로 닫으므로 제외)
  useEffect(() => {
    function handleDown(event) {
      if (panelRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return
      onClose(false) // 초점은 사람이 누른 곳에 둔다
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [anchorRef, onClose])

  function moveView(months) {
    setView(shiftMonth(view, months))
  }

  /** Tab·Shift+Tab으로 초점이 팝오버·연 버튼 밖 요소로 가면 닫는다(초점은 그 요소에 둔다).
   *  relatedTarget이 없으면(팝오버 안 빈 곳 클릭 등) 두고, 바깥 클릭은 mousedown 처리가 닫는다 */
  function handleBlur(event) {
    const next = event.relatedTarget
    if (!next || panelRef.current?.contains(next) || anchorRef.current?.contains(next)) return
    onClose(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    const step = ARROWS[event.key]
    const from = event.target instanceof HTMLElement ? event.target.dataset.date : undefined
    if (step === undefined || !from) return
    event.preventDefault()
    const next = addDays(from, step)
    moveFocusRef.current = true
    setFocusDate(next)
    if (next.slice(0, 7) !== view.slice(0, 7)) setView(monthStart(next))
  }

  return createPortal(
    <div
      ref={panelRef}
      className="date-picker"
      role="dialog"
      aria-label="날짜 선택"
      style={position ? { top: position.top, left: position.left } : undefined}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <div className="date-picker__head">
        <button type="button" className="date-picker__month-btn" aria-label="이전 달 보기" onClick={() => moveView(-1)}>‹</button>
        <strong className="date-picker__month" aria-live="polite">{formatMonthLabel(view)}</strong>
        <button type="button" className="date-picker__month-btn" aria-label="다음 달 보기" onClick={() => moveView(1)}>›</button>
      </div>
      <div className="date-picker__weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="date-picker__grid" role="group" aria-label={`${formatMonthLabel(view)} 날짜`}>
        {days.map((day) => {
          const classes = ['date-picker__day']
          if (day.slice(0, 7) !== view.slice(0, 7)) classes.push('is-outside')
          if (day === today) classes.push('is-today')
          if (day === value) classes.push('is-selected')
          return (
            <button
              key={day}
              type="button"
              className={classes.join(' ')}
              data-date={day}
              tabIndex={day === rovingDate ? 0 : -1}
              aria-pressed={day === value}
              aria-label={dayName(day, today, value)}
              onClick={() => onPick(day)}
            >
              {Number(day.slice(8, 10))}
            </button>
          )
        })}
      </div>
      <div className="date-picker__foot">
        <button type="button" className="date-picker__action" onClick={() => onPick(today)}>오늘</button>
        <button type="button" className="date-picker__action" onClick={() => onClose()}>취소</button>
      </div>
    </div>,
    document.body,
  )
}
