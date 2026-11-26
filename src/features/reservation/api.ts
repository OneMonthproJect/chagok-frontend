// features/reservation의 API 호출 (08 15~19, 42). 요청은 shared/api/client를 거친다.
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type {
  ReservationCompleteRequest,
  ReservationCompleted,
  ReservationCreateRequest,
  ReservationPanel,
  ReservationPeriodQuery,
  ReservationPeriodResponse,
  ReservationSaved,
  ReservationSummaryQuery,
  ReservationSummaryResponse,
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

/** 08 18 */
export function completeReservation(reservationId: number, body: ReservationCompleteRequest): Promise<ReservationCompleted> {
  return request<ReservationCompleted>('POST', `/api/reservations/${reservationId}/complete`, {
    body,
    mock: MOCK_ENABLED ? () => mocks().then((m) => m.mockComplete(reservationId, body)) : undefined,
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
