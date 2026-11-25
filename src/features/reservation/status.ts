import type { ReservationStatus } from './types'

// 예약 상태 표시 글자 (08 0.4, 디자인 v3.0 ReservationStatusBadge). 상태는 서버 값 그대로 — 바꾸거나 계산하지 않는다.
export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  RESERVED: '예약',
  IN_PROGRESS: '진행중',
  COMPLETED: '방문 완료',
  CANCELED: '취소',
  NO_SHOW: '노쇼',
}

/** 모르는 값이 오면 그 값을 그대로 보인다(숨기지 않음) */
export function reservationStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABEL[status as ReservationStatus] ?? status
}
