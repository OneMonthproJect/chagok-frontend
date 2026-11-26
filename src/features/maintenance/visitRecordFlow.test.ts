import { describe, expect, it } from 'vitest'
import {
  VISIT_MESSAGES as M,
  fieldErrorsToVisitForm,
  initialVisitRecordForm,
  missingNoticeText,
  parseWholeNumber,
  recordItems,
  selectionSummary,
  toVisitSaveRequest,
  requiredVehicleInfo,
  validateVisitRecordForm,
  vehicleMissing,
  type RecordChoice,
  type RecordRowInput,
  type VisitRecordForm,
} from './visitRecordFlow'
import type { ServiceItem } from './types'

// S-08 입력 폼 (09 S-08, 04 F-MNT-01~03, 08 12·13, D-58, 05 POL-30·121)

const TODAY = '2026-11-24'
const NONE_MISSING = { modelYear: false, latestMileage: false }

const item = (itemId: number, name: string, sortOrder: number, active = true): ServiceItem => ({
  itemId, code: 'ENGINE_OIL', name, cycleMonths: 6, cycleKm: 10000, active, sortOrder,
})
const ITEMS = [item(1, '엔진오일', 1), item(5, '타이어 상태 점검', 5), item(6, '배터리', 6)]

function row(choice: RecordChoice, memo = '', over: Partial<RecordRowInput> = {}): RecordRowInput {
  return { choice, memo, inspectResult: '', externalDate: '', externalMileage: '', ...over }
}

function formWith(over: Partial<VisitRecordForm>): VisitRecordForm {
  return { ...initialVisitRecordForm(TODAY), ...over }
}

describe('recordItems (08 13)', () => {
  it('쓰는 항목만 sortOrder 순', () => {
    const items = [item(6, '배터리', 6), item(2, '에어클리너', 2, false), item(1, '엔진오일', 1)]
    expect(recordItems(items).map((i) => i.itemId)).toEqual([1, 6])
  })
})

describe('initialVisitRecordForm', () => {
  it('방문일 기본은 넘긴 오늘, 기록은 모두 기록 안 함', () => {
    expect(initialVisitRecordForm(TODAY)).toEqual({ visitDate: TODAY, mileage: '', modelYear: '', records: {} })
  })
})

describe('parseWholeNumber', () => {
  it('빈 값은 null, 정수는 숫자(쉼표 허용), 그 밖은 NaN', () => {
    expect(parseWholeNumber('')).toBeNull()
    expect(parseWholeNumber('  ')).toBeNull()
    expect(parseWholeNumber('0')).toBe(0)
    expect(parseWholeNumber('55,000')).toBe(55000)
    expect(parseWholeNumber('2000000')).toBe(2_000_000)
    expect(parseWholeNumber('-1')).toBeNaN()
    expect(parseWholeNumber('1.5')).toBeNaN()
    expect(parseWholeNumber('abc')).toBeNaN()
  })
})

describe('validateVisitRecordForm', () => {
  const selected = { 1: row('REPLACE', '') }

  it('고른 항목이 없으면 form 오류', () => {
    expect(validateVisitRecordForm(formWith({}), ITEMS, NONE_MISSING, TODAY)).toEqual({ form: M.NONE_SELECTED })
  })

  it('오늘·과거 방문일은 통과, 미래는 막는다', () => {
    expect(validateVisitRecordForm(formWith({ records: selected }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
    expect(validateVisitRecordForm(formWith({ records: selected, visitDate: '2026-11-01' }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
    expect(validateVisitRecordForm(formWith({ records: selected, visitDate: '2026-11-25' }), ITEMS, NONE_MISSING, TODAY)).toEqual({
      visitDate: M.VISIT_DATE_FUTURE,
    })
    expect(validateVisitRecordForm(formWith({ records: selected, visitDate: '' }), ITEMS, NONE_MISSING, TODAY).visitDate).toBe(M.REQUIRED)
    expect(validateVisitRecordForm(formWith({ records: selected, visitDate: '2026-02-30' }), ITEMS, NONE_MISSING, TODAY).visitDate).toBe(M.DATE_FORMAT)
  })

  it('주행거리: 비우면 선택(차량에 있을 때), 0 이상 정수만. 범위(2,000,000)는 서버가 본다', () => {
    const check = (mileage: string) => validateVisitRecordForm(formWith({ records: selected, mileage }), ITEMS, NONE_MISSING, TODAY)
    expect(check('')).toEqual({})
    expect(check('0')).toEqual({})
    expect(check('2000000')).toEqual({})
    expect(check('2000001')).toEqual({}) // 서버 400 fieldErrors로 칸에 보인다
    expect(check('-1')).toEqual({ mileage: M.NOT_INTEGER })
    expect(check('1.5')).toEqual({ mileage: M.NOT_INTEGER })
  })

  it('D-58: 차량에 주행거리·연식이 비어 있으면 필수', () => {
    const missing = { modelYear: true, latestMileage: true }
    expect(validateVisitRecordForm(formWith({ records: selected }), ITEMS, missing, TODAY)).toEqual({
      mileage: M.MILEAGE_EMPTY,
      modelYear: M.MODEL_YEAR_EMPTY,
    })
    expect(validateVisitRecordForm(formWith({ records: selected, mileage: '12000', modelYear: '20x' }), ITEMS, missing, TODAY)).toEqual({
      modelYear: M.NOT_INTEGER,
    })
    expect(validateVisitRecordForm(formWith({ records: selected, mileage: '12000', modelYear: '2019' }), ITEMS, missing, TODAY)).toEqual({})
  })

  it('연식이 차량에 있으면 연식 칸은 보지 않는다', () => {
    expect(validateVisitRecordForm(formWith({ records: selected, modelYear: 'x' }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
  })

  it('메모 길이는 화면에서 다시 검사하지 않는다(칸의 maxLength + 서버 400, 같은 규칙을 두 번 쓰지 않음)', () => {
    const records = { 5: row('INSPECT', 'a'.repeat(201)) }
    expect(validateVisitRecordForm(formWith({ records }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
  })
})

describe('toVisitSaveRequest (08 12)', () => {
  it('고른 줄만 항목 순서대로, 빈 메모는 null, 방문일은 문자열 그대로', () => {
    const form = formWith({
      visitDate: '2026-11-20',
      mileage: '55,000',
      records: {
        5: row('INSPECT', ' 앞 타이어 마모 확인 '),
        1: row('REPLACE', '  '),
        6: row('NONE', '지워지지 않은 메모'),
      },
    })
    expect(toVisitSaveRequest(form, ITEMS, NONE_MISSING)).toEqual({
      visitDate: '2026-11-20',
      mileage: 55000,
      records: [
        { itemId: 1, type: 'REPLACE', memo: null },
        { itemId: 5, type: 'INSPECT', memo: '앞 타이어 마모 확인' },
      ],
    })
  })

  it('주행거리를 비우면 null, 연식은 차량에 비어 있을 때만 vehicle.modelYear로', () => {
    const form = formWith({ modelYear: '2019', records: { 1: row('REPLACE', '') } })
    expect(toVisitSaveRequest(form, ITEMS, NONE_MISSING)).toEqual({
      visitDate: TODAY,
      mileage: null,
      records: [{ itemId: 1, type: 'REPLACE', memo: null }],
    })
    expect(toVisitSaveRequest({ ...form, mileage: '12000' }, ITEMS, { modelYear: true, latestMileage: true })).toEqual({
      visitDate: TODAY,
      mileage: 12000,
      vehicle: { modelYear: 2019 },
      records: [{ itemId: 1, type: 'REPLACE', memo: null }],
    })
  })
})

describe('fieldErrorsToVisitForm (400 fieldErrors → 칸)', () => {
  it('방문일·주행거리·연식은 그 칸, records[i].memo는 보낸 i번째 항목, 나머지는 위쪽 한 줄', () => {
    const errors = fieldErrorsToVisitForm(
      [
        { field: 'visitDate', reason: '오늘 이전 날짜만 입력할 수 있습니다.' },
        { field: 'mileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' },
        { field: 'vehicle.modelYear', reason: '1980년부터 2027년까지 입력할 수 있습니다.' },
        { field: 'records[1].memo', reason: '200자 이하로 입력해 주세요.' },
        { field: 'records[].itemId', reason: '사용할 수 없는 항목입니다.' },
        { field: 'records[0].itemId', reason: '같은 항목을 두 번 넣을 수 없습니다.' },
      ],
      [1, 5],
    )
    expect(errors).toEqual({
      visitDate: '오늘 이전 날짜만 입력할 수 있습니다.',
      mileage: '0 이상 2,000,000 이하로 입력해 주세요.',
      modelYear: '1980년부터 2027년까지 입력할 수 있습니다.',
      memo: { 5: '200자 이하로 입력해 주세요.' },
      form: '사용할 수 없는 항목입니다. 같은 항목을 두 번 넣을 수 없습니다.',
    })
  })
})

describe('문구', () => {
  it('고른 것 요약', () => {
    const form = formWith({ records: { 6: row('INSPECT', ''), 1: row('REPLACE', '') } })
    expect(selectionSummary(formWith({}), ITEMS)).toBe(M.NONE_SELECTED)
    expect(selectionSummary(form, ITEMS)).toBe('2개 항목 · 엔진오일(교체), 배터리(점검)')
  })

  it('비어 있는 값 안내', () => {
    expect(vehicleMissing({ modelYear: null, latestMileage: 100 })).toEqual({ modelYear: true, latestMileage: false })
    expect(missingNoticeText({ modelYear: true, latestMileage: true })).toContain('연식·주행거리가 비어 있어')
    expect(missingNoticeText({ modelYear: false, latestMileage: true })).toContain('이 차량은 주행거리가 비어 있어')
  })
})

describe('P0-나머지 구분: 거절·외부·점검 결과 (F-MNT-02·03, 08 12)', () => {
  it('요청: 거절은 메모만, 외부는 정비일·주행거리(비우면 null), 점검은 결과를 골랐을 때만 inspectResult — 08 12 P0-나머지 예시 모양', () => {
    const form = formWith({
      mileage: '55000',
      records: {
        1: row('REPLACE'),
        4: row('DECLINE', '다음 방문 때 하기로 함'),
        3: row('EXTERNAL', '다른 곳에서 교체했다고 함', { externalDate: '2026-10-01' }),
        5: row('INSPECT', '앞 타이어 마모', { inspectResult: 'CAUTION' }),
      },
    })
    const items = [item(1, '엔진오일', 1), item(3, '에어컨필터', 3), item(4, '브레이크패드', 4), item(5, '타이어 상태 점검', 5)]
    expect(toVisitSaveRequest(form, items, NONE_MISSING)).toEqual({
      visitDate: TODAY,
      mileage: 55000,
      records: [
        { itemId: 1, type: 'REPLACE', memo: null },
        { itemId: 3, type: 'EXTERNAL', externalDate: '2026-10-01', externalMileage: null, memo: '다른 곳에서 교체했다고 함' },
        { itemId: 4, type: 'DECLINE', memo: '다음 방문 때 하기로 함' },
        { itemId: 5, type: 'INSPECT', inspectResult: 'CAUTION', memo: '앞 타이어 마모' },
      ],
    })
  })

  it('구분을 바꾸면 다른 구분에서 쓴 값은 요청에 넣지 않는다 (점검 결과를 고른 뒤 교체, 외부 정비일을 쓴 뒤 거절)', () => {
    const form = formWith({
      records: {
        1: row('REPLACE', '', { inspectResult: 'GOOD', externalDate: '2026-10-01' }),
        5: row('DECLINE', '', { externalDate: '2026-10-01', externalMileage: '3000' }),
      },
    })
    expect(toVisitSaveRequest(form, ITEMS, NONE_MISSING).records).toEqual([
      { itemId: 1, type: 'REPLACE', memo: null },
      { itemId: 5, type: 'DECLINE', memo: null },
    ])
  })

  it('외부 주행거리는 쉼표를 지워 숫자로', () => {
    const form = formWith({ records: { 1: row('EXTERNAL', '', { externalDate: '2026-10-01', externalMileage: '41,000' }) } })
    expect(toVisitSaveRequest(form, ITEMS, NONE_MISSING).records[0]).toMatchObject({ externalMileage: 41000 })
  })

  it('외부 정비일: 비우면 필수, 미래는 막고 오늘·과거는 통과 / 외부 주행거리는 0 이상 정수만', () => {
    const external = (over: Partial<RecordRowInput>) => formWith({ records: { 1: row('EXTERNAL', '', over) } })
    expect(validateVisitRecordForm(external({}), ITEMS, NONE_MISSING, TODAY)).toEqual({ externalDate: { 1: M.REQUIRED } })
    expect(validateVisitRecordForm(external({ externalDate: '2026-11-25' }), ITEMS, NONE_MISSING, TODAY)).toEqual({
      externalDate: { 1: M.VISIT_DATE_FUTURE },
    })
    expect(validateVisitRecordForm(external({ externalDate: TODAY }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
    expect(validateVisitRecordForm(external({ externalDate: '2025-01-02' }), ITEMS, NONE_MISSING, TODAY)).toEqual({})
    expect(validateVisitRecordForm(external({ externalDate: '2026-10-01', externalMileage: '-1' }), ITEMS, NONE_MISSING, TODAY)).toEqual({
      externalMileage: { 1: M.NOT_INTEGER },
    })
  })

  it('외부가 아닌 줄의 외부 정비일은 검사하지 않는다 (구분을 바꿔 남은 값)', () => {
    const form = formWith({ records: { 1: row('DECLINE', '', { externalDate: '2099-01-01', externalMileage: 'x' }) } })
    expect(validateVisitRecordForm(form, ITEMS, NONE_MISSING, TODAY)).toEqual({})
  })

  it('D-58: 거절·외부만 고르면 비어 있는 연식·주행거리를 묻지 않고, 교체·점검이 하나라도 있으면 묻는다 (08 12)', () => {
    const missing = { modelYear: true, latestMileage: true }
    const onlyDecline = formWith({ records: { 1: row('DECLINE'), 5: row('EXTERNAL', '', { externalDate: '2026-10-01' }) } })
    expect(requiredVehicleInfo(onlyDecline, ITEMS, missing)).toEqual(NONE_MISSING)
    expect(validateVisitRecordForm(onlyDecline, ITEMS, missing, TODAY)).toEqual({})
    expect(toVisitSaveRequest(onlyDecline, ITEMS, missing)).not.toHaveProperty('vehicle')

    const withInspect = formWith({ records: { ...onlyDecline.records, 6: row('INSPECT') } })
    expect(requiredVehicleInfo(withInspect, ITEMS, missing)).toEqual(missing)
    expect(validateVisitRecordForm(withInspect, ITEMS, missing, TODAY)).toEqual({ mileage: M.MILEAGE_EMPTY, modelYear: M.MODEL_YEAR_EMPTY })
  })

  it('400 fieldErrors: records[i].externalDate·externalMileage는 보낸 i번째 항목의 칸, inspectResult는 위쪽 한 줄', () => {
    const errors = fieldErrorsToVisitForm(
      [
        { field: 'records[0].externalDate', reason: '오늘 이전 날짜만 입력할 수 있습니다.' },
        { field: 'records[0].externalMileage', reason: '0 이상 2,000,000 이하로 입력해 주세요.' },
        { field: 'records[1].inspectResult', reason: '형식이 올바르지 않습니다.' },
      ],
      [3, 5],
    )
    expect(errors).toEqual({
      externalDate: { 3: '오늘 이전 날짜만 입력할 수 있습니다.' },
      externalMileage: { 3: '0 이상 2,000,000 이하로 입력해 주세요.' },
      form: '형식이 올바르지 않습니다.',
    })
  })

  it('요약에 거절·외부 구분 글자', () => {
    const form = formWith({ records: { 1: row('DECLINE'), 5: row('EXTERNAL') } })
    expect(selectionSummary(form, ITEMS)).toBe('2개 항목 · 엔진오일(거절), 타이어 상태 점검(외부)')
  })
})
