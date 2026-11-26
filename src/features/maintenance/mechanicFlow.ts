// S-08 담당 정비사 선택의 순수 함수 (09 S-08 5번, 04 F-MNT-01, 05 POL-59·120~129, 08 12 mechanicId·X13, D-51, #62).
// - 후보는 08 36(그 정비소의 사장·정비사). 후보 목록은 pages가 features/reservation에서 받아 { staffId, label }로 넘긴다
//   (feature끼리 import하지 않음, CONVENTIONS 7장).
// - 기본값: 예약에서 왔으면(?reservationId=) 그 예약의 담당(08 17 reservation.assignee), 아니면 로그인 계정(08 03 staffId).
//   정비사도 다른 정비사를 고를 수 있다. 기본값이 후보에 없으면 그다음 기본값, 둘 다 없으면 비워 두고 고르게 한다.
// - 칸 하나라 visitRecordFlow(방문 정보·항목 기록 폼)와 나눠 둔다. 저장 요청에는 withMechanic으로 더한다.

import type { FieldError } from '@/shared/api/client'
import type { VisitSaveRequest } from './types'

/** 드롭다운 한 줄. label은 pages가 만든다("박사장 (사장)") */
export interface MechanicOption {
  staffId: number
  label: string
}

export const MECHANIC_MESSAGES = {
  TITLE: '담당 정비사',
  HINT: '이번 방문 기록의 담당입니다. 다른 정비사로 바꿀 수 있습니다.',
  PLACEHOLDER: '담당 정비사를 고르세요',
  LOADING: '담당 정비사 목록을 불러오는 중',
  REQUIRED: '담당 정비사를 골라 주세요.',
  LOAD_FAILED: '담당 정비사 목록을 불러오지 못했습니다.',
  LOAD_FAILED_BODY: '목록을 다시 불러와야 저장할 수 있습니다. 입력한 내용은 그대로 있습니다.',
  RELOAD: '다시 불러오기',
  RESERVATION_FALLBACK: '예약의 담당을 확인하지 못해 로그인 계정으로 채웠습니다. 담당을 확인해 주세요.',
  /** 예약의 담당도 로그인 계정도 채우지 못했을 때 */
  RESERVATION_FALLBACK_EMPTY: '예약의 담당을 확인하지 못했습니다. 담당을 골라 주세요.',
} as const

export interface DefaultMechanicInput {
  /** 08 36 후보의 staffId */
  candidateIds: number[]
  /** ?reservationId=로 들어왔는지 */
  fromReservation: boolean
  /** 08 17 reservation.assignee.staffId. 예약을 읽지 못했거나 assignee가 없으면 null */
  reservationAssigneeId: number | null
  /** 08 03 staffId. 읽지 못했으면 null */
  loginStaffId: number | null
}

export interface DefaultMechanic {
  mechanicId: number | null
  /** 예약에서 왔는데 그 예약의 담당으로 채우지 못함 → 화면이 안내를 보인다 */
  reservationFallback: boolean
}

/** 기본 담당 (05 POL-59): 예약의 담당 → 로그인 계정 순으로 후보에 있는 첫 값 */
export function defaultMechanic({
  candidateIds,
  fromReservation,
  reservationAssigneeId,
  loginStaffId,
}: DefaultMechanicInput): DefaultMechanic {
  const isCandidate = (id: number | null): id is number => id != null && candidateIds.includes(id)
  if (fromReservation && isCandidate(reservationAssigneeId)) {
    return { mechanicId: reservationAssigneeId, reservationFallback: false }
  }
  return { mechanicId: isCandidate(loginStaffId) ? loginStaffId : null, reservationFallback: fromReservation }
}

/** 저장 전 검사: 고르지 않았으면 칸 오류 */
export function validateMechanic(mechanicId: number | null): string | undefined {
  return mechanicId == null ? MECHANIC_MESSAGES.REQUIRED : undefined
}

/** 서버 400 fieldErrors에서 mechanicId(X13)만 떼어 칸 오류로, 나머지는 그대로(visitRecordFlow.fieldErrorsToVisitForm으로) */
export function splitMechanicFieldErrors(fieldErrors: FieldError[]): { mechanic?: string; rest: FieldError[] } {
  const mechanic = fieldErrors.find((e) => e.field === 'mechanicId')?.reason
  return { mechanic, rest: fieldErrors.filter((e) => e.field !== 'mechanicId') }
}

/** 08 12 요청에 담당을 더한다 */
export function withMechanic(body: VisitSaveRequest, mechanicId: number): VisitSaveRequest {
  return { ...body, mechanicId }
}
