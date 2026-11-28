// 경로·쿼리 상수 (09 화면 ID와 1:1, STARTER 07 1.1, 디자인 FRONTEND_STRUCTURE 2장·11-1).
// 화면 이슈는 여기 있는 상수만 쓴다. 이 파일은 앱 골격(#17)이 P0-핵심 URL을 한 번에 정의했다.
export const PATHS = {
  LOGIN: '/login', // S-01
  HOME: '/', // S-02
  TARGETS: '/targets', // S-04
  CUSTOMERS: '/customers', // S-05
  CUSTOMER_DETAIL: '/customers/:customerId', // S-06
  VEHICLE_DETAIL: '/vehicles/:vehicleId', // S-07
  VISIT_NEW: '/visits/new', // S-08 (?vehicleId ?reservationId)
}

/** 쿼리 키 (FRONTEND_STRUCTURE 2장). 기본값이면 URL에서 뺀다 */
export const QUERY = {
  RESERVATION: 'reservation',
  LIST: 'list', // S-02 우측 패널의 목록 보기 (값 'today' = 오늘 예약, #110)
  DATE: 'date',
  VIEW: 'view',
  MINE: 'mine',
  FILTER: 'filter',
  SORT: 'sort',
  Q: 'q',
  PAGE: 'page',
  VEHICLE: 'vehicle',
  VEHICLE_ID: 'vehicleId',
  RESERVATION_ID: 'reservationId',
}

export const customerPath = (customerId) => `/customers/${customerId}`
export const vehiclePath = (vehicleId) => `/vehicles/${vehicleId}`
