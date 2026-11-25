import { describe, expect, it } from 'vitest'
import { unauthorizedState } from '@/app/unauthorizedState'

// 401 → 로그인 화면으로 넘기는 state (D-68): 다시 로그인하면 원래 화면으로 돌아가게 from을 넘긴다
describe('unauthorizedState', () => {
  it('401이 난 화면을 from으로(쿼리 포함), reason은 expired', () => {
    expect(unauthorizedState({ pathname: '/customers/3', search: '?tab=car' }, '/login'))
      .toEqual({ reason: 'expired', from: '/customers/3?tab=car' })
  })

  it('로그인 화면에서 난 401이면 from 없이', () => {
    expect(unauthorizedState({ pathname: '/login', search: '' }, '/login')).toEqual({ reason: 'expired' })
  })
})
