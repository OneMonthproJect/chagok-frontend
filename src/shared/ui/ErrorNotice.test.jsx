// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { ApiError, DEFAULT_MESSAGES, NETWORK_ERROR } from '@/shared/api/client'
import { cleanup, render } from '@/shared/lib/domTest'

// 공통 오류 안내: 문구는 ApiError.message(=서버 문구 또는 DEFAULT_MESSAGES), 다시 시도는 사람이 누를 때만 (05 POL-125)

afterEach(cleanup)

const networkError = new ApiError(0, NETWORK_ERROR, DEFAULT_MESSAGES[NETWORK_ERROR])
const serverError = new ApiError(500, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR)
const forbidden = new ApiError(403, 'FORBIDDEN', DEFAULT_MESSAGES.FORBIDDEN)

describe('ErrorNotice', () => {
  it.each([
    ['네트워크', networkError],
    ['500', serverError],
    ['403', forbidden],
  ])('%s 오류는 role=alert로 ApiError.message를 그대로 보인다', (_, error) => {
    const view = render(<ErrorNotice error={error} />)
    const notice = view.container.querySelector('[role="alert"]')
    expect(notice).not.toBeNull()
    expect(notice.querySelector('.error-notice__title').textContent).toBe(error.message)
    expect(notice.querySelector('.error-notice__body')).toBeNull()
  })

  it('title을 주면 제목, error.message는 아래 줄 (조회 실패 09 5장)', () => {
    const view = render(<ErrorNotice title="불러오지 못했습니다." error={networkError} />)
    expect(view.container.querySelector('.error-notice__title').textContent).toBe('불러오지 못했습니다.')
    expect(view.container.querySelector('.error-notice__body').textContent).toBe(networkError.message)
  })

  it('onRetry는 그릴 때 부르지 않고, 버튼을 누를 때만 한 번 부른다 (두 번 눌러도 한 번)', async () => {
    let finish
    const onRetry = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const view = render(<ErrorNotice title="불러오지 못했습니다." error={serverError} onRetry={onRetry} retryLabel="다시 불러오기" />)
    expect(onRetry).not.toHaveBeenCalled()
    const retry = view.container.querySelector('button')
    expect(retry.textContent).toBe('다시 불러오기')
    await act(async () => {
      retry.click()
      retry.click()
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(retry.getAttribute('aria-busy')).toBe('true')
    await act(async () => finish())
    expect(retry.getAttribute('aria-busy')).toBe('false')
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('onRetry가 없으면 버튼이 없다 (연결 안 된 버튼 없음)', () => {
    const view = render(<ErrorNotice error={forbidden} />)
    expect(view.container.querySelector('button')).toBeNull()
  })

  it('tone: warn은 alert, info는 status, 모르는 값은 error', () => {
    const warn = render(<ErrorNotice tone="warn" title="다른 사람이 먼저 수정했습니다." />)
    expect(warn.container.querySelector('.error-notice--warn[role="alert"]')).not.toBeNull()
    const info = render(<ErrorNotice tone="info" title="안내" />)
    expect(info.container.querySelector('.error-notice--info[role="status"]')).not.toBeNull()
    const other = render(<ErrorNotice tone="x" title="오류" />)
    expect(other.container.querySelector('.error-notice--error')).not.toBeNull()
  })

  it('보일 문구가 없으면 아무것도 그리지 않는다', () => {
    const view = render(<ErrorNotice />)
    expect(view.container.innerHTML).toBe('')
  })
})
