import { describe, expect, it } from 'vitest'
import { CUSTOMER_STATEMENT_LABEL, INSPECT_RESULT_LABELS, isCustomerStatement } from './recordDisplay'

// 정비 기록 출처·점검 결과 표시 (09 S-07·S-02 4번, 08 0.4·11·17). S-07 정비 이력과 S-02 패널 최근 이력이 같이 쓴다.

describe('isCustomerStatement', () => {
  it('source가 있으면 source로, 없으면(source를 아직 싣지 않는 서버) type EXTERNAL로 — 07 3.7 CHECK로 둘은 같다', () => {
    expect(isCustomerStatement({ type: 'EXTERNAL', source: 'CUSTOMER_STATEMENT' })).toBe(true)
    expect(isCustomerStatement({ type: 'REPLACE', source: 'SHOP' })).toBe(false)
    expect(isCustomerStatement({ type: 'EXTERNAL' })).toBe(true)
    expect(isCustomerStatement({ type: 'EXTERNAL', source: null })).toBe(true)
    expect(isCustomerStatement({ type: 'DECLINE' })).toBe(false)
    expect(isCustomerStatement({ type: 'INSPECT' })).toBe(false)
  })
})

describe('글자', () => {
  it('고객 진술 · 점검 결과 양호·주의 (08 0.4)', () => {
    expect(CUSTOMER_STATEMENT_LABEL).toBe('고객 진술')
    expect(INSPECT_RESULT_LABELS).toEqual({ GOOD: '양호', CAUTION: '주의' })
  })
})
