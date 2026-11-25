// S-05 고객·차량 목록의 판단 규칙 (09 S-05·5장, 08 05, 디자인 v3.0 Customer-List-*). 화면 없이 테스트할 수 있게 순수 함수로 둔다.

import type { CustomerSearchItem, CustomerSearchResponse } from './types'

/** VehiclePicker 선택지 하나 (08 05 고객 줄을 차량 단위로 펼친 것) */
export interface VehicleOption {
  vehicleId: number
  plateNumber: string
  customerId: number
  customerName: string
  phone: string
}

/** 05 결과를 차량 단위로 펼친다. 차량이 없는 고객은 고를 차량이 없으므로 빠진다 */
export function vehicleOptions(items: CustomerSearchItem[]): VehicleOption[] {
  return items.flatMap((customer) =>
    customer.vehicles.map((vehicle) => ({
      vehicleId: vehicle.vehicleId,
      plateNumber: vehicle.plateNumber,
      customerId: customer.customerId,
      customerName: customer.name,
      phone: customer.phone,
    })),
  )
}

/** 빈 상태 문구 (09 5장) */
export const NO_CUSTOMERS_MESSAGE = '등록된 고객이 없습니다.'
export const NO_RESULTS_MESSAGE = '검색 결과가 없습니다.'

/** 조회 실패 (09 5장) */
export const LOAD_FAILED_MESSAGE = '불러오지 못했습니다.'
export const RELOAD_LABEL = '다시 불러오기'

/** 검색어 입력이 멈춘 뒤 검색까지 (디자인 PAGE_API_MAPPING 05: 0.3초) */
export const SEARCH_DELAY_MS = 300

/** 결과가 없을 때 문구: 검색어가 있으면 "검색 결과가 없습니다.", 없으면 "등록된 고객이 없습니다." */
export function emptyMessage(query: string): string {
  return query.trim() ? NO_RESULTS_MESSAGE : NO_CUSTOMERS_MESSAGE
}

/** 빈 상태 설명과 이어지는 버튼 (디자인 v3.0 Customer-List-Empty·NoCustomers). 검색어가 있으면 그 검색어를 M-01에 채운다 */
export function emptyState(query: string): { title: string; description: string; actionLabel: string } {
  const q = query.trim()
  if (q) {
    return {
      title: NO_RESULTS_MESSAGE,
      description: `‘${q}’와 일치하는 고객·차량이 없습니다. 처음 오신 고객이면 새로 등록해 주세요.`,
      actionLabel: `‘${q}’로 신규 등록`,
    }
  }
  return {
    title: NO_CUSTOMERS_MESSAGE,
    description: '첫 고객과 차량을 등록하면 여기에서 찾을 수 있어요.',
    actionLabel: '신규 고객·차량 등록',
  }
}

/** 화면 머리 아래 건수 (디자인 v3.0 S-05) */
export function countText(query: string, totalElements: number): string {
  const q = query.trim()
  return q ? `‘${q}’ 검색 결과 고객 ${totalElements}명` : `등록 고객 ${totalElements}명`
}

/** 목록 위 건수 "n명 중 a–b" (디자인 v3.0 S-05). 결과가 없으면 null */
export function rangeText(page: Pick<CustomerSearchResponse, 'page' | 'size' | 'totalElements' | 'items'>): string | null {
  if (page.totalElements === 0 || page.items.length === 0) return null
  const from = page.page * page.size + 1
  const to = from + page.items.length - 1
  return `${page.totalElements}명 중 ${from}–${to}`
}
