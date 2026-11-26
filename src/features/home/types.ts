// 08 04 GET /api/home — 홈 요약. 필드 이름·타입은 08 표·JSON 예시와 글자까지 같게 둔다 (features/home 첫 이슈 #28).
// todayReservations[]는 08 15의 항목과 같은 모양이다. 이 feature는 다른 feature(reservation)의 타입을 import하지 않으므로
// 08 15 표의 필드를 여기 다시 적는다(P0-나머지 assignee는 선택).

export interface HomeReservation {
  reservationId: number
  reservedAt: string
  status: 'RESERVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'
  needsAction: boolean
  version: number
  vehicleId: number
  plateNumber: string
  customerId: number
  customerName: string
  phone: string
  purposeSummary: string | null
  assignee?: { staffId: number; name: string; colorIndex: number }
}

export interface HomeSummary {
  date: string // 오늘
  todayReservationCount: number // 오늘 예약 중 취소 제외 (서버 값 그대로)
  todayContactCount: number // 오늘 연락할 고객 수 (04 F-HOME-01)
  todayReservations: HomeReservation[] // 취소 포함, 시각 순 (S-02 목록은 15를 쓰므로 화면에서 쓰지 않음)
}
