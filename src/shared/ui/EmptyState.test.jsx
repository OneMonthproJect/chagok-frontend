// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { cleanup, click, render } from '@/shared/lib/domTest'

// 빈 상태 문구는 09 5장 표 그대로 (화면이 넘긴 문구를 바꾸지 않음), 연결 안 된 버튼 없음 (09 0장)

afterEach(cleanup)

describe('EmptyState', () => {
  it.each([
    '오늘 예약이 없습니다.',
    '지금 연락할 고객이 없습니다.',
    '등록된 고객이 없습니다.',
    '검색 결과가 없습니다.',
    '등록된 차량이 없습니다.',
    '정비 이력이 없습니다.',
    '최근 정비 이력이 없습니다.',
  ])('09 5장 문구 "%s"를 그대로 보인다', (title) => {
    const view = render(<EmptyState title={title} />)
    expect(view.container.querySelector('.empty-state__title').textContent).toBe(title)
  })

  it('action이 없으면 버튼을 그리지 않는다', () => {
    const view = render(<EmptyState title="지금 연락할 고객이 없습니다." />)
    expect(view.container.querySelector('button')).toBeNull()
  })

  it('action이 있으면 이어지는 버튼 하나를 그리고, 누르면 onClick', () => {
    const onClick = vi.fn()
    const view = render(<EmptyState title="등록된 차량이 없습니다." action={{ label: '차량 추가', onClick }} />)
    const buttons = view.container.querySelectorAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toBe('차량 추가')
    expect(buttons[0].getAttribute('type')).toBe('button')
    click(buttons[0])
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('설명·그림 자리는 줄 때만 보이고, 그림은 화면 낭독기에서 숨긴다', () => {
    const plain = render(<EmptyState title="정비 이력이 없습니다." />)
    expect(plain.container.querySelector('.empty-state__description')).toBeNull()
    expect(plain.container.querySelector('.empty-state__illustration')).toBeNull()

    const full = render(<EmptyState title="등록된 고객이 없습니다." description="첫 고객을 등록해 보세요." illustration={<img alt="" src="x.png" />} compact />)
    expect(full.container.querySelector('.empty-state__description').textContent).toBe('첫 고객을 등록해 보세요.')
    expect(full.container.querySelector('.empty-state__illustration').getAttribute('aria-hidden')).toBe('true')
    expect(full.container.querySelector('.empty-state--compact')).not.toBeNull()
  })
})
