import { useRef, useState } from 'react'
import DatePickerPopover from './DatePickerPopover.jsx'
import './PeriodNavigator.css'

// 기간 이동 바 (#83): [‹] [기간 표시 ▾] [›] [오늘로]. 주 캘린더·월 캘린더·날짜 목록이 같은 모양을 쓴다(09 S-02 날짜 앞뒤 이동·"오늘로").
// - 이전·다음은 onMove(-1 | 1), "오늘로"는 onToday. 어떤 날짜로 옮길지는 쓰는 쪽이 정한다(기존 날짜 계산 그대로).
// - 기간 표시를 누르면 날짜 선택 팝오버(DatePickerPopover). 고른 날짜가 지금과 다를 때만 onPick(날짜).
//   팝오버가 닫히면 초점은 기간 표시 버튼으로 돌아온다.
// - classPrefix를 주면 제목·오늘로에 `${prefix}__title`·`${prefix}__today`도 붙는다(쓰는 쪽 화면·테스트의 기존 이름 유지).
// 사용: <PeriodNavigator unit="week" label="2026년 11월 23일 ~ 29일" date={date} today={today}
//        onMove={moveWeek} onToday={() => onSelectDate(today)} onPick={onSelectDate} classPrefix="wcal" />

const UNITS = {
  week: { group: '주 이동', prev: '이전 주', next: '다음 주' },
  month: { group: '달 이동', prev: '이전 달', next: '다음 달' },
  day: { group: '날짜 이동', prev: '이전 날짜', next: '다음 날짜' },
}

function Chevron({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={dir === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PeriodNavigator({ unit, label, date, today, onMove, onToday, onPick, classPrefix, titleTag = 'h2' }) {
  const names = UNITS[unit]
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const Title = titleTag
  const extra = (part) => (classPrefix ? ` ${classPrefix}__${part}` : '')

  /** returnFocus: Esc·[취소]·날짜 고름은 기간 표시로 초점을 돌린다. 바깥 누름은 사람이 누른 곳에 초점을 둔다 */
  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function pick(next) {
    close()
    if (next !== date) onPick(next)
  }

  return (
    <div className="period-nav">
      <div className="period-nav__group" role="group" aria-label={names.group}>
        <button type="button" className="period-nav__arrow" aria-label={names.prev} onClick={() => onMove(-1)}>
          <Chevron dir="left" />
        </button>
        <Title className={`period-nav__title${extra('title')}`} aria-live="polite">
          <button
            ref={triggerRef}
            type="button"
            className="period-nav__label"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => (open ? close() : setOpen(true))}
          >
            {label}
            <svg className="period-nav__caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
              <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Title>
        <button type="button" className="period-nav__arrow" aria-label={names.next} onClick={() => onMove(1)}>
          <Chevron dir="right" />
        </button>
      </div>
      <button type="button" className={`period-nav__today${extra('today')}`} disabled={date === today} onClick={onToday}>
        오늘로
      </button>
      {open && <DatePickerPopover value={date} today={today} anchorRef={triggerRef} onPick={pick} onClose={close} />}
    </div>
  )
}
