import ReservationRow from './ReservationRow.jsx'
import './ReservationList.css'

// 예약 목록 (시각 순, 서버가 정렬한 그대로). 빈 목록·불러오는 중·오류는 화면(pages)이 정한다.
export default function ReservationList({ items, label }) {
  return (
    <ul className="rsv-list" aria-label={label}>
      {items.map((r) => <ReservationRow key={r.reservationId} reservation={r} />)}
    </ul>
  )
}
