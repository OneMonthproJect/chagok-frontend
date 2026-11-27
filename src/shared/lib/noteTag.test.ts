import { describe, expect, it } from 'vitest'
import { itemNoteTag } from './noteTag'

// 항목 꼬리표 문구 (04 F-CYC-02, 08 10·14·17 lastDecline·lastCaution). S-07·S-08·S-04·S-02 패널이 같은 문구를 쓴다.

describe('itemNoteTag', () => {
  it('지난 방문 거절(날짜) · 지난 점검 주의(날짜, 메모), 메모가 없으면 날짜만, 둘 다 null이면 없음', () => {
    expect(itemNoteTag({ lastDecline: null, lastCaution: null })).toBeUndefined()
    expect(itemNoteTag({ lastDecline: { date: '2026-10-24', memo: '다음에 하기로 함' }, lastCaution: null })).toBe('지난 방문 거절(2026.10.24)')
    expect(itemNoteTag({ lastDecline: null, lastCaution: { date: '2026-09-24', memo: '앞 타이어 마모' } })).toBe(
      '지난 점검 주의(2026.09.24, 앞 타이어 마모)',
    )
    expect(itemNoteTag({ lastDecline: null, lastCaution: { date: '2026-09-24', memo: null } })).toBe('지난 점검 주의(2026.09.24)')
  })

  it('필드가 아예 없어도(P0-핵심 서버 응답) 꼬리표 없음', () => {
    expect(itemNoteTag({})).toBeUndefined()
  })

  it('둘 다 오면 거절 · 주의 순', () => {
    expect(
      itemNoteTag({ lastDecline: { date: '2026-10-24', memo: null }, lastCaution: { date: '2026-09-24', memo: null } }),
    ).toBe('지난 방문 거절(2026.10.24) · 지난 점검 주의(2026.09.24)')
  })
})

