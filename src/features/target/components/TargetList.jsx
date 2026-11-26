import TargetRow from './TargetRow.jsx'
import './target.css'

// 재점검 대상 목록 (09 S-04). 순서는 서버가 정한 그대로(도래 먼저 → 다음 정비일 이른 순). 빈 목록·오류는 화면이 정한다.
export default function TargetList({ items, onReserve, onOpenReservation }) {
  return (
    <ul className="target-list" aria-label="재점검 대상 차량">
      {items.map((t) => (
        <TargetRow key={t.vehicleId} target={t} onReserve={onReserve} onOpenReservation={onOpenReservation} />
      ))}
    </ul>
  )
}
