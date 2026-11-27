import { describe, expect, it } from 'vitest'
import {
  EDIT_DISABLED_REASON,
  editPermission,
  findRecord,
  recordEditForm,
  revisionChangeText,
  revisionHeadText,
  toRecordUpdate,
  validateRecordEdit,
  withCurrentStaff,
} from './recordEditFlow'
import type { Visit, VisitRecord } from './types'

// 정비 기록 수정 (04 F-MNT-04 H1~H11, 09 S-07·M-03, 08 7.1 37·38, #34): 버튼 활성·요청 모양·이력 문구 (화면 없이)

const RECORD = (over: Partial<VisitRecord> = {}): VisitRecord => ({
  recordId: 16,
  itemId: 1,
  itemName: '엔진오일',
  type: 'REPLACE',
  date: '2026-11-24',
  memo: null,
  source: 'SHOP',
  inspectResult: null,
  version: 0,
  edited: false,
  staff: { staffId: 2, name: '김정비' },
  ...over,
})
const OWNER = { staffId: 1, role: 'OWNER' }
const MECHANIC = { staffId: 2, role: 'MECHANIC' }
const OTHER_MECHANIC = { staffId: 3, role: 'MECHANIC' }

describe('editPermission (09 S-07 수정 버튼, 08 37 권한)', () => {
  it('사장은 남의 담당·기간과 관계없이 활성 (H11)', () => {
    expect(editPermission(RECORD({ date: '2020-01-01' }), OWNER, '2026-11-27')).toEqual({ enabled: true, reason: null })
  })

  it('정비사: 본인 담당이 아니면 비활성 + 이유 (H3)', () => {
    expect(editPermission(RECORD(), OTHER_MECHANIC, '2026-11-24')).toEqual({ enabled: false, reason: EDIT_DISABLED_REASON.NOT_ASSIGNEE })
  })

  it('정비사: 방문일 + 3일까지 활성, 4일째 비활성 (H10, 오늘 ≤ 방문일 + 3일)', () => {
    expect(editPermission(RECORD({ date: '2026-11-24' }), MECHANIC, '2026-11-27').enabled).toBe(true)
    expect(editPermission(RECORD({ date: '2026-11-24' }), MECHANIC, '2026-11-28')).toEqual({
      enabled: false,
      reason: EDIT_DISABLED_REASON.PERIOD_EXPIRED,
    })
    expect(editPermission(RECORD({ date: '2026-11-29' }), MECHANIC, '2026-12-02').enabled).toBe(true) // 달이 바뀌어도
  })

  it('외부 기록은 저장일 기준이라(11에 없음) 기간으로 막지 않는다 — 담당이면 활성, 판정은 서버 403', () => {
    expect(editPermission(RECORD({ type: 'EXTERNAL', date: '2026-01-01' }), MECHANIC, '2026-11-27').enabled).toBe(true)
    expect(editPermission(RECORD({ type: 'EXTERNAL' }), OTHER_MECHANIC, '2026-11-27').enabled).toBe(false)
  })

  it('로그인 계정을 아직 모르면 비활성', () => {
    expect(editPermission(RECORD(), null, '2026-11-24')).toEqual({ enabled: false, reason: EDIT_DISABLED_REASON.LOADING })
  })
})

describe('toRecordUpdate (08 37 보낸 필드만)', () => {
  const visit = { mileage: 45000 }

  it('바꾼 칸만 + 읽은 version, 사유는 공백을 빼고 (08 37 예시 모양)', () => {
    const initial = recordEditForm(RECORD(), visit)
    const body = toRecordUpdate({ ...initial, mileage: '52000', memo: ' 합성유 사용 ', reason: ' 입력 누락 보완 ' }, initial, 0)
    expect(body).toEqual({ version: 0, mileage: 52000, memo: '합성유 사용', reason: '입력 누락 보완' })
  })

  it('바꾼 칸이 없으면 null (사유만 적어도 요청하지 않음 — 서버도 400, H8)', () => {
    const initial = recordEditForm(RECORD(), visit)
    expect(toRecordUpdate({ ...initial, reason: '사유만' }, initial, 0)).toBeNull()
    expect(toRecordUpdate({ ...initial, memo: '  ' }, initial, 0)).toBeNull() // 원래 메모 없음 + 공백 = 그대로
  })

  it('구분 교체 → 점검이면 점검 결과를 함께 보낸다 (08 37 구분 정정 예시), 결과 없음이면 type만', () => {
    const initial = recordEditForm(RECORD(), visit)
    expect(toRecordUpdate({ ...initial, type: 'INSPECT', inspectResult: 'CAUTION' }, initial, 1)).toEqual({
      version: 1,
      type: 'INSPECT',
      inspectResult: 'CAUTION',
    })
    expect(toRecordUpdate({ ...initial, type: 'INSPECT' }, initial, 1)).toEqual({ version: 1, type: 'INSPECT' })
  })

  it('구분을 점검 밖으로 바꾸면 점검 결과는 보내지 않는다(서버가 비움)', () => {
    const initial = recordEditForm(RECORD({ type: 'INSPECT', inspectResult: 'GOOD' }), visit)
    expect(toRecordUpdate({ ...initial, type: 'DECLINE' }, initial, 0)).toEqual({ version: 0, type: 'DECLINE' })
  })

  it('메모를 비우면 "" (08 37 빈 문자열이면 비운다), 항목·담당은 숫자로', () => {
    const initial = recordEditForm(RECORD({ memo: '오일 누유' }), visit)
    expect(toRecordUpdate({ ...initial, memo: '', itemId: '3', mechanicId: '1' }, initial, 2)).toEqual({
      version: 2,
      itemId: 3,
      memo: '',
      mechanicId: 1,
    })
  })

  it('방문 주행거리로 채운 칸을 그대로 두면 주행거리는 보내지 않는다', () => {
    const initial = recordEditForm(RECORD(), visit)
    expect(initial.mileage).toBe('45000')
    expect(toRecordUpdate({ ...initial, recordDate: '2026-11-23' }, initial, 0)).toEqual({ version: 0, recordDate: '2026-11-23' })
  })
})

describe('validateRecordEdit (08 37 요청 표)', () => {
  const initial = recordEditForm(RECORD(), { mileage: 45000 })

  it('미래 방문일은 칸 오류 (H6), 오늘은 된다', () => {
    expect(validateRecordEdit({ ...initial, recordDate: '2026-11-25' }, initial, '2026-11-24').recordDate).toBeDefined()
    expect(validateRecordEdit({ ...initial, recordDate: '2026-11-24' }, initial, '2026-11-24')).toEqual({})
  })

  it('주행거리: 정수 0~2,000,000, 값이 있던 칸은 비울 수 없음', () => {
    expect(validateRecordEdit({ ...initial, mileage: '12.5' }, initial, '2026-11-24').mileage).toBeDefined()
    expect(validateRecordEdit({ ...initial, mileage: '2000001' }, initial, '2026-11-24').mileage).toBeDefined()
    expect(validateRecordEdit({ ...initial, mileage: '' }, initial, '2026-11-24').mileage).toBe('비울 수 없습니다.')
    const empty = recordEditForm(RECORD(), { mileage: null })
    expect(validateRecordEdit(empty, empty, '2026-11-24')).toEqual({})
  })

  it('메모·사유 200자, 점검 그대로 결과만 지우기는 막는다', () => {
    expect(validateRecordEdit({ ...initial, memo: 'a'.repeat(201) }, initial, '2026-11-24').memo).toBeDefined()
    expect(validateRecordEdit({ ...initial, reason: 'a'.repeat(201) }, initial, '2026-11-24').reason).toBeDefined()
    const inspect = recordEditForm(RECORD({ type: 'INSPECT', inspectResult: 'CAUTION' }), { mileage: null })
    expect(validateRecordEdit({ ...inspect, inspectResult: '' }, inspect, '2026-11-24').inspectResult).toBeDefined()
  })
})

describe('수정 이력 문구 (08 38, 09 S-07 「항목명: 전 → 후」)', () => {
  it('필드별 글자: 날짜 점 표기, km, 구분·결과 글자, 항목·담당은 이름, 없으면 "없음"', () => {
    expect(revisionChangeText({ field: 'mileage', before: null, after: 52000 })).toBe('주행거리: 없음 → 52,000 km')
    expect(revisionChangeText({ field: 'memo', before: null, after: '합성유 사용' })).toBe('메모: 없음 → 합성유 사용')
    expect(revisionChangeText({ field: 'type', before: 'REPLACE', after: 'INSPECT' })).toBe('구분: 교체 → 점검')
    expect(revisionChangeText({ field: 'inspectResult', before: null, after: 'CAUTION' })).toBe('점검 결과: 없음 → 주의')
    expect(revisionChangeText({ field: 'recordDate', before: '2026-10-24', after: '2026-10-23' })).toBe('방문일: 2026.10.24 → 2026.10.23')
    expect(
      revisionChangeText({ field: 'item', before: { itemId: 1, name: '엔진오일' }, after: { itemId: 3, name: '에어컨필터' } }),
    ).toBe('항목: 엔진오일 → 에어컨필터')
    expect(
      revisionChangeText({ field: 'mechanic', before: { staffId: 2, name: '김정비' }, after: { staffId: 1, name: '박사장' } }),
    ).toBe('담당 정비사: 김정비 → 박사장')
  })

  it('머리: 수정 날짜 · 수정자', () => {
    expect(revisionHeadText({ changedAt: '2026-11-25T10:05:00', changedBy: { staffId: 1, name: '박사장' } })).toBe('2026.11.25 10:05 · 박사장')
  })
})

describe('보조', () => {
  it('findRecord: 다시 받은 11에서 같은 기록과 방문, 없으면 null', () => {
    const visits: Visit[] = [{ visitKey: 'a', visitDate: '2026-11-24', mileage: null, staffName: '김정비', records: [RECORD({ version: 1 })] }]
    expect(findRecord(visits, 16)?.record.version).toBe(1)
    expect(findRecord(visits, 99)).toBeNull()
  })

  it('withCurrentStaff: 후보에 지금 담당이 없으면 앞에 한 줄 더한다', () => {
    expect(withCurrentStaff([], { staffId: 2, name: '김정비' })).toEqual([{ staffId: 2, label: '김정비' }])
    const options = [{ staffId: 2, label: '김정비 (정비사)' }]
    expect(withCurrentStaff(options, { staffId: 2, name: '김정비' })).toBe(options)
  })
})
