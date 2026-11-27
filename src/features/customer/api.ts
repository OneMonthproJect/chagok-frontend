// features/customer의 API 호출 (08 05~09). 요청은 shared/api/client를 거친다(fetch 직접 호출 없음).
// 오류는 client가 ApiError로 던진다(05 POL-120~129). 자동으로 다시 보내지 않는다(POL-125).
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).
// 다른 화면(S-06·S-07·M-02 등)도 이 파일만 부른다 — 05~09는 #19가, 22·23 고객·차량 수정은 #32가 만든다(STARTER 08).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type {
  CustomerCreateRequest,
  CustomerCreateResponse,
  CustomerDetail,
  CustomerSearchParams,
  CustomerSearchResponse,
  CustomerUpdateRequest,
  CustomerUpdateResponse,
  VehicleAddRequest,
  VehicleAddResponse,
  VehicleDetail,
  VehicleUpdateRequest,
  VehicleUpdateResponse,
} from './types'

/** 05 쿼리 문자열. 빈 검색어·정하지 않은 쪽은 빼서 서버 기본값(page 0·size 20)을 쓴다 */
export function customerSearchQuery(params: CustomerSearchParams = {}): string {
  const query = new URLSearchParams()
  const q = params.q?.trim()
  if (q) query.set('q', q)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const text = query.toString()
  return text ? `?${text}` : ''
}

/** 08 05 검색·목록 (S-05, M-01 중복 확인, M-02 차량 검색) */
export function searchCustomers(params: CustomerSearchParams = {}): Promise<CustomerSearchResponse> {
  return request<CustomerSearchResponse>('GET', `/api/customers${customerSearchQuery(params)}`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockSearchCustomers(params)) : undefined,
  })
}

/** 08 06 신규 고객 + 첫 차량 (M-01) */
export function createCustomer(body: CustomerCreateRequest): Promise<CustomerCreateResponse> {
  return request<CustomerCreateResponse>('POST', '/api/customers', {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockCreateCustomer(body)) : undefined,
  })
}

/** 08 07 고객 상세 (S-06) */
export function getCustomer(customerId: number): Promise<CustomerDetail> {
  return request<CustomerDetail>('GET', `/api/customers/${encodeURIComponent(customerId)}`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetCustomer(customerId)) : undefined,
  })
}

/** 08 08 기존 고객에 차량 추가 (S-06) */
export function addVehicle(customerId: number, body: VehicleAddRequest): Promise<VehicleAddResponse> {
  return request<VehicleAddResponse>('POST', `/api/customers/${encodeURIComponent(customerId)}/vehicles`, {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockAddVehicle(customerId, body)) : undefined,
  })
}

/** 08 09 차량 정보 (S-07, S-08) */
export function getVehicle(vehicleId: number): Promise<VehicleDetail> {
  return request<VehicleDetail>('GET', `/api/vehicles/${encodeURIComponent(vehicleId)}`, {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetVehicle(vehicleId)) : undefined,
  })
}

/** 08 22 고객 수정 (S-06). 07에서 읽은 version을 함께 보낸다. 다르면 409 CONCURRENT_MODIFICATION */
export function updateCustomer(customerId: number, body: CustomerUpdateRequest): Promise<CustomerUpdateResponse> {
  return request<CustomerUpdateResponse>('PATCH', `/api/customers/${encodeURIComponent(customerId)}`, {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockUpdateCustomer(customerId, body)) : undefined,
  })
}

/** 08 23 차량 수정 (S-07). 09에서 읽은 version을 함께 보낸다. 다르면 409 CONCURRENT_MODIFICATION */
export function updateVehicle(vehicleId: number, body: VehicleUpdateRequest): Promise<VehicleUpdateResponse> {
  return request<VehicleUpdateResponse>('PATCH', `/api/vehicles/${encodeURIComponent(vehicleId)}`, {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockUpdateVehicle(vehicleId, body)) : undefined,
  })
}
