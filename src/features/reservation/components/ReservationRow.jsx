import { formatTime } from '../dates'
import ReservationStatusBadge from './ReservationStatusBadge.jsx'
import './ReservationList.css'

// 예약 목록 한 줄 (09 S-02, 디자인 v3.0 Home-Core-TodayList): 시각·차량번호·고객명·연락처 / 예약 목적·상태·"처리 필요".
// 연락처는 서버 값 그대로(P0-나머지부터 서버가 마스킹, 08 15).
// TODO(#26): 줄을 누르면 예약 상세 패널을 연다. 그 전까지는 누를 수 없는 줄로 둔다(연결 안 된 버튼 없음).
export default function ReservationRow({ reservation }) {
  const r = reservation
  return (
    <li className="rsv-row">
      <div className="rsv-row__primary">
        <strong>{formatTime(r.reservedAt)}</strong>
        <b>{r.plateNumber}</b>
        <span>{r.customerName}</span>
        <span>{r.phone}</span>
      </div>
      <div className="rsv-row__secondary">
        <span className="rsv-row__purpose">{r.purposeSummary ?? '목적 없음'}</span>
        <ReservationStatusBadge status={r.status} />
        {r.needsAction && <em className="rsv-row__needs-action">처리 필요</em>}
      </div>
    </li>
  )
}
