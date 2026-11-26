import ReservationRow from './ReservationRow.jsx'
import './ReservationList.css'

// 예약 목록 (시각 순, 서버가 정렬한 그대로). 빈 목록·불러오는 중·오류는 화면(pages)이 정한다.
// selectedId: 상세 패널에 열린 예약(없으면 null) · onSelect(reservationId): 줄을 누름
export default function ReservationList({ items, label, selectedId = null, onSelect }) {
  return (
    <ul className="rsv-list" aria-label={label}>
      {items.map((r) => (
        <ReservationRow key={r.reservationId} reservation={r} selected={r.reservationId === selectedId} onSelect={onSelect} />
      ))}
    </ul>
  )
}
