import { addDays, formatDayLabel } from '../dates'
import './ReservationList.css'

// 날짜 앞뒤 이동 + 오늘로 (09 S-02, 디자인 v3.0 p0-date-nav). 날짜는 화면이 URL(?date=)로 들고 있고 여기서는 바꿀 날짜만 알린다.
// 사용: <DateNavigator date="2026-11-24" today="2026-11-24" onChange={(next) => ...} />
export default function DateNavigator({ date, today, onChange }) {
  return (
    <div className="date-nav" role="group" aria-label="날짜 이동">
      <button type="button" aria-label="이전 날짜" onClick={() => onChange(addDays(date, -1))}>‹</button>
      <strong aria-live="polite">{formatDayLabel(date)}</strong>
      <button type="button" aria-label="다음 날짜" onClick={() => onChange(addDays(date, 1))}>›</button>
      <button type="button" className="date-nav__today" disabled={date === today} onClick={() => onChange(today)}>
        오늘로
      </button>
    </div>
  )
}
