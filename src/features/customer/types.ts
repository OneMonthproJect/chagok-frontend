// 08 05~09 고객·차량 — 필드 이름·타입·nullable은 08 표·JSON 예시와 글자까지 같게 둔다.
// P0-핵심 기준. P0-나머지(22·23 version, 목록 phone 마스킹은 서버 값 그대로)·P1(status·active·지표 등)은 그 이슈가 더한다.

/** 08 05 쿼리. q는 고객명·연락처·차량번호 일부(공백·하이픈은 서버가 무시), 비우면 전체(최근 등록순) */
export interface CustomerSearchParams {
  q?: string
  page?: number
  size?: number
}

/** 08 05 items[].vehicles[] */
export interface CustomerVehicleRef {
  vehicleId: number
  plateNumber: string
}

/** 08 05 items[] — phone은 서버가 준 값 그대로 보인다(P0-나머지부터 서버가 마스킹, 08 0.5) */
export interface CustomerSearchItem {
  customerId: number
  name: string
  phone: string
  consent: boolean
  vehicles: CustomerVehicleRef[]
}

/** 08 05 응답 data (목록 쪽 나누기, 08 0.2) */
export interface CustomerSearchResponse {
  items: CustomerSearchItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** 08 06 요청 vehicle, 08 08 요청 본문. modelYear·mileage는 선택(비우면 null) */
export interface VehicleInput {
  plateNumber: string
  model: string
  modelYear: number | null
  mileage: number | null
}

/** 08 06 요청 */
export interface CustomerCreateRequest {
  name: string
  phone: string
  consent: boolean
  vehicle: VehicleInput
}

/** 08 06 응답 data */
export interface CustomerCreateResponse {
  customerId: number
  vehicleId: number
}

/** 08 07 vehicles[] — dueCount·soonCount는 서버가 계산한 값 그대로(화면이 상태를 계산하지 않음) */
export interface CustomerDetailVehicle {
  vehicleId: number
  plateNumber: string
  model: string
  modelYear: number | null
  latestMileage: number | null
  dueCount: number
  soonCount: number
}

/** 08 07 응답 data — phone 전체(D-40) */
export interface CustomerDetail {
  customerId: number
  name: string
  phone: string
  consent: boolean
  vehicles: CustomerDetailVehicle[]
}

/** 08 08 요청 (06의 vehicle과 같음) */
export type VehicleAddRequest = VehicleInput

/** 08 08 응답 data */
export interface VehicleAddResponse {
  customerId: number
  vehicleId: number
}

/** 08 09 customer — phone 전체(D-40) */
export interface VehicleCustomer {
  customerId: number
  name: string
  phone: string
  consent: boolean
}

/** 08 09 응답 data */
export interface VehicleDetail {
  vehicleId: number
  plateNumber: string
  model: string
  modelYear: number | null
  latestMileage: number | null
  customer: VehicleCustomer
}
