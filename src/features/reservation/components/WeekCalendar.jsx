import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { WEEKDAYS, addDays, formatDayLabel, formatTime, formatWeekLabel, weekRange, weekdayIndex } from '../dates'
import { WEEK_SLOTS, hasItems, placeWeek } from '../weekCalendar'
import AssigneeLabel, { assigneeColorClass } from './AssigneeLabel.jsx'
import PeriodNavigator from './PeriodNavigator.jsx'
import ReservationStatusBadge from './ReservationStatusBadge.jsx'
import './WeekCalendar.css'

// 홈 주 캘린더 (09 S-02 「주 보기」, 04 F-RSV-05, D-63 B08, chagok-frontend#36). 월 보기는 MonthCalendar(#30).
// - 7일(월요일 시작) × 30분 칸, 기본 08:00~20:00(시작 칸 08:00~19:30). 08:00 전 시작 예약은 표 위,
//   20:00 이후 시작 예약은 표 아래 줄에 날짜 열을 맞춰 보인다(그 영역에 예약이 있을 때만 줄을 그린다).
// - 카드: 시각·차량번호·고객명 + 담당 색 띠·이름(AssigneeLabel). 상태는 "예약"이 아닐 때만 배지, 처리 필요 표시.
//   모두 08 15 응답 값 그대로 — 상태를 화면에서 계산하지 않는다.
// - 카드를 누르면 onSelectReservation(id) — 상세 패널은 화면(pages)이 연다. 열린 예약 카드는 aria-current.
// - 주 이동(PeriodNavigator, #83): 이전·다음 주는 그 주 월요일(그 주에 오늘이 있으면 오늘)을, "오늘로"는 오늘을,
//   주 표시를 눌러 고른 날짜는 그 날짜를 onSelectDate로 알린다(그 날짜가 속한 주를 보인다).
// - 빈 칸은 비워 둔다(문구 없음, 09 S-02 빈 상태). 불러오는 중에는 표를 그대로 두고 안내 한 줄.
//   실패하면 안내 + 사람이 누르는 다시 시도(onReload, 05 POL-125 자동 재요청 없음).
// - state: usePeriodReservations(주 from·to)의 상태.
// 사용: <WeekCalendar date="2026-11-24" today="2026-11-24" state={week.state} selectedId={4}
//        onSelectDate={...} onSelectReservation={...} onReload={week.reload} />

function ReservationCard({ reservation, selected, onSelect }) {
  const r = reservation
  const color = assigneeColorClass(r.assignee) // 색 띠는 라벨과 같은 색 클래스(규칙 한 곳)
  const classes = ['wcal-card']
  if (color) classes.push(color)
  if (r.status === 'CANCELED' || r.status === 'NO_SHOW') classes.push('is-ended')
  if (selected) classes.push('is-selected')
  return (
    <li>
      <button
        type="button"
        className={classes.join(' ')}
        aria-current={selected ? 'true' : undefined}
        data-reservation-id={r.reservationId}
        onClick={() => onSelect(r.reservationId)}
      >
        <span className="wcal-card__time">{formatTime(r.reservedAt)}</span>
        <b className="wcal-card__plate">{r.plateNumber}</b>
        <span className="wcal-card__name">{r.customerName}</span>
        <AssigneeLabel assignee={r.assignee} />
        {r.status !== 'RESERVED' && <ReservationStatusBadge status={r.status} />}
        {r.needsAction && <em className="wcal-card__needs-action">처리 필요</em>}
      </button>
    </li>
  )
}

/** 한 칸(날짜 × 시각 또는 위·아래 영역)의 카드들 */
function Cell({ items, selectedId, onSelect }) {
  if (!items || items.length === 0) return <td className="wcal__cell" />
  return (
    <td className="wcal__cell">
      <ul className="wcal__cards">
        {items.map((r) => (
          <ReservationCard key={r.reservationId} reservation={r} selected={r.reservationId === selectedId} onSelect={onSelect} />
        ))}
      </ul>
    </td>
  )
}

export default function WeekCalendar({ date, today, state, selectedId = null, onSelectDate, onSelectReservation, onReload }) {
  const { days, from, to } = weekRange(date)
  const placement = placeWeek(state.kind === 'ok' ? state.items : [], days)
  const label = formatWeekLabel(from, to)

  /** 그 주로 옮길 때 고를 날짜: 그 주에 오늘이 있으면 오늘, 아니면 월요일 */
  function moveWeek(weeks) {
    const target = addDays(from, weeks * 7)
    onSelectDate(weekRange(target).days.includes(today) ? today : target)
  }

  const row = (key, head, byDate, className) => (
    <tr key={key} className={className}>
      <th scope="row" className="wcal__time">{head}</th>
      {days.map((day) => <Cell key={day} items={byDate?.[day]} selectedId={selectedId} onSelect={onSelectReservation} />)}
    </tr>
  )

  return (
    <div className="wcal">
      <div className="wcal__head">
        <PeriodNavigator
          unit="week"
          label={label}
          date={date}
          today={today}
          onMove={moveWeek}
          onToday={() => onSelectDate(today)}
          onPick={onSelectDate}
          classPrefix="wcal"
        />
      </div>

      {state.kind === 'loading' && <p className="wcal__status" role="status">예약을 불러오는 중…</p>}
      {state.kind === 'error' && (
        <ErrorNotice title="예약을 불러오지 못했습니다." error={state.error} onRetry={onReload} />
      )}

      <div className="wcal__scroll">
        <table className="wcal__table" aria-label={`${label} 예약 주간 표`} aria-busy={state.kind === 'loading'}>
          <thead>
            <tr>
              <th scope="col" className="wcal__corner"><span className="visually-hidden">시각</span></th>
              {days.map((day) => (
                <th key={day} scope="col" className={`wcal__day${day === today ? ' is-today' : ''}`} data-date={day}>
                  <span className="visually-hidden">{formatDayLabel(day)}{day === today ? ', 오늘' : ''}</span>
                  <span aria-hidden="true">
                    <span className="wcal__weekday">{WEEKDAYS[weekdayIndex(day)]}</span>
                    <span className="wcal__date">{Number(day.slice(8, 10))}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasItems(placement.before) && row('before', '08:00 전', placement.before, 'wcal__band wcal__band--before')}
            {WEEK_SLOTS.map((slot) => row(slot, slot, placement.slots[slot], slot.endsWith(':00') ? 'is-hour' : undefined))}
            {hasItems(placement.after) && row('after', '20:00 이후', placement.after, 'wcal__band wcal__band--after')}
          </tbody>
        </table>
      </div>
    </div>
  )
}
