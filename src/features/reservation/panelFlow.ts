// 예약 상세 패널(S-02, F-RSV-03·04·07~10, 08 17·18·20·21·39~41, 09 S-02 「예약 상세 패널」)의 판단 규칙·문구. 화면 없이 테스트하도록 순수 함수로 둔다.
// 상태(점검 주기·예약)는 서버 값 그대로 쓴다. 여기서 날짜로 상태를 계산하지 않는다(CONVENTIONS 7장).

import { formatDayLabel, formatTime } from './dates'
import { reservationStatusLabel } from './status'
import type {
  CorrectableStatus,
  PanelItemStatus,
  PanelVehicle,
  ReservationCorrectRequest,
  ReservationPanel,
  ReservationRevision,
  ReservationRevisionChange,
  ReservationStartRequest,
  ReservationStatus,
  VisitRecord,
} from './types'

/** 09 5장 「예약 패널 이력 없음」 */
export const NO_HISTORY_MESSAGE = '최근 정비 이력이 없습니다.'
/** 09 5장 404 · 조회 실패 */
export const NOT_FOUND_MESSAGE = '찾을 수 없습니다.'
export const LOAD_FAILED_MESSAGE = '불러오지 못했습니다.'
export const RELOAD_LABEL = '다시 불러오기'
/** 예약 목적이 없을 때 (목록 줄과 같은 말) */
export const NO_PURPOSE = '목적 없음'
export const MODEL_YEAR_MISSING = '연식 미입력'
export const MILEAGE_MISSING = '주행거리 미입력'

/** 08 17: 총 방문 3회 이상이면 [상세 이동](→ S-07) 활성, 그 미만은 비활성(버튼은 항상 보인다, D-54) */
export const VEHICLE_DETAIL_MIN_VISITS = 3

/** 18 방문 완료가 허용되는 상태 (08 18: RESERVED, P0-나머지부터 IN_PROGRESS). 그 밖은 버튼을 두지 않는다 */
const COMPLETABLE: ReadonlySet<ReservationStatus> = new Set<ReservationStatus>(['RESERVED', 'IN_PROGRESS'])

/** 18의 409 중 패널을 다시 불러오는 것 (08 18 「화면 처리」, 09 S-02, M1 결정 B) */
const RELOAD_ON_CONFLICT: ReadonlySet<string> = new Set(['INVALID_STATUS_TRANSITION', 'CONCURRENT_MODIFICATION'])

/** 정비 구분 표시 (08 0.4) */
const RECORD_TYPE_LABEL: Record<VisitRecord['type'], string> = {
  REPLACE: '교체',
  INSPECT: '점검',
  EXTERNAL: '외부',
  DECLINE: '거절',
}

/**
 * URL의 ?reservation= → 08 17 경로 변수. 양의 정수가 아니면 null(요청하지 않고 찾을 수 없음으로 보인다).
 * 쿼리가 없으면 undefined(패널 닫힘).
 */
export function parseReservationId(value: string | null): number | null | undefined {
  if (value === null) return undefined
  if (!/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function canComplete(status: ReservationStatus): boolean {
  return COMPLETABLE.has(status)
}

/** [변경](08 19)은 상태 "예약"만 — 진행중·끝난 예약은 409 INVALID_STATUS_TRANSITION (09 S-02 5번, R9·R21) */
export function canEdit(status: ReservationStatus): boolean {
  return status === 'RESERVED'
}

/** [취소](08 20)는 상태 "예약"·"진행중", 시각 전·후 모두 (09 S-02 5번) */
export function canCancel(status: ReservationStatus): boolean {
  return status === 'RESERVED' || status === 'IN_PROGRESS'
}

/**
 * [노쇼](08 21)는 상태 "예약"이고 시각이 지난 예약만(R6). 시각이 지났는지는 서버가 준 needsAction으로 본다 —
 * 08 needsAction 정의(RESERVED이고 reservedAt이 현재보다 이전)가 노쇼 조건과 같다. 화면에서 시각을 계산하지 않는다.
 */
export function canNoShow(status: ReservationStatus, needsAction: boolean): boolean {
  return status === 'RESERVED' && needsAction
}

/** 확인 대화상자를 거치는 패널 행동 (09 S-02 「취소·노쇼…는 확인 대화상자를 거친다」) */
export type ConfirmAction = 'cancel' | 'noShow'

/** 확인 대화상자 문구 (디자인 v3.0 Home-Confirm-Cancel·NoShow) */
export const CONFIRM_TEXT: Record<ConfirmAction, { title: string; description: string; confirmLabel: string; done: string }> = {
  cancel: {
    title: '예약을 취소할까요?',
    description: '취소한 예약은 정정으로만 되돌릴 수 있습니다.',
    confirmLabel: '예약 취소',
    done: '예약을 취소했습니다.',
  },
  noShow: {
    title: '노쇼로 처리할까요?',
    description: '시각이 지난 예약만 노쇼로 처리할 수 있습니다.',
    confirmLabel: '노쇼 처리',
    done: '노쇼로 처리했습니다.',
  },
}

/** 확인 대화상자의 [돌아가기] */
export const CONFIRM_BACK_LABEL = '돌아가기'

// ---- 방문 접수 (08 39, F-RSV-09, #33) ----

/** [방문 접수]는 상태 "예약"만, 시각 전·후 모두 (09 S-02 5번, 08 「예약 상태 변경 요약」) */
export function canStart(status: ReservationStatus): boolean {
  return status === 'RESERVED'
}

/** 접수 때 입력 칸을 여는 값: 차량에 연식·최근 주행거리가 비어 있는 것만 (D-58, 09 S-02) */
export interface StartMissing {
  modelYear: boolean
  mileage: boolean
}

export function startMissingFields(vehicle: Pick<PanelVehicle, 'modelYear' | 'latestMileage'>): StartMissing {
  return { modelYear: vehicle.modelYear == null, mileage: vehicle.latestMileage == null }
}

export function needsStartInput(missing: StartMissing): boolean {
  return missing.modelYear || missing.mileage
}

export interface StartInput {
  modelYear: string
  mileage: string
}

const START_REQUIRED = '필수 입력입니다.'
const START_INTEGER = '숫자만 입력해 주세요.'

/**
 * 열린 칸만 비었는지·0 이상 정수인지 본다. 범위(연식 1980~내년, 주행거리 2,000,000 이하)는 서버(customer 한 곳)가 보고
 * 400 fieldErrors로 알려 준다 — 같은 규칙을 화면에 다시 쓰지 않는다.
 */
export function validateStartInput(input: StartInput, missing: StartMissing): Partial<Record<keyof StartInput, string>> {
  const errors: Partial<Record<keyof StartInput, string>> = {}
  for (const field of ['modelYear', 'mileage'] as const) {
    if (!missing[field]) continue
    const value = input[field].trim()
    if (value === '') errors[field] = START_REQUIRED
    else if (!/^\d+$/.test(value)) errors[field] = START_INTEGER
  }
  return errors
}

/** 39 요청 본문 중 열린 칸의 값만 (비어 있지 않은 차량 값은 보내지 않는다). version은 패널 hook이 읽은 값으로 붙인다 */
export function startRequestBody(input: StartInput, missing: StartMissing): Omit<ReservationStartRequest, 'version'> {
  const body: Omit<ReservationStartRequest, 'version'> = {}
  if (missing.modelYear) body.modelYear = Number(input.modelYear.trim())
  if (missing.mileage) body.mileage = Number(input.mileage.trim())
  return body
}

export const START_TEXT = {
  title: '방문 접수',
  description: '차량의 연식·최근 주행거리가 비어 있어 접수 전에 입력해 주세요.',
  confirmLabel: '방문 접수',
  done: '방문 접수했습니다. 진행중으로 바뀌었습니다.',
} as const

// ---- 지난 예약 정정 (08 40, F-RSV-10, #33) ----

/** 정정 대상 = 끝난 예약. RESERVED·IN_PROGRESS는 40이 409라 버튼을 두지 않는다(08 7.1 40). 지난 "예약"의 메모는 [변경](19) */
const CORRECTABLE: ReadonlySet<ReservationStatus> = new Set<ReservationStatus>(['COMPLETED', 'CANCELED', 'NO_SHOW'])

export function canCorrect(status: ReservationStatus): boolean {
  return CORRECTABLE.has(status)
}

/** 08 7.1 40 상태 정정 허용표: 취소↔노쇼, 취소·노쇼 → 완료. 완료에서는 상태를 바꿀 수 없다 */
const STATUS_CORRECTIONS: Partial<Record<ReservationStatus, CorrectableStatus[]>> = {
  CANCELED: ['NO_SHOW', 'COMPLETED'],
  NO_SHOW: ['CANCELED', 'COMPLETED'],
  COMPLETED: [],
}

/**
 * 정정 대화상자의 상태 선택지. 상태 정정은 사장만이라(정비사가 status를 보내면 403, R27) 정비사·역할 모름은 빈 목록(메모만).
 * 메모 정정의 담당·3일 기간 판정은 서버가 한다(403 FORBIDDEN·EDIT_PERIOD_EXPIRED 문구를 그대로 보인다).
 */
export function correctionStatusOptions(status: ReservationStatus, role: string | null | undefined): CorrectableStatus[] {
  if (role !== 'OWNER') return []
  return STATUS_CORRECTIONS[status] ?? []
}

export interface CorrectInput {
  status: CorrectableStatus | '' // '' = 상태는 그대로
  memo: string
  reason: string
}

/** 메모·사유 길이 (08 7.1 40: ~200자) */
export const CORRECT_TEXT_MAX = 200

/**
 * 40 요청 본문: 바뀐 것만 보낸다. 바뀐 것이 없으면 null(보내지 않고 화면이 알린다 — 서버도 400).
 * 메모를 지우면 ""(08: 빈 문자열이면 비운다). 사유는 공백뿐이면 보내지 않는다. version은 패널 hook이 붙인다.
 */
export function correctRequestBody(input: CorrectInput, currentMemo: string | null): Omit<ReservationCorrectRequest, 'version'> | null {
  const body: Omit<ReservationCorrectRequest, 'version'> = {}
  if (input.status !== '') body.status = input.status
  if (input.memo !== (currentMemo ?? '')) body.purposeMemo = input.memo
  if (body.status === undefined && body.purposeMemo === undefined) return null
  if (input.reason.trim() !== '') body.reason = input.reason
  return body
}

export const CORRECT_TEXT = {
  title: '지난 예약 정정',
  description: '정정 내용과 사유는 이력에 남습니다.',
  confirmLabel: '정정',
  keepStatus: '그대로',
  noChange: '바뀐 내용이 없습니다.',
  ownerOnly: '상태 정정은 사장만 할 수 있습니다.',
  done: '정정했습니다.',
} as const

// ---- 이력 보기 (08 41, #33) ----

export const REVISION_TEXT = {
  title: '변경 이력',
  empty: '변경 이력이 없습니다.',
} as const

const REVISION_KIND_LABEL: Record<ReservationRevision['kind'], string> = {
  STATUS: '상태 정정',
  MEMO: '메모 정정',
  ASSIGNEE: '담당 재배정',
}

export function revisionKindLabel(kind: string): string {
  return REVISION_KIND_LABEL[kind as ReservationRevision['kind']] ?? kind
}

/** 이력 값 한 칸: 상태는 표시 글자, 담당은 이름, 없으면 「없음」 */
function revisionValueText(field: string, value: ReservationRevisionChange['before']): string {
  if (value == null || value === '') return '없음'
  if (typeof value === 'object') return value.name
  if (field === 'status') return reservationStatusLabel(value)
  return value
}

/** "노쇼 → 취소" (changes 한 줄) */
export function revisionChangeText(change: ReservationRevisionChange): string {
  return `${revisionValueText(change.field, change.before)} → ${revisionValueText(change.field, change.after)}`
}

/** "2026.11.25 09:10" — 일시 문자열을 자를 뿐 바꾸지 않는다(08 0.1) */
export function revisionTimeText(changedAt: string): string {
  return `${visitDateText(changedAt.slice(0, 10))} ${changedAt.slice(11, 16)}`
}

export function canOpenVehicleDetail(totalVisitCount: number): boolean {
  return totalVisitCount >= VEHICLE_DETAIL_MIN_VISITS
}

export function reloadsOnConflict(code: string): boolean {
  return RELOAD_ON_CONFLICT.has(code)
}

/** "11월 24일 (화) 10:00" — 일시 문자열을 바꾸지 않고 자른다(08 0.1) */
export function reservedAtText(reservedAt: string): string {
  return `${formatDayLabel(reservedAt.slice(0, 10))} ${formatTime(reservedAt)}`
}

/** 예약 목적 꼬리표: 고른 항목 이름(받은 순서) + 기타 */
export function purposeLabels(purpose: ReservationPanel['reservation']['purpose']): string[] {
  const labels = purpose.items.map((item) => item.name)
  if (purpose.other) labels.push('기타')
  return labels
}

export function modelYearText(modelYear: number | null): string {
  return modelYear == null ? MODEL_YEAR_MISSING : `${modelYear}년식`
}

export function mileageText(mileage: number | null): string {
  return mileage == null ? MILEAGE_MISSING : `${mileage.toLocaleString('ko-KR')} km`
}

export function recordTypeLabel(type: string): string {
  return RECORD_TYPE_LABEL[type as VisitRecord['type']] ?? type
}

/** "2026-10-24" → "2026.10.24" (문자열을 자를 뿐 바꾸지 않는다) */
export function visitDateText(date: string): string {
  return date.replaceAll('-', '.')
}

/**
 * 17 itemStatuses → shared/ui ItemStatusList(variant summary)의 줄. 순서는 받은 그대로(sortOrder 순),
 * 예약 목적 항목은 자리를 옮기지 않고 강조 + 「예약 목적」 꼬리표만 단다(D-63 B02).
 */
export function itemStatusRows(itemStatuses: PanelItemStatus[]) {
  return itemStatuses.map((item) => ({
    id: item.itemId,
    name: item.name,
    status: item.status,
    highlighted: item.highlighted,
    tag: item.highlighted ? '예약 목적' : undefined,
  }))
}
