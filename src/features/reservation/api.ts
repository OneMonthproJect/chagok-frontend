// features/reservation의 API 호출 (08 15~21, 36, 39~42). 요청은 shared/api/client를 거친다.
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type {
  AssigneeListResponse,
  ReservationCompleteRequest,
  ReservationCompleted,
  ReservationCorrectRequest,
  ReservationCreateRequest,
  ReservationPanel,
  ReservationPeriodQuery,
  ReservationPeriodResponse,
  ReservationRevisionListResponse,
  ReservationSaved,
  ReservationStartRequest,
  ReservationStarted,
  ReservationSummaryQuery,
  ReservationSummaryResponse,
  ReservationStatusChangeRequest,
  ReservationStatusChanged,
  ReservationUpdateRequest,
} from './types'

const mocks = () => import('./mocks')

/** 08 15. from·to 포함, 최대 42일, 취소·노쇼 포함, 시각 순 */
export function getReservations(query: ReservationPeriodQuery): Promise<ReservationPeriodResponse> {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  if (query.assigneeId !== undefined) params.set('assigneeId', String(query.assigneeId))
  return request<ReservationPeriodResponse>('GET', `/api/reservations?${params}`, {
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockGetReservations(query)) : undefined,
  })
}

/** 08 16 */
export function createReservation(body: ReservationCreateRequest): Promise<ReservationSaved> {
  return request<ReservationSaved>('POST', '/api/reservations', {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockCreateReservation(body)) : undefined,
  })
}

/** 08 17 */
export function getReservationPanel(reservationId: number): Promise<ReservationPanel> {
  return request<ReservationPanel>('GET', `/api/reservations/${reservationId}/panel`, {
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockGetPanel(reservationId)) : undefined,
  })
}

/** 08 36 (P0-나머지). 담당 후보 = 그 정비소의 사장·정비사. S-08(#62)·M-02(#37)가 같이 쓴다 */
export function getAssignees(): Promise<AssigneeListResponse> {
  return request<AssigneeListResponse>('GET', '/api/staff/assignees', {
    mock: MOCK_ENABLED ? () => import('./mocks/assignees').then((m) => m.mockGetAssignees()) : undefined,
  })
}

/** 08 18 */
export function completeReservation(reservationId: number, body: ReservationCompleteRequest): Promise<ReservationCompleted> {
  return request<ReservationCompleted>('POST', `/api/reservations/${reservationId}/complete`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockComplete(reservationId, body)) : undefined,
  })
}

/** 08 20 (P0-나머지). 예약·진행중에서, 시각 전·후 모두. 본문은 version만 */
export function cancelReservation(reservationId: number, body: ReservationStatusChangeRequest): Promise<ReservationStatusChanged> {
  return request<ReservationStatusChanged>('POST', `/api/reservations/${reservationId}/cancel`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockCancel(reservationId, body)) : undefined,
  })
}

/** 08 21 (P0-나머지). 예약이고 시각이 지난 예약만. 본문은 version만 */
export function markNoShow(reservationId: number, body: ReservationStatusChangeRequest): Promise<ReservationStatusChanged> {
  return request<ReservationStatusChanged>('POST', `/api/reservations/${reservationId}/no-show`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockNoShow(reservationId, body)) : undefined,
  })
}

/** 08 39 (P0-나머지). 방문 접수: 예약 → 진행중. 차량에 연식·최근 주행거리가 비어 있으면 그 값을 함께 보낸다(D-58) */
export function startReservation(reservationId: number, body: ReservationStartRequest): Promise<ReservationStarted> {
  return request<ReservationStarted>('POST', `/api/reservations/${reservationId}/start`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockStart(reservationId, body)) : undefined,
  })
}

/** 08 40 (P0-나머지). 끝난 예약의 상태·메모 정정. 상태는 사장만, 메모는 사장·담당 정비사(예약 날짜 + 3일) — 판정은 서버 */
export function correctReservation(reservationId: number, body: ReservationCorrectRequest): Promise<ReservationStatusChanged> {
  return request<ReservationStatusChanged>('POST', `/api/reservations/${reservationId}/correct`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockCorrect(reservationId, body)) : undefined,
  })
}

/** 08 41 (P0-나머지). 재배정·정정 이력, 오래된 것부터 */
export function getReservationRevisions(reservationId: number): Promise<ReservationRevisionListResponse> {
  return request<ReservationRevisionListResponse>('GET', `/api/reservations/${reservationId}/revisions`, {
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockGetRevisions(reservationId)) : undefined,
  })
}

/** 08 19 */
export function updateReservation(reservationId: number, body: ReservationUpdateRequest): Promise<ReservationSaved> {
  return request<ReservationSaved>('PATCH', `/api/reservations/${reservationId}`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockUpdate(reservationId, body)) : undefined,
  })
}

/** 08 42 (P0-나머지). 월 보기의 날짜별 건수·상태별 건수. from·to 규칙은 15와 같다(최대 42일) */
export function getReservationSummary(query: ReservationSummaryQuery): Promise<ReservationSummaryResponse> {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  return request<ReservationSummaryResponse>('GET', `/api/reservations/summary?${params}`, {
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockGetReservationSummary(query)) : undefined,
  })
}
