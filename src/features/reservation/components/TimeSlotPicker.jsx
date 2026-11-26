import { MAIN_SLOTS, OTHER_SLOTS, isPastSlot } from '../reservationForm'

// 시각 고르기 (09 M-02 "시각(30분 단위 선택지)", 디자인 v3.0 Modal-Create): 08:00~19:30 버튼 + "그 밖 시각" 목록.
// 오늘이면 지난 시각은 고를 수 없다. P0-핵심에는 담당 정비사별 막힌 시각이 없다(P0-나머지 MECHANIC_SLOT_CONFLICT).
// 사용: <TimeSlotPicker id="rsv-time" date="2026-11-26" today="2026-11-26" nowTime="13:10" value="14:00" onChange={setTime} />
export default function TimeSlotPicker({ id, date, today, nowTime, value, onChange, describedBy, invalid = false }) {
  const otherValue = OTHER_SLOTS.includes(value) ? value : ''
  return (
    <div className="time-slots" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
      <div className="time-slots__grid">
        {MAIN_SLOTS.map((t) => {
          const past = isPastSlot(date, t, today, nowTime)
          return (
            <button
              key={t}
              type="button"
              className={`time-slots__slot${value === t ? ' is-selected' : ''}`}
              aria-pressed={value === t}
              disabled={past}
              onClick={() => onChange(t)}
            >
              {t}
            </button>
          )
        })}
      </div>
      <label className="time-slots__other">
        <span>그 밖 시각</span>
        <select
          value={otherValue}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-invalid={invalid ? 'true' : undefined}
        >
          <option value="">선택</option>
          {OTHER_SLOTS.map((t) => (
            <option key={t} value={t} disabled={isPastSlot(date, t, today, nowTime)}>{t}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
