// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, click, render } from '@/shared/lib/domTest'
import StartVisitDialog from './StartVisitDialog.jsx'

// 방문 접수 대화상자 (#33): 요청 중에 대화상자가 사라진 뒤 늦게 온 결과가 지금 열린 다른 접수 대화상자를 닫지 않는다 (릴리스 리뷰, frontend#97)

afterEach(() => cleanup())

const target = { plateNumber: '55차0010', customerName: '오세훈', reservedAt: '2030-03-13T10:00:00' }
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const confirmButton = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === '방문 접수')

describe('StartVisitDialog', () => {
  it('성공하면 닫는다', async () => {
    const onClose = vi.fn()
    render(<StartVisitDialog target={target} missing={{ modelYear: false, mileage: false }} onSubmit={() => Promise.resolve({ kind: 'changed' })} onClose={onClose} />)
    click(confirmButton())
    await settle()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('요청 중에 대화상자가 사라지면 늦게 온 결과로 닫기를 부르지 않는다', async () => {
    const onClose = vi.fn()
    let finish
    const onSubmit = () => new Promise((resolve) => { finish = resolve })
    render(<StartVisitDialog target={target} missing={{ modelYear: false, mileage: false }} onSubmit={onSubmit} onClose={onClose} />)
    click(confirmButton())
    await settle()
    cleanup() // 다른 예약으로 바뀌어 이 대화상자가 언마운트됨
    await act(async () => {
      finish({ kind: 'changed' })
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
