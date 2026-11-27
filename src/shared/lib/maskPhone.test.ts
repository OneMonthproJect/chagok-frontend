import { describe, expect, it } from 'vitest'
import { maskPhone } from './maskPhone'

describe('maskPhone (08 0.5, Mock 전용)', () => {
  it('마스킹 규칙 (08 0.5 예시)', () => {
    expect(maskPhone('010-0000-0001')).toBe('010-****-0001')
    expect(maskPhone('02-123-4567')).toBe('02-***-4567')
    expect(maskPhone('0311234567')).toBe('031-***-4567')
    expect(maskPhone('1588-1234')).toBe('****-1234')
    expect(maskPhone('1234')).toBe('****')
    expect(maskPhone('')).toBe('')
  })
})
