// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/client'
import { cleanup, click, render } from '@/shared/lib/domTest'
import SummaryCards from './SummaryCards.jsx'

// 홈 요약 카드 (09 S-02, 08 04, chagok-frontend#28): 서버 숫자 그대로, 콜백이 있을 때만 버튼, 실패 안내·다시 시도

afterEach(cleanup)

const OK = { kind: 'ok', data: { date: '2026-11-24', todayReservationCount: 2, todayContactCount: 5, todayReservations: [] } }
const button = (text) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === text)

describe('SummaryCards', () => {
  it('오늘 예약 2건·오늘 연락할 고객 5명 (07 7.5)', () => {
    render(<SummaryCards state={OK} onReload={() => {}} />)
    const text = document.body.textContent
    expect(text).toContain('오늘 예약')
    expect(text).toContain('2건')
    expect(text).toContain('오늘 연락할 고객')
    expect(text).toContain('5명')
  })

  it('콜백이 없으면 버튼도 없다 (연결 안 된 버튼 없음)', () => {
    render(<SummaryCards state={OK} onReload={() => {}} />)
    expect(button('목록 →')).toBeUndefined()
    expect(button('보기 →')).toBeUndefined()
  })

  it('콜백이 있으면 누를 때 알린다', () => {
    const onShowToday = vi.fn()
    const onShowTargets = vi.fn()
    render(<SummaryCards state={OK} onReload={() => {}} onShowToday={onShowToday} onShowTargets={onShowTargets} />)
    click(button('목록 →'))
    click(button('보기 →'))
    expect(onShowToday).toHaveBeenCalledTimes(1)
    expect(onShowTargets).toHaveBeenCalledTimes(1)
  })

  it('불러오는 중에는 숫자 자리 표시, 실패하면 안내 + 사람이 누르는 다시 시도', async () => {
    render(<SummaryCards state={{ kind: 'loading' }} onReload={() => {}} />)
    expect(document.querySelector('.summary-cards').getAttribute('aria-busy')).toBe('true')
    cleanup()
    const onReload = vi.fn()
    render(<SummaryCards state={{ kind: 'error', error: new ApiError(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.') }} onReload={onReload} />)
    expect(document.body.textContent).toContain('요약 숫자를 불러오지 못했습니다.')
    expect(onReload).not.toHaveBeenCalled()
    click(button('다시 시도'))
    await act(async () => {}) // 공통 Button은 두 번 누름 막기 때문에 다음 차례에 onClick을 부른다
    expect(onReload).toHaveBeenCalledTimes(1)
  })
})
