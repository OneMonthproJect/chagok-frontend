// features/maintenance의 API 호출 (08 10~13, P0-나머지 37·38 #34). 요청은 shared/api/client를 거친다(fetch 직접 호출 없음).
// 오류는 client가 ApiError로 던진다(05 POL-120~129). 자동으로 다시 보내지 않는다(POL-125).
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).
// 다른 화면(S-07·S-08·M-02 등)도 이 파일만 부른다 — maintenance의 첫 이슈(#22)가 10~13을 모두 만든다(STARTER 08).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type {
  ItemStatusResponse,
  RecordRevisionListResponse,
  RecordUpdateRequest,
  RecordUpdateResponse,
  ServiceItem,
  VisitListParams,
  VisitListResponse,
  VisitSaveRequest,
  VisitSaveResponse,
} from './types'

const vehicleBase = (vehicleId: number) => `/api/vehicles/${encodeURIComponent(vehicleId)}`

/** 10 쿼리 문자열. mileage를 주지 않으면 빼서 날짜 기준만 판정한다 */
export function itemStatusQuery(mileage?: number | null): string {
  return mileage == null ? '' : `?mileage=${encodeURIComponent(mileage)}`
}

/** 11 쿼리 문자열. 정하지 않은 쪽은 빼서 서버 기본값(page 0·size 20)을 쓴다 */
export function visitListQuery(params: VisitListParams = {}): string {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const text = query.toString()
  return text ? `?${text}` : ''
}

/** 08 10 항목 상태 (S-07: mileage 없이 날짜 기준 / S-08 저장 전 미리보기: mileage 포함). 기록을 남기지 않는다 */
export function getItemStatus(vehicleId: number, mileage?: number | null): Promise<ItemStatusResponse> {
  return request<ItemStatusResponse>('GET', `${vehicleBase(vehicleId)}/item-status${itemStatusQuery(mileage)}`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetItemStatus(vehicleId, mileage)) : undefined,
  })
}

/** 08 11 방문 단위 정비 이력 (S-07). 최신순, 쪽 나누기는 방문 묶음 수 기준 */
export function getVisits(vehicleId: number, params: VisitListParams = {}): Promise<VisitListResponse> {
  return request<VisitListResponse>('GET', `${vehicleBase(vehicleId)}/visits${visitListQuery(params)}`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetVisits(vehicleId, params)) : undefined,
  })
}

/** 08 12 방문·정비 기록 저장 (S-08) */
export function saveVisit(vehicleId: number, body: VisitSaveRequest): Promise<VisitSaveResponse> {
  return request<VisitSaveResponse>('POST', `${vehicleBase(vehicleId)}/visits`, {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockSaveVisit(vehicleId, body)) : undefined,
  })
}

/** 08 13 정비 항목·주기 (S-08 항목 기록, M-02 예약 목적). 쪽 나누기 없는 배열 */
export function getItems(): Promise<ServiceItem[]> {
  return request<ServiceItem[]>('GET', '/api/items', {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetItems()) : undefined,
  })
}

const recordBase = (recordId: number) => `/api/records/${encodeURIComponent(recordId)}`

/** 08 37 정비 기록 수정 (M-03, P0-나머지 #34). 보낸 필드만 바꾼다. 응답은 { recordId, vehicleId, version } — 화면은 11을 다시 조회 */
export function updateRecord(recordId: number, body: RecordUpdateRequest): Promise<RecordUpdateResponse> {
  return request<RecordUpdateResponse>('PATCH', recordBase(recordId), {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockUpdateRecord(recordId, body)) : undefined,
  })
}

/** 08 38 정비 기록 수정 이력 (S-07 수정 이력 패널, P0-나머지 #34). 오래된 것부터, 쪽 나누기 없음 */
export function getRecordRevisions(recordId: number): Promise<RecordRevisionListResponse> {
  return request<RecordRevisionListResponse>('GET', `${recordBase(recordId)}/revisions`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetRecordRevisions(recordId)) : undefined,
  })
}
