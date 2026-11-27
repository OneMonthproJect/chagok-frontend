import { addDays, formatDayLabel } from '../dates'
import PeriodNavigator from './PeriodNavigator.jsx'

// 날짜 앞뒤 이동 + 오늘로 + 날짜 선택 (09 S-02, 디자인 v3.0 p0-date-nav, #83 이동 바 통일).
// 날짜는 화면이 URL(?date=)로 들고 있고 여기서는 바꿀 날짜만 알린다. 날짜 표시를 누르면 날짜 선택 팝오버.
// 사용: <DateNavigator date="2026-11-24" today="2026-11-24" onChange={(next) => ...} />
export default function DateNavigator({ date, today, onChange }) {
  return (
    <PeriodNavigator
      unit="day"
      label={formatDayLabel(date)}
      date={date}
      today={today}
      onMove={(days) => onChange(addDays(date, days))}
      onToday={() => onChange(today)}
      onPick={onChange}
      titleTag="strong"
    />
  )
}
