// 예약 상세 패널(S-02, F-RSV-03·04, 08 17·18, 09 S-02 「예약 상세 패널」)의 판단 규칙·문구. 화면 없이 테스트하도록 순수 함수로 둔다.
// 상태(점검 주기·예약)는 서버 값 그대로 쓴다. 여기서 날짜로 상태를 계산하지 않는다(CONVENTIONS 7장).

import { formatDayLabel, formatTime } from './dates'
import type { PanelItemStatus, ReservationPanel, ReservationStatus, VisitRecord } from './types'

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
