import { formatTime } from '../dates'
import AssigneeLabel from './AssigneeLabel.jsx'
import ReservationStatusBadge from './ReservationStatusBadge.jsx'
import './ReservationList.css'

// 예약 목록 한 줄 (09 S-02, 디자인 v3.0 Home-Core-TodayList): 시각·차량번호·고객명·연락처 / 예약 목적·상태·"처리 필요".
// 연락처는 서버 값 그대로(P0-나머지부터 서버가 마스킹, 08 15).
// 담당 정비사(P0-나머지, 08 15 assignee)는 이름+색 라벨(#30). 응답에 없으면(P0-핵심 서버) 그리지 않는다.
// 줄을 누르면 예약 상세 패널을 연다(#26). 열린 예약의 줄은 selected로 표시한다(aria-current).
export default function ReservationRow({ reservation, selected = false, onSelect }) {
  const r = reservation
  return (
    <li>
      <button
        type="button"
        className={`rsv-row${selected ? ' is-selected' : ''}`}
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect(r.reservationId)}
      >
        <span className="rsv-row__primary">
          <strong>{formatTime(r.reservedAt)}</strong>
          <b>{r.plateNumber}</b>
          <span>{r.customerName}</span>
          <span>{r.phone}</span>
        </span>
        <span className="rsv-row__secondary">
          <span className="rsv-row__purpose">{r.purposeSummary ?? '목적 없음'}</span>
          <AssigneeLabel assignee={r.assignee} />
          <ReservationStatusBadge status={r.status} />
          {r.needsAction && <em className="rsv-row__needs-action">처리 필요</em>}
        </span>
      </button>
    </li>
  )
}
