// M-02 담당 정비사 칸의 판단 규칙 (09 M-02, 08 16·19 담당 재배정 규칙, 04 R19·R24, D-51·D-53, #37). 화면 없이 테스트하도록 순수 함수.
// - 등록: 담당 필수(R19). 기본값은 로그인 계정이 후보(08 36)에 있으면 그 계정, 아니면 비워 두고 고르게 한다.
// - 변경: 재배정 가능 구간에서만 칸을 연다. 기준은 **변경 전 예약 날짜**(08 19)이고 "오늘"은 서울 날짜(todaySeoul)다.
//   여기서는 칸을 열고 닫기만 한다. 권한·마감의 최종 판정은 서버(19, 409 ASSIGNEE_CHANGE_CLOSED)가 하고 화면은 그 오류를 그대로 처리한다.
// - 로그인 계정 정보(08 03)는 pages가 넘긴다(features/auth를 import하지 않음, CONVENTIONS 7장).

/** 08 03 role (사장·정비사) */
export type LoginRole = 'OWNER' | 'MECHANIC'

/** pages가 넘기는 로그인 계정 (08 03 staffId·role). 읽지 못했으면 null */
export interface LoginInfo {
  staffId: number
  role: LoginRole
}

export const ASSIGNEE_MESSAGES = {
  LABEL: '담당 정비사',
  PLACEHOLDER: '담당 정비사를 고르세요',
  LOADING: '담당 정비사 목록을 불러오는 중',
  REQUIRED: '담당 정비사를 골라 주세요.',
  LOAD_FAILED: '담당 정비사 목록을 불러오지 못했습니다.',
  LOAD_FAILED_CREATE: '목록을 다시 불러와야 등록할 수 있습니다. 입력한 내용은 그대로 있습니다.',
  LOAD_FAILED_EDIT: '담당은 지금 그대로 두고 저장합니다. 담당을 바꾸려면 목록을 다시 불러와 주세요.',
  RELOAD: '다시 불러오기',
  CLOSED_TODAY: '오늘 예약의 담당은 사장만 바꿀 수 있습니다.',
  CLOSED_PAST: '지난 날짜의 예약은 담당을 바꿀 수 없습니다.',
  /** 서버가 409 ASSIGNEE_CHANGE_CLOSED로 막았을 때 (화면을 연 뒤 날짜가 바뀐 경우 등) */
  CLOSED_BY_SERVER: '지금은 담당 정비사를 바꿀 수 없어 원래 담당으로 되돌렸습니다. 다른 변경은 그대로 있으니 다시 저장해 주세요.',
  OWNER_TODAY_HINT: '오늘 예약이라 담당을 바꾸면 사유를 적어야 합니다.',
  REASON_LABEL: '재배정 사유',
  REASON_REQUIRED: '당일 재배정은 사유를 입력해 주세요.',
  SLOT_CONFLICT: '이 정비사는 해당 시각에 이미 예약이 있습니다. 다른 시각이나 다른 담당을 선택해 주세요.',
  SLOT_CONFLICT_LINK: '겹친 예약 보기',
} as const

/** 재배정 사유 최대 길이 (08 19 reassignReason ~200자) */
export const REASSIGN_REASON_MAX = 200

/** 등록 기본 담당: 로그인 계정이 후보에 있으면 그 계정, 아니면 null(고르게 한다) */
export function defaultCreateAssignee(candidateIds: number[], loginStaffId: number | null): number | null {
  return loginStaffId != null && candidateIds.includes(loginStaffId) ? loginStaffId : null
}

/**
 * 변경 모드의 재배정 가능 구간 (08 19 담당 재배정 규칙, R24).
 * - open: 오늘 < 예약 날짜 → 사장·정비사 모두
 * - ownerToday: 예약 날짜 = 오늘이고 사장 → 가능, 담당을 바꾸면 사유 필수
 * - closedToday: 예약 날짜 = 오늘이고 정비사(또는 역할을 모름) → 불가
 * - closedPast: 예약 날짜 < 오늘 → 사장도 불가
 * 진행중 예약은 M-02 변경 모드를 열지 않으므로(09 S-02 [변경]은 상태 "예약"만) 여기서 다루지 않는다.
 */
export type ReassignWindow = 'open' | 'ownerToday' | 'closedToday' | 'closedPast'

/** originalDate: 변경 전 예약 날짜 YYYY-MM-DD (오프셋 없는 서울 일시의 앞 10자), today: todaySeoul() */
export function reassignWindow(originalDate: string, today: string, role: LoginRole | null): ReassignWindow {
  if (originalDate > today) return 'open'
  if (originalDate < today) return 'closedPast'
  return role === 'OWNER' ? 'ownerToday' : 'closedToday'
}

export function canReassign(window: ReassignWindow): boolean {
  return window === 'open' || window === 'ownerToday'
}

/** 닫힌 구간의 안내 문구 (열린 구간이면 null) */
export function closedMessage(window: ReassignWindow): string | null {
  if (window === 'closedToday') return ASSIGNEE_MESSAGES.CLOSED_TODAY
  if (window === 'closedPast') return ASSIGNEE_MESSAGES.CLOSED_PAST
  return null
}

/** 사유 칸을 열고 필수로 할지: 당일 사장이 담당을 실제로 바꿀 때만 (08 19, 결정: 그 밖의 재배정에는 사유 칸을 두지 않음) */
export function needsReassignReason(window: ReassignWindow, originalAssigneeId: number | null, assigneeId: number | null): boolean {
  return window === 'ownerToday' && assigneeId != null && assigneeId !== originalAssigneeId
}
