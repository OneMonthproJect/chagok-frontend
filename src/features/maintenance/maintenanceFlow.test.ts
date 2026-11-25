import { describe, expect, it } from 'vitest'
import {
  appendVisits,
  baseRecordText,
  dateText,
  hasMoreVisits,
  itemStatusTableRows,
  kmText,
  visitCountText,
  visitMetaText,
} from './maintenanceFlow'
import type { ItemStatusItem, Visit } from './types'

// S-07 표시 규칙 (09 S-07, 04 F-CUS-05·F-CYC-01). 상태·다음 정비일·다음 km는 서버 값 그대로, 글자 모양만 바꾼다.

const ITEM = (over: Partial<ItemStatusItem>): ItemStatusItem => ({
  itemId: 1,
  code: 'ENGINE_OIL',
  name: '엔진오일',
  status: 'UNKNOWN',
  dueReason: null,
  baseRecord: null,
  nextDueDate: null,
  nextDueMileage: null,
  ...over,
})

const VISIT = (visitKey: string): Visit => ({ visitKey, visitDate: '2026-10-24', mileage: null, staffName: '김정비', records: [] })

describe('글자 모양', () => {
  it('날짜는 점 표기, km는 천 단위 쉼표', () => {
    expect(dateText('2026-09-24')).toBe('2026.09.24')
    expect(kmText(45000)).toBe('45,000 km')
    expect(kmText(null)).toBeNull()
  })

  it('기준 기록: 날짜 · km · 구분, km가 없으면 뺀다, 외부는 고객 진술', () => {
    expect(baseRecordText({ date: '2026-09-24', mileage: 45000, type: 'REPLACE' })).toBe('2026.09.24 · 45,000 km · 교체')
    expect(baseRecordText({ date: '2026-10-24', mileage: null, type: 'EXTERNAL' })).toBe('2026.10.24 · 외부(고객 진술)')
    expect(baseRecordText(null)).toBeNull()
  })

  it('방문 줄 보조 글과 방문 수', () => {
    expect(visitMetaText({ mileage: 45000, staffName: '김정비' })).toBe('45,000 km · 김정비')
    expect(visitMetaText({ mileage: null, staffName: '박사장' })).toBe('— · 박사장')
    expect(visitCountText(3)).toBe('방문 단위 · 최신순 · 방문 3회')
  })
})

describe('itemStatusTableRows (ItemStatusList table)', () => {
  it('상태는 서버 값 그대로 — 다음 정비일이 지났어도 서버가 여유라면 여유', () => {
    const rows = itemStatusTableRows([
      ITEM({ status: 'AHEAD', baseRecord: { date: '2020-01-01', mileage: null, type: 'REPLACE' }, nextDueDate: '2020-07-01' }),
    ])
    expect(rows[0].status).toBe('AHEAD')
    expect(rows[0].details[1].value).toBe('2020.07.01')
  })

  it('열은 기준 기록 · 다음 정비일 · 다음 정비 km, 순서는 받은 순서 그대로', () => {
    const rows = itemStatusTableRows([
      ITEM({ itemId: 6, name: '배터리', status: 'SOON', baseRecord: { date: '2023-12-14', mileage: null, type: 'REPLACE' }, nextDueDate: '2026-12-14' }),
      ITEM({ itemId: 1 }),
    ])
    expect(rows.map((r) => r.id)).toEqual([6, 1])
    expect(rows[0].details).toEqual([
      { label: '기준 기록', value: '2023.12.14 · 교체' },
      { label: '다음 정비일', value: '2026.12.14' },
      { label: '다음 정비 km', value: null },
    ])
    expect(rows[1].details.map((d) => d.value)).toEqual([null, null, null])
  })

  it('도래 근거는 근거가 된 칸에만 붙인다 (04 F-CUS-05 근거)', () => {
    const byDate = itemStatusTableRows([ITEM({ status: 'DUE', dueReason: 'DATE', nextDueDate: '2026-11-17', nextDueMileage: 50000 })])
    expect(byDate[0].details[1].value).toBe('2026.11.17 (도래 근거)')
    expect(byDate[0].details[2].value).toBe('50,000 km')
    const byKm = itemStatusTableRows([ITEM({ status: 'DUE', dueReason: 'KM', nextDueDate: '2027-03-24', nextDueMileage: 55000 })])
    expect(byKm[0].details[1].value).toBe('2027.03.24')
    expect(byKm[0].details[2].value).toBe('55,000 km (도래 근거)')
  })
})

describe('더 보기', () => {
  it('마지막 쪽이 아니면 더 있다', () => {
    expect(hasMoreVisits(null)).toBe(false)
    expect(hasMoreVisits({ page: 0, totalPages: 2 })).toBe(true)
    expect(hasMoreVisits({ page: 1, totalPages: 2 })).toBe(false)
    expect(hasMoreVisits({ page: 0, totalPages: 0 })).toBe(false)
  })

  it('뒤에 붙이고, 쪽 경계가 밀려 다시 온 방문은 한 번만', () => {
    const merged = appendVisits([VISIT('a'), VISIT('b')], [VISIT('b'), VISIT('c')])
    expect(merged.map((v) => v.visitKey)).toEqual(['a', 'b', 'c'])
  })
})
