import { reservationStatusLabel } from '../status'
import './ReservationList.css'

// 예약 상태 배지 (디자인 v3.0 ReservationStatusBadge). 상태는 서버 값 그대로, 글자를 항상 함께 보인다(색만으로 구분하지 않음).
export default function ReservationStatusBadge({ status }) {
  return <span className={`rsv-status rsv-status--${status}`}>{reservationStatusLabel(status)}</span>
}
