import { describe, expect, it } from 'vitest'
import {
  CONFIRM_TEXT,
  canCancel,
  canComplete,
  canEdit,
  canNoShow,
  canOpenVehicleDetail,
  itemStatusRows,
  mileageText,
  modelYearText,
  parseReservationId,
  purposeLabels,
  recordTypeLabel,
  reloadsOnConflict,
  reservedAtText,
  visitDateText,
} from './panelFlow'
import type { PanelItemStatus } from './types'

// 예약 상세 패널 규칙 (08 17·18, 09 S-02, chagok-frontend#26) — 화면 없이

describe('panelFlow', () => {
  it('?reservation= 값: 없으면 닫힘(undefined), 양의 정수만 id, 나머지는 null(요청 안 함)', () => {
    expect(parseReservationId(null)).toBeUndefined()
    expect(parseReservationId('4')).toBe(4)
    for (const bad of ['', '0', '-1', '1.5', '4abc', 'abc', '99999999999999999999']) {
      expect(parseReservationId(bad)).toBeNull()
    }
  })

  it('변경은 예약에서만 (08 19, R9·R21)', () => {
    expect(canEdit('RESERVED')).toBe(true)
    expect(canEdit('IN_PROGRESS')).toBe(false)
    expect(canEdit('COMPLETED')).toBe(false)
    expect(canEdit('CANCELED')).toBe(false)
    expect(canEdit('NO_SHOW')).toBe(false)
  })

  it('취소는 예약·진행중에서만, 노쇼는 시각이 지난(needsAction) 예약만 (08 20·21, #31)', () => {
    expect(canCancel('RESERVED')).toBe(true)
    expect(canCancel('IN_PROGRESS')).toBe(true)
    for (const s of ['COMPLETED', 'CANCELED', 'NO_SHOW'] as const) expect(canCancel(s)).toBe(false)
    expect(canNoShow('RESERVED', true)).toBe(true)
    expect(canNoShow('RESERVED', false)).toBe(false)
    for (const s of ['IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW'] as const) expect(canNoShow(s, true)).toBe(false)
  })

  it('확인 대화상자 문구 (디자인 v3.0)', () => {
    expect(CONFIRM_TEXT.cancel.title).toBe('예약을 취소할까요?')
    expect(CONFIRM_TEXT.noShow.confirmLabel).toBe('노쇼 처리')
  })

  it('방문 완료는 예약·진행중에서만 (08 18)', () => {
    expect(canComplete('RESERVED')).toBe(true)
    expect(canComplete('IN_PROGRESS')).toBe(true)
    expect(canComplete('COMPLETED')).toBe(false)
    expect(canComplete('CANCELED')).toBe(false)
    expect(canComplete('NO_SHOW')).toBe(false)
  })

  it('상세 이동은 총 방문 3회 이상일 때만 활성 (08 17, 경계 2·3)', () => {
    expect(canOpenVehicleDetail(0)).toBe(false)
    expect(canOpenVehicleDetail(2)).toBe(false)
    expect(canOpenVehicleDetail(3)).toBe(true)
    expect(canOpenVehicleDetail(10)).toBe(true)
  })

  it('18의 409 두 가지만 패널을 다시 부른다', () => {
    expect(reloadsOnConflict('INVALID_STATUS_TRANSITION')).toBe(true)
    expect(reloadsOnConflict('CONCURRENT_MODIFICATION')).toBe(true)
    expect(reloadsOnConflict('INTERNAL_ERROR')).toBe(false)
    expect(reloadsOnConflict('NETWORK_ERROR')).toBe(false)
    expect(reloadsOnConflict('NOT_FOUND')).toBe(false)
  })

  it('표시: 일시·날짜는 문자열을 자를 뿐, 빈 연식·주행거리는 미입력', () => {
    expect(reservedAtText('2026-11-23T15:00:00')).toBe('11월 23일 (월) 15:00')
    expect(visitDateText('2026-10-24')).toBe('2026.10.24')
    expect(modelYearText(2018)).toBe('2018년식')
    expect(modelYearText(null)).toBe('연식 미입력')
    expect(mileageText(97000)).toBe('97,000 km')
    expect(mileageText(null)).toBe('주행거리 미입력')
    expect(recordTypeLabel('REPLACE')).toBe('교체')
    expect(recordTypeLabel('DECLINE')).toBe('거절')
    expect(recordTypeLabel('NEW_TYPE')).toBe('NEW_TYPE') // 모르는 값은 숨기지 않음
  })

  it('예약 목적: 고른 항목 순서 + 기타', () => {
    expect(purposeLabels({ items: [{ itemId: 6, name: '배터리' }], other: true, memo: null })).toEqual(['배터리', '기타'])
    expect(purposeLabels({ items: [], other: false, memo: '메모' })).toEqual([])
  })

  it('점검 주기 줄: 받은 순서 그대로, 목적 항목은 자리를 옮기지 않고 강조·꼬리표만 (D-63 B02)', () => {
    const base = { dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null, lastDecline: null, lastCaution: null } as const
    const items: PanelItemStatus[] = [
      { ...base, itemId: 1, code: 'ENGINE_OIL', name: '엔진오일', status: 'AHEAD', highlighted: false },
      { ...base, itemId: 6, code: 'BATTERY', name: '배터리', status: 'SOON', highlighted: true },
    ]
    expect(itemStatusRows(items)).toEqual([
      { id: 1, name: '엔진오일', status: 'AHEAD', highlighted: false, tag: undefined },
      { id: 6, name: '배터리', status: 'SOON', highlighted: true, tag: '예약 목적' },
    ])
  })

  it('꼬리표 (#29, F-CYC-02): 서버 값 그대로 붙이고 상태는 바꾸지 않는다, 예약 목적과 함께면 " · "로 잇는다', () => {
    const base = { dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null, lastDecline: null, lastCaution: null } as const
    const items: PanelItemStatus[] = [
      { ...base, itemId: 1, code: 'ENGINE_OIL', name: '엔진오일', status: 'DUE', highlighted: false, lastDecline: { date: '2026-10-24', memo: null } },
      { ...base, itemId: 5, code: 'TIRE', name: '타이어 상태 점검', status: 'AHEAD', highlighted: true, lastCaution: { date: '2026-09-24', memo: '앞 타이어 마모' } },
    ]
    expect(itemStatusRows(items)).toEqual([
      { id: 1, name: '엔진오일', status: 'DUE', highlighted: false, tag: '지난 방문 거절(2026.10.24)' },
      { id: 5, name: '타이어 상태 점검', status: 'AHEAD', highlighted: true, tag: '예약 목적 · 지난 점검 주의(2026.09.24, 앞 타이어 마모)' },
    ])
  })
})
