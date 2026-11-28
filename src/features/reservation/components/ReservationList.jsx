import ReservationRow from './ReservationRow.jsx'
import './ReservationList.css'

// 예약 목록 (시각 순, 서버가 정렬한 그대로). 빈 목록·불러오는 중·오류는 화면(pages)이 정한다.
// selectedId: 상세 패널에 열린 예약(없으면 null) · onSelect(reservationId): 줄을 누름
// variant 'panel': 우측 패널(380px) 안 — 줄 안 칸을 두 줄로 쌓는다(#110 6절). 보이는 정보는 같다
export default function ReservationList({ items, label, selectedId = null, onSelect, variant }) {
  return (
    <ul className={`rsv-list${variant === 'panel' ? ' rsv-list--panel' : ''}`} aria-label={label}>
      {items.map((r) => (
        <ReservationRow key={r.reservationId} reservation={r} selected={r.reservationId === selectedId} onSelect={onSelect} />
      ))}
    </ul>
  )
}
