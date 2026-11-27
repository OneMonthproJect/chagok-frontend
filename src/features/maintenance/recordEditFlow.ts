// 정비 기록 수정(F-MNT-04, D-55)의 판단 규칙·문구 — S-07 "수정" 버튼·"수정됨" 꼬리표, M-03 모달, 수정 이력 패널 (09 S-07·M-03, 08 7.1 37·38).
// 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// - 버튼 활성은 미리 알려 주는 것일 뿐 최종 판정은 서버(403 FORBIDDEN·EDIT_PERIOD_EXPIRED)다. 화면은 서버 message를 그대로 보인다.
// - 요청에는 11에서 읽은 version을 함께 보내고, 사람이 바꾼 칸만 담는다(08 37 "보낸 필드만"). 바꾼 칸이 없으면 요청하지 않는다.
// - 409 CONCURRENT_MODIFICATION이면 화면이 11을 다시 불러 최신 값·version을 보이고 입력은 지우지 않는다(POL-124, shared/lib/useEditForm).

import { isValidDate } from '@/shared/lib/date'
import { INSPECT_RESULT_LABELS, RECORD_TYPE_LABELS } from './maintenanceFlow'
import type {
  InspectResult,
  RecordRevision,
  RecordRevisionChange,
  RecordRevisionField,
  RecordType,
  RecordUpdateRequest,
  StaffRef,
  Visit,
  VisitRecord,
} from './types'

export const RECORD_EDIT_TEXT = {
  EDIT: '수정',
  EDITED: '수정됨',
  TITLE: '정비 기록 수정',
  SAVE: '저장',
  CANCEL: '취소',
  VEHICLE: '차량',
  VISIT_DATE: '방문일',
  /** 외부 기록의 날짜는 고객이 말한 정비일 (04 F-MNT-02·04) */
  EXTERNAL_DATE: '정비일(고객 진술)',
  MILEAGE: '주행거리',
  TYPE: '구분',
  ITEM: '항목',
  INSPECT_RESULT: '점검 결과',
  INSPECT_RESULT_NONE: '결과 없음',
  MEMO: '메모',
  MECHANIC: '담당 정비사',
  REASON: '수정 사유',
  REASON_HINT: '선택 입력. 수정 이력에 함께 남습니다.',
  NO_DELETE_HINT: '차량은 바꿀 수 없고 기록 삭제는 없습니다.',
  UNCHANGED: '바뀐 내용이 없습니다.',
  CONFLICT_TITLE: '다른 직원이 먼저 수정했습니다.',
  CONFLICT_BODY: '최신 내용을 다시 불러왔습니다. 정비 이력을 확인한 뒤 다시 저장해 주세요. 입력한 내용은 그대로 있습니다.',
  CONFLICT_GONE: '최신 이력에서 이 기록을 찾지 못했습니다. 정비 이력을 다시 확인해 주세요.',
  REVISIONS_TITLE: '수정 이력',
  REVISIONS_EMPTY: '수정 이력이 없습니다.',
  REVISIONS_LOADING: '이력을 불러오는 중…',
  REVISIONS_FAILED: '이력을 불러오지 못했습니다.',
  RELOAD: '다시 불러오기',
} as const

/** "수정" 버튼을 쓸 수 없는 이유 (09 S-07 "비활성 + 이유 툴팁") */
export const EDIT_DISABLED_REASON = {
  LOADING: '계정을 확인하는 중입니다.',
  NOT_ASSIGNEE: '본인이 담당한 기록만 수정할 수 있습니다.',
  PERIOD_EXPIRED: '방문일로부터 3일이 지나 수정할 수 없습니다. 사장에게 요청해 주세요.',
} as const

/** 정비사의 수정 기간: 방문일 + 3일 말까지 (04 F-MNT-04, 08 37 H10) */
export const MECHANIC_EDIT_DAYS = 3

export const TEXT_MAX = 200
export const MILEAGE_MAX = 2_000_000

export interface EditPermission {
  enabled: boolean
  reason: string | null
}

/** "2026-10-24" + 3 → "2026-10-27" (UTC로만 더해 시간대와 무관) */
function plusDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * "수정" 버튼 활성 (09 S-07: 사장은 전체, 정비사는 본인 담당·기간 내만, 08 37 권한 — 수정 전 기록 기준).
 * - 로그인 계정(08 03)을 아직 모르면 비활성.
 * - 정비사: 담당(11 records[].staff)이 본인이 아니면 비활성. 외부가 아니면 기록 날짜 + 3일 < 오늘(서울)일 때 비활성.
 * - 외부 기록은 기간을 저장일(created_at)로 세는데 11에 저장일이 없어 화면이 판단하지 않는다 — 담당이면 켜 두고
 *   기간이 지났으면 서버의 403 EDIT_PERIOD_EXPIRED 안내를 그대로 보인다(#34 계획 ❓2, 추천안).
 */
export function editPermission(
  record: Pick<VisitRecord, 'type' | 'date' | 'staff'>,
  me: { staffId: number; role: string } | null,
  today: string,
): EditPermission {
  if (!me) return { enabled: false, reason: EDIT_DISABLED_REASON.LOADING }
  if (me.role === 'OWNER') return { enabled: true, reason: null }
  if (record.staff.staffId !== me.staffId) return { enabled: false, reason: EDIT_DISABLED_REASON.NOT_ASSIGNEE }
  if (record.type !== 'EXTERNAL' && today > plusDays(record.date, MECHANIC_EDIT_DAYS)) {
    return { enabled: false, reason: EDIT_DISABLED_REASON.PERIOD_EXPIRED }
  }
  return { enabled: true, reason: null }
}

// ---- M-03 폼 ----

/** 입력 중 값. 숫자 칸도 글자로 둔다. inspectResult ''는 결과 없음 */
export interface RecordEditForm {
  recordDate: string
  mileage: string
  type: RecordType
  itemId: string
  inspectResult: '' | InspectResult
  memo: string
  mechanicId: string
  reason: string
}
export type RecordEditErrors = Partial<Record<keyof RecordEditForm, string>>

/**
 * 11의 기록 → 처음 칸 값. 주행거리는 11에 기록별 값이 없어 그 방문의 주행거리로 채운다(#34 계획 ❓3, 추천안).
 * 사람이 칸을 고쳤을 때만 보내므로(toRecordUpdate) 채운 값이 실제 기록 값과 달라도 그대로 두면 바뀌지 않는다.
 * LIMIT: 외부 기록·행마다 값이 다른 방문은 처음 값이 실제 기록 값과 다를 수 있다 / chagok-docs#174(11·17 records[].mileage 결정)가
 *   (가)로 정해지면 records[].mileage로 바꾼다.
 */
export function recordEditForm(record: VisitRecord, visit: Pick<Visit, 'mileage'>): RecordEditForm {
  return {
    recordDate: record.date,
    mileage: visit.mileage == null ? '' : String(visit.mileage),
    type: record.type,
    itemId: String(record.itemId),
    inspectResult: record.inspectResult ?? '',
    memo: record.memo ?? '',
    mechanicId: String(record.staff.staffId),
    reason: '',
  }
}

const M = {
  REQUIRED: '입력해 주세요.',
  DATE_INVALID: '날짜를 확인해 주세요.',
  DATE_FUTURE: '오늘 이후 날짜는 입력할 수 없습니다.',
  MILEAGE_INVALID: `0 ~ ${MILEAGE_MAX.toLocaleString('ko-KR')} 사이의 정수로 입력해 주세요.`,
  CANNOT_CLEAR: '비울 수 없습니다.',
  INSPECT_RESULT_CLEAR: '점검 결과는 비울 수 없습니다. 구분을 바꾸면 결과가 비워집니다.',
  TEXT_MAX: `${TEXT_MAX}자 이하로 입력해 주세요.`,
  MECHANIC_REQUIRED: '담당 정비사를 골라 주세요.',
} as const

function parseMileage(value: string): number | null | undefined {
  const text = value.replaceAll(',', '').trim()
  if (text === '') return null
  if (!/^\d+$/.test(text)) return undefined
  const n = Number(text)
  return n <= MILEAGE_MAX ? n : undefined
}

/** 칸 검사 (08 37 요청 표와 같은 범위). 최종 판정은 서버 400 fieldErrors. initial은 모달을 연 때(또는 409 뒤 최신)의 칸 값 */
export function validateRecordEdit(form: RecordEditForm, initial: RecordEditForm, today: string): RecordEditErrors {
  const errors: RecordEditErrors = {}
  if (!form.recordDate) errors.recordDate = M.REQUIRED
  else if (!isValidDate(form.recordDate)) errors.recordDate = M.DATE_INVALID
  else if (form.recordDate > today) errors.recordDate = M.DATE_FUTURE

  const mileage = parseMileage(form.mileage)
  if (mileage === undefined) errors.mileage = M.MILEAGE_INVALID
  else if (mileage === null && initial.mileage.trim() !== '') errors.mileage = M.CANNOT_CLEAR // 37에는 비우는 값이 없다

  // 구분을 그대로 점검으로 둔 채 결과만 지우는 요청은 37에 없다(결과를 비우는 것은 구분을 바꿀 때뿐, 08 37)
  if (form.type === 'INSPECT' && initial.type === 'INSPECT' && initial.inspectResult !== '' && form.inspectResult === '') {
    errors.inspectResult = M.INSPECT_RESULT_CLEAR
  }
  if (form.memo.trim().length > TEXT_MAX) errors.memo = M.TEXT_MAX
  if (form.reason.trim().length > TEXT_MAX) errors.reason = M.TEXT_MAX
  if (!form.mechanicId) errors.mechanicId = M.MECHANIC_REQUIRED
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as RecordEditErrors
}

/**
 * 37 요청: 처음 칸 값(initial)과 다른 칸만 + version. 바뀐 칸이 없으면 null(요청하지 않음 — 서버도 400, 08 37). 검사를 통과한 form만 넘긴다.
 * - 점검 결과는 수정 뒤 구분이 점검일 때만, 결과를 골랐고 (구분이 바뀌었거나 결과가 바뀌었을) 때만 보낸다.
 *   구분을 점검 밖으로 바꾸면 보내지 않는다(서버가 비운다).
 * - 메모는 앞뒤 공백을 뺀 값. 비우면 ""(08 37 "빈 문자열이면 메모를 비운다").
 * - 사유는 바뀐 칸이 있을 때만, 공백뿐이면 보내지 않는다.
 */
export function toRecordUpdate(form: RecordEditForm, initial: RecordEditForm, version: number): RecordUpdateRequest | null {
  const changes: Omit<RecordUpdateRequest, 'version' | 'reason'> = {}
  if (form.recordDate !== initial.recordDate) changes.recordDate = form.recordDate
  const mileage = parseMileage(form.mileage)
  if (mileage != null && mileage !== parseMileage(initial.mileage)) changes.mileage = mileage
  if (form.type !== initial.type) changes.type = form.type
  if (form.itemId !== initial.itemId) changes.itemId = Number(form.itemId)
  if (
    form.type === 'INSPECT' &&
    form.inspectResult !== '' &&
    (form.type !== initial.type || form.inspectResult !== initial.inspectResult)
  ) {
    changes.inspectResult = form.inspectResult
  }
  if (form.memo.trim() !== initial.memo.trim()) changes.memo = form.memo.trim()
  if (form.mechanicId !== initial.mechanicId) changes.mechanicId = Number(form.mechanicId)
  if (Object.keys(changes).length === 0) return null
  const reason = form.reason.trim()
  return { version, ...changes, ...(reason ? { reason } : {}) }
}

/** 서버 400 fieldErrors 중 칸에 붙일 이름 (08 37 요청 필드 이름 그대로) */
export const RECORD_EDIT_FIELDS = ['recordDate', 'mileage', 'type', 'itemId', 'inspectResult', 'memo', 'mechanicId', 'reason'] as const

// ---- 수정 이력 패널 (08 38) ----

/** 38 changes[].field 글자 (09 S-07 "항목명: 전 → 후") */
export const REVISION_FIELD_LABELS: Record<RecordRevisionField, string> = {
  recordDate: '방문일',
  mileage: '주행거리',
  type: '구분',
  item: '항목',
  inspectResult: '점검 결과',
  memo: '메모',
  mechanic: '담당 정비사',
}

const EMPTY_VALUE = '없음'

function revisionValueText(field: RecordRevisionField, value: RecordRevisionChange['before']): string {
  if (value == null || value === '') return EMPTY_VALUE
  if (typeof value === 'object') return value.name
  switch (field) {
    case 'recordDate':
      return String(value).replaceAll('-', '.')
    case 'mileage':
      return `${Number(value).toLocaleString('ko-KR')} km`
    case 'type':
      return RECORD_TYPE_LABELS[value as RecordType] ?? String(value)
    case 'inspectResult':
      return INSPECT_RESULT_LABELS[value as InspectResult] ?? String(value)
    default:
      return String(value)
  }
}

/** "주행거리: 없음 → 52,000 km" */
export function revisionChangeText(change: RecordRevisionChange): string {
  const label = REVISION_FIELD_LABELS[change.field] ?? change.field
  return `${label}: ${revisionValueText(change.field, change.before)} → ${revisionValueText(change.field, change.after)}`
}

/** "2026-11-25T10:05:00" → "2026.11.25 10:05" (글자만 바꾼다, 시간대 변환 없음) */
export function revisionTimeText(changedAt: string): string {
  return `${changedAt.slice(0, 10).replaceAll('-', '.')} ${changedAt.slice(11, 16)}`
}

/** 수정 이력 한 건의 머리: "2026.11.25 10:05 · 박사장" */
export function revisionHeadText(revision: Pick<RecordRevision, 'changedAt' | 'changedBy'>): string {
  return `${revisionTimeText(revision.changedAt)} · ${revision.changedBy.name}`
}

/** 다시 불러온 11 목록에서 같은 기록과 그 방문을 찾는다(409 뒤 최신 version·값). 없으면 null */
export function findRecord(visits: Visit[], recordId: number): { visit: Visit; record: VisitRecord } | null {
  for (const visit of visits) {
    const record = visit.records.find((r) => r.recordId === recordId)
    if (record) return { visit, record }
  }
  return null
}

/** 담당 후보에 지금 담당이 없을 때(비활성 등) 고를 수 있게 한 줄을 더한다 */
export function withCurrentStaff<T extends { staffId: number; label: string }>(options: T[], staff: StaffRef): (T | { staffId: number; label: string })[] {
  return options.some((o) => o.staffId === staff.staffId) ? options : [{ staffId: staff.staffId, label: staff.name }, ...options]
}
