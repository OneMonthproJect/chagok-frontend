// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import PeriodNavigator from './PeriodNavigator.jsx'
import DateNavigator from './DateNavigator.jsx'
import { cleanup, click, keyDown, render } from '@/shared/lib/domTest'

// 기간 이동 바 + 날짜 선택 팝오버 (#83). 이동 버튼 이름·오늘로 비활성, 팝오버 열기·고르기·취소·Esc·바깥 누름·키보드.

afterEach(cleanup)

const picker = () => document.querySelector('[role="dialog"][aria-label="날짜 선택"]')
const trigger = () => document.querySelector('.period-nav__label')
const day = (date) => document.querySelector(`.date-picker__day[data-date="${date}"]`)
const button = (text, root = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

function renderNav(props = {}) {
  const handlers = { onMove: vi.fn(), onToday: vi.fn(), onPick: vi.fn() }
  const view = render(
    <PeriodNavigator unit="week" label="2026년 11월 23일 ~ 29일" date="2026-11-25" today="2026-11-27" classPrefix="wcal" {...handlers} {...props} />,
  )
  return { ...handlers, view }
}

describe('PeriodNavigator 이동', () => {
  it('이전·다음은 기간 표시 양옆에 있고 단위별 이름으로 onMove(-1·1)를 부른다', () => {
    const { onMove } = renderNav()
    const group = document.querySelector('[role="group"][aria-label="주 이동"]')
    const children = Array.from(group.children)
    expect(children[0].getAttribute('aria-label')).toBe('이전 주')
    expect(children[1].classList.contains('period-nav__title')).toBe(true)
    expect(children[2].getAttribute('aria-label')).toBe('다음 주')

    click(children[0])
    click(children[2])
    expect(onMove.mock.calls).toEqual([[-1], [1]])
  })

  it('기간 표시 글자는 label 그대로(쓰는 쪽 제목 이름도 붙는다)', () => {
    renderNav()
    expect(document.querySelector('.wcal__title').textContent).toBe('2026년 11월 23일 ~ 29일')
  })

  it('오늘로: 보는 날짜가 오늘이 아니면 onToday, 오늘이면 비활성', () => {
    const { onToday, view } = renderNav()
    const today = document.querySelector('.wcal__today')
    expect(today.disabled).toBe(false)
    click(today)
    expect(onToday).toHaveBeenCalledTimes(1)

    view.rerender(<PeriodNavigator unit="week" label="x" date="2026-11-27" today="2026-11-27" classPrefix="wcal" onMove={() => {}} onToday={() => {}} onPick={() => {}} />)
    expect(document.querySelector('.wcal__today').disabled).toBe(true)
  })

  it('달·날짜 단위 이름', () => {
    render(<PeriodNavigator unit="month" label="2026년 11월" date="2026-11-25" today="2026-11-27" onMove={() => {}} onToday={() => {}} onPick={() => {}} />)
    expect(document.querySelector('[aria-label="달 이동"] [aria-label="이전 달"]')).not.toBeNull()
    expect(document.querySelector('[aria-label="달 이동"] [aria-label="다음 달"]')).not.toBeNull()
  })
})

describe('날짜 선택 팝오버', () => {
  it('기간 표시를 누르면 열리고, 보는 날짜의 달·선택·오늘 표시와 초점', () => {
    renderNav()
    expect(picker()).toBeNull()
    click(trigger())
    expect(picker()).not.toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.date-picker__month').textContent).toBe('2026년 11월')
    expect(day('2026-11-25').getAttribute('aria-pressed')).toBe('true')
    expect(day('2026-11-25').getAttribute('aria-label')).toBe('11월 25일 (수), 선택됨')
    expect(day('2026-11-27').getAttribute('aria-label')).toBe('11월 27일 (금), 오늘')
    expect(document.activeElement).toBe(day('2026-11-25'))
  })

  it('날짜를 고르면 onPick(그 날짜) + 닫고 초점은 기간 표시로', () => {
    const { onPick } = renderNav()
    click(trigger())
    click(day('2026-11-10'))
    expect(onPick).toHaveBeenCalledWith('2026-11-10')
    expect(picker()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('지금 보는 날짜를 다시 고르면 onPick을 부르지 않고 닫기만', () => {
    const { onPick } = renderNav()
    click(trigger())
    click(day('2026-11-25'))
    expect(onPick).not.toHaveBeenCalled()
    expect(picker()).toBeNull()
  })

  it('[오늘]은 오늘(서울 날짜, today prop)을 고른다', () => {
    const { onPick } = renderNav()
    click(trigger())
    click(button('오늘', picker()))
    expect(onPick).toHaveBeenCalledWith('2026-11-27')
  })

  it('[취소]·Esc는 아무것도 바꾸지 않고 닫는다(초점은 기간 표시로)', () => {
    const { onPick, onMove, onToday } = renderNav()
    click(trigger())
    click(button('취소', picker()))
    expect(picker()).toBeNull()
    expect(document.activeElement).toBe(trigger())

    click(trigger())
    keyDown('Escape')
    expect(picker()).toBeNull()
    expect(document.activeElement).toBe(trigger())
    expect(onPick).not.toHaveBeenCalled()
    expect(onMove).not.toHaveBeenCalled()
    expect(onToday).not.toHaveBeenCalled()
  })

  it('바깥을 누르면 닫는다(바꾸지 않음)', () => {
    const { onPick } = renderNav()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    click(trigger())
    click(outside)
    expect(picker()).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('기간 표시를 다시 누르면 닫는다', () => {
    renderNav()
    click(trigger())
    click(trigger())
    expect(picker()).toBeNull()
  })

  it('달 넘김 버튼은 보이는 달만 바꾼다(고르지 않음, 날짜 제한 없음)', () => {
    const { onPick } = renderNav()
    click(trigger())
    for (let i = 0; i < 14; i += 1) click(document.querySelector('[aria-label="이전 달 보기"]'))
    expect(document.querySelector('.date-picker__month').textContent).toBe('2025년 9월')
    click(document.querySelector('[aria-label="다음 달 보기"]'))
    expect(document.querySelector('.date-picker__month').textContent).toBe('2025년 10월')
    click(day('2025-10-15'))
    expect(onPick).toHaveBeenCalledWith('2025-10-15')
  })

  it('키보드: ←→ 하루, ↑↓ 한 주, 달을 넘으면 그 달을 보인다', () => {
    const { onPick } = renderNav()
    click(trigger())
    keyDown('ArrowRight')
    expect(document.activeElement).toBe(day('2026-11-26'))
    keyDown('ArrowDown')
    expect(document.activeElement).toBe(day('2026-12-03'))
    expect(document.querySelector('.date-picker__month').textContent).toBe('2026년 12월')
    keyDown('ArrowUp')
    keyDown('ArrowLeft')
    expect(document.activeElement).toBe(day('2026-11-25'))
    expect(document.querySelector('.date-picker__month').textContent).toBe('2026년 11월')
    // Tab으로 들어오는 날짜 칸은 하나(roving)
    expect(document.querySelectorAll('.date-picker__day[tabindex="0"]')).toHaveLength(1)
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('DateNavigator (날짜 목록)', () => {
  it('앞뒤 하루·오늘로·고른 날짜를 onChange로 알린다', () => {
    const onChange = vi.fn()
    render(<DateNavigator date="2026-11-30" today="2026-11-27" onChange={onChange} />)
    click(document.querySelector('[aria-label="다음 날짜"]'))
    click(document.querySelector('[aria-label="이전 날짜"]'))
    click(button('오늘로'))
    expect(trigger().textContent).toBe('11월 30일 (월)')
    click(trigger())
    click(day('2026-12-01'))
    expect(onChange.mock.calls).toEqual([['2026-12-01'], ['2026-11-29'], ['2026-11-27'], ['2026-12-01']])
  })
})
