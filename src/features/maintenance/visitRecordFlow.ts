// S-08 방문·정비 기록 입력 폼의 순수 함수 (09 S-08, 04 F-MNT-01~03, 08 12·13, 05 POL-30·120~125, D-58).
// - 폼은 입력 문자열을 그대로 들고 있고, 저장할 때만 08 12 요청으로 바꾼다. 방문일은 "YYYY-MM-DD" 문자열 그대로 보낸다(시간대 변환 없음).
// - 프론트 검사는 "필수인지·정수인지"와 "미래 방문일"만 본다. 범위(주행거리 0~2,000,000, 연식 1980~올해+1, 08 0.1)와
//   메모 200자는 서버가 400 INVALID_INPUT + fieldErrors로 알려 주고 그 칸에 보인다 — 같은 규칙을 화면에 다시 쓰지 않는다
//   (메모 칸은 maxLength로 200자 넘게 입력되지 않게만 한다).
// - 구분은 기록 안 함 / 교체 / 점검 / 거절 / 외부(#29, F-MNT-02·03). 점검이면 결과 양호·주의(선택), 외부면 정비일(필수)·주행거리(선택).
//   외부 정비일은 미래만 막는다(08 12 「오늘 이전」). 외부 주행거리 범위는 서버가 본다(위와 같음).
// - 차량에 비어 있는 연식·주행거리(D-58)는 교체·점검을 고른 경우에만 필수다(08 12). 거절·외부만 저장할 때는 묻지 않는다.
// - 담당 정비사(08 12 mechanicId, F-MNT-01)는 #62가 더한다.

import type { FieldError } from '@/shared/api/client'
import { isValidDate } from '@/shared/lib/date'
import { INSPECT_RESULT_LABELS, RECORD_TYPE_LABELS } from './maintenanceFlow'
import type { InspectResult, ServiceItem, VisitRecordInput, VisitSaveRequest } from './types'

/** 줄마다 고르는 값. NONE은 요청에 넣지 않는다(기록 안 함이 기본, 09 S-08) */
export type RecordChoice = 'NONE' | 'REPLACE' | 'INSPECT' | 'DECLINE' | 'EXTERNAL'

/**
 * 한 줄의 입력. 구분을 바꿔도 다른 구분에서 쓴 값(점검 결과·외부 정비일·주행거리·메모)은 지우지 않는다(다시 고르면 그대로).
 * 요청에는 고른 구분에 맞는 값만 넣는다(toVisitSaveRequest).
 */
export interface RecordRowInput {
  choice: RecordChoice
  memo: string
  /** 점검 결과. ''이면 고르지 않음(선택 입력, F-MNT-03) */
  inspectResult: '' | InspectResult
  /** 외부 정비일 "YYYY-MM-DD" */
  externalDate: string
  /** 외부 정비 때 주행거리 (입력 글자 그대로) */
  externalMileage: string
}

export interface VisitRecordForm {
  visitDate: string
  mileage: string
  modelYear: string
  /** itemId → 그 줄의 입력 */
  records: Record<number, RecordRowInput>
}

/** 차량에 비어 있는 값 (08 09 modelYear·latestMileage가 null). 비어 있으면 저장에 필수(D-58) */
export interface VehicleMissing {
  modelYear: boolean
  latestMileage: boolean
}

export interface VisitRecordErrors {
  visitDate?: string
  mileage?: string
  modelYear?: string
  /** 칸에 붙일 수 없는 오류(기록 0개, 항목 중복·쓰지 않는 항목 등) — 화면 위쪽에 보인다 */
  form?: string
  /** itemId → 메모 오류 */
  memo?: Record<number, string>
  /** itemId → 외부 정비일 오류 */
  externalDate?: Record<number, string>
  /** itemId → 외부 주행거리 오류 */
  externalMileage?: Record<number, string>
}

/** 줄마다 붙는 오류 칸 (VisitRecordErrors의 itemId별 묶음) */
export const ROW_ERROR_FIELDS = ['memo', 'externalDate', 'externalMileage'] as const
export type RowErrorField = (typeof ROW_ERROR_FIELDS)[number]

export const RECORD_CHOICES: { value: RecordChoice; label: string }[] = [
  { value: 'NONE', label: '기록 안 함' },
  { value: 'REPLACE', label: RECORD_TYPE_LABELS.REPLACE },
  { value: 'INSPECT', label: RECORD_TYPE_LABELS.INSPECT },
  { value: 'DECLINE', label: RECORD_TYPE_LABELS.DECLINE },
  { value: 'EXTERNAL', label: RECORD_TYPE_LABELS.EXTERNAL },
]

/** 점검 결과 선택지 (08 0.4, F-MNT-03). 고르지 않으면 요청에 넣지 않는다 */
export const INSPECT_RESULT_CHOICES: { value: '' | InspectResult; label: string }[] = [
  { value: '', label: '고르지 않음' },
  { value: 'GOOD', label: INSPECT_RESULT_LABELS.GOOD },
  { value: 'CAUTION', label: INSPECT_RESULT_LABELS.CAUTION },
]

/** 상태 기준(차량 연식·주행거리 D-58)이 필요한 구분 — 교체·점검 (08 12) */
const NEEDS_VEHICLE_INFO: RecordChoice[] = ['REPLACE', 'INSPECT']

export const MEMO_MAX = 200

/** 문구. 서버 문구와 같은 것은 서버와 같게 둔다(chagok-backend MaintenanceService·VisitSaveRequest) */
export const VISIT_MESSAGES = {
  PAGE_TITLE: '방문·정비 기록',
  PAGE_DESCRIPTION: '저장하면 차량 상세로 이동해 바뀐 상태를 보여 줍니다.',
  PICK_TITLE: '기록할 차량',
  PICK_DESCRIPTION: '차량번호·고객명·연락처로 찾아 고르세요.',
  CHANGE_VEHICLE: '차량 바꾸기',
  VISIT_INFO_TITLE: '방문 정보',
  RECORDS_TITLE: '정비 항목 기록',
  RECORDS_DESCRIPTION:
    '이번 방문에서 한 일만 고르세요. 교체·외부는 다음 정비일을 다시 계산하고, 점검·거절은 상태를 바꾸지 않습니다.',
  EXTERNAL_DATE_HINT: '고객이 말한 날짜. 모르면 외부로 기록하지 않습니다.',
  EXTERNAL_MILEAGE_HINT: '고객이 말한 주행거리 (모르면 비워 두세요)',
  VISIT_DATE_HINT: '오늘 이전·오늘만 고를 수 있습니다.',
  MILEAGE_HINT: '최근 주행거리보다 크면 차량의 최근 주행거리도 함께 바뀝니다.',
  MISSING_TITLE: '연식·주행거리를 입력해 주세요.',
  REQUIRED: '필수 입력입니다.',
  NOT_INTEGER: '0 이상의 정수로 입력해 주세요.',
  VISIT_DATE_FUTURE: '오늘 이전 날짜만 입력할 수 있습니다.',
  MODEL_YEAR_EMPTY: '차량의 연식이 비어 있어 입력해 주세요.',
  MILEAGE_EMPTY: '차량의 주행거리가 비어 있어 입력해 주세요.',
  DATE_FORMAT: '날짜 형식이 올바르지 않습니다.',
  NONE_SELECTED: '기록할 항목을 1개 이상 골라 주세요.',
  SAVE: '저장',
  CANCEL: '취소',
  SAVE_FAILED: '저장하지 못했습니다.',
  CHECK_SAVED: '차량 상세에서 저장됐는지 확인 (새 창)',
  CHECK_INPUT: '입력값을 확인해 주세요.',
  ITEMS_FAILED: '정비 항목을 불러오지 못했습니다.',
} as const

/** 비어 있는 값 안내 본문: "이 차량은 연식·주행거리가 비어 있어 …" */
export function missingNoticeText(missing: VehicleMissing): string {
  const names = [missing.modelYear && '연식', missing.latestMileage && '주행거리'].filter(Boolean).join('·')
  return `이 차량은 ${names}가 비어 있어 교체·점검을 저장하려면 함께 입력해야 합니다. 입력한 값은 차량 정보에도 저장됩니다.`
}

export function vehicleMissing(vehicle: { modelYear: number | null; latestMileage: number | null }): VehicleMissing {
  return { modelYear: vehicle.modelYear == null, latestMileage: vehicle.latestMileage == null }
}

export function hasMissing(missing: VehicleMissing): boolean {
  return missing.modelYear || missing.latestMileage
}

/** 쓰는 항목만, 서버의 sortOrder 순 (08 13) */
export function recordItems(items: ServiceItem[]): ServiceItem[] {
  return items.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 방문일 기본 = 서울 기준 오늘(화면이 shared/lib/date의 todaySeoul로 넘긴다) */
export function initialVisitRecordForm(today: string): VisitRecordForm {
  return { visitDate: today, mileage: '', modelYear: '', records: {} }
}

const EMPTY_ROW: RecordRowInput = { choice: 'NONE', memo: '', inspectResult: '', externalDate: '', externalMileage: '' }

export function rowOf(form: VisitRecordForm, itemId: number): RecordRowInput {
  return form.records[itemId] ?? EMPTY_ROW
}

/** 기록 안 함이 아닌 줄 (항목 순서대로) */
export function selectedRows(form: VisitRecordForm, items: Pick<ServiceItem, 'itemId' | 'name'>[]) {
  return items
    .map((item) => ({ item, row: rowOf(form, item.itemId) }))
    .filter(({ row }) => row.choice !== 'NONE')
}

/** 아래 막대 요약: "2개 항목 · 엔진오일(교체), 타이어 상태 점검(점검)". 고른 것이 없으면 안내 문구 */
export function selectionSummary(form: VisitRecordForm, items: Pick<ServiceItem, 'itemId' | 'name'>[]): string {
  const rows = selectedRows(form, items)
  if (rows.length === 0) return VISIT_MESSAGES.NONE_SELECTED
  const labels = rows.map(({ item, row }) => `${item.name}(${RECORD_CHOICES.find((c) => c.value === row.choice)?.label})`)
  return `${rows.length}개 항목 · ${labels.join(', ')}`
}

/**
 * 이번 저장에 필수인 차량 값 (D-58, 08 12): 차량에 비어 있고, 교체·점검을 1개 이상 골랐을 때만.
 * 거절·외부만 고르면 둘 다 false. 칸은 비어 있는 동안 계속 보이고(missing), 필수 표시만 이 값을 따른다.
 */
export function requiredVehicleInfo(
  form: VisitRecordForm,
  items: Pick<ServiceItem, 'itemId' | 'name'>[],
  missing: VehicleMissing,
): VehicleMissing {
  const needs = selectedRows(form, items).some(({ row }) => NEEDS_VEHICLE_INFO.includes(row.choice))
  return { modelYear: needs && missing.modelYear, latestMileage: needs && missing.latestMileage }
}

/** "" → null, 0 이상의 정수 문자열 → 숫자, 그 밖 → NaN. 쉼표는 지운다("55,000") */
export function parseWholeNumber(text: string): number | null {
  const value = text.replace(/,/g, '').trim()
  if (value === '') return null
  return /^\d+$/.test(value) ? Number(value) : Number.NaN
}

/** 저장 전 검사. 빈 객체면 통과 */
export function validateVisitRecordForm(
  form: VisitRecordForm,
  items: Pick<ServiceItem, 'itemId' | 'name'>[],
  missing: VehicleMissing,
  today: string,
): VisitRecordErrors {
  const errors: VisitRecordErrors = {}
  const required = requiredVehicleInfo(form, items, missing)

  if (!form.visitDate) errors.visitDate = VISIT_MESSAGES.REQUIRED
  else if (!isValidDate(form.visitDate)) errors.visitDate = VISIT_MESSAGES.DATE_FORMAT
  else if (form.visitDate > today) errors.visitDate = VISIT_MESSAGES.VISIT_DATE_FUTURE

  const mileage = parseWholeNumber(form.mileage)
  if (Number.isNaN(mileage)) errors.mileage = VISIT_MESSAGES.NOT_INTEGER
  else if (mileage == null && required.latestMileage) errors.mileage = VISIT_MESSAGES.MILEAGE_EMPTY

  if (missing.modelYear) {
    const modelYear = parseWholeNumber(form.modelYear)
    if (Number.isNaN(modelYear)) errors.modelYear = VISIT_MESSAGES.NOT_INTEGER
    else if (modelYear == null && required.modelYear) errors.modelYear = VISIT_MESSAGES.MODEL_YEAR_EMPTY
  }

  const rows = selectedRows(form, items)
  if (rows.length === 0) errors.form = VISIT_MESSAGES.NONE_SELECTED

  for (const { item, row } of rows) {
    if (row.choice !== 'EXTERNAL') continue
    let dateError: string | undefined
    if (!row.externalDate) dateError = VISIT_MESSAGES.REQUIRED
    else if (!isValidDate(row.externalDate)) dateError = VISIT_MESSAGES.DATE_FORMAT
    else if (row.externalDate > today) dateError = VISIT_MESSAGES.VISIT_DATE_FUTURE
    if (dateError) errors.externalDate = { ...errors.externalDate, [item.itemId]: dateError }
    if (Number.isNaN(parseWholeNumber(row.externalMileage))) {
      errors.externalMileage = { ...errors.externalMileage, [item.itemId]: VISIT_MESSAGES.NOT_INTEGER }
    }
  }

  return errors
}

export function hasVisitErrors(errors: VisitRecordErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * 08 12 요청. records는 항목 순서대로 고른 줄만, 빈 메모는 null. 구분에 맞는 값만 넣는다:
 * 점검은 결과를 골랐을 때만 inspectResult, 외부는 externalDate·externalMileage(비우면 null, 08 12 P0-나머지 예시).
 * vehicle.modelYear는 차량에 연식이 비어 있고 값을 넣었을 때만 보낸다(D-58). 주행거리는 비우면 null.
 * validateVisitRecordForm을 통과한 폼만 넘긴다.
 */
export function toVisitSaveRequest(
  form: VisitRecordForm,
  items: Pick<ServiceItem, 'itemId' | 'name'>[],
  missing: VehicleMissing,
): VisitSaveRequest {
  const records: VisitRecordInput[] = selectedRows(form, items).map(({ item, row }) => {
    const record: VisitRecordInput = {
      itemId: item.itemId,
      type: row.choice as VisitRecordInput['type'],
      memo: row.memo.trim() === '' ? null : row.memo.trim(),
    }
    if (row.choice === 'INSPECT' && row.inspectResult) record.inspectResult = row.inspectResult
    if (row.choice === 'EXTERNAL') {
      record.externalDate = row.externalDate
      record.externalMileage = parseWholeNumber(row.externalMileage)
    }
    return record
  })
  const request: VisitSaveRequest = { visitDate: form.visitDate, mileage: parseWholeNumber(form.mileage), records }
  const modelYear = parseWholeNumber(form.modelYear)
  if (missing.modelYear && modelYear != null) request.vehicle = { modelYear }
  return request
}

/**
 * 서버 400 fieldErrors → 칸. records[i]는 보낸 요청의 i번째 기록(sentItemIds[i])으로 잇는다(메모·외부 정비일·외부 주행거리).
 * 칸에 붙일 수 없는 것(records, records[].itemId, records[i].type·inspectResult 등)은 form 한 줄로 모은다.
 */
export function fieldErrorsToVisitForm(fieldErrors: FieldError[], sentItemIds: number[]): VisitRecordErrors {
  const errors: VisitRecordErrors = {}
  const rest: string[] = []
  for (const { field, reason } of fieldErrors) {
    if (field === 'visitDate' || field === 'mileage') {
      errors[field] ??= reason
      continue
    }
    if (field === 'vehicle.modelYear') {
      errors.modelYear ??= reason
      continue
    }
    const row = /^records\[(\d+)\]\.(memo|externalDate|externalMileage)$/.exec(field)
    const itemId = row ? sentItemIds[Number(row[1])] : undefined
    if (row && itemId !== undefined) {
      const key = row[2] as RowErrorField
      errors[key] = { ...errors[key], [itemId]: errors[key]?.[itemId] ?? reason }
      continue
    }
    if (!rest.includes(reason)) rest.push(reason)
  }
  if (rest.length > 0) errors.form = rest.join(' ')
  return errors
}
