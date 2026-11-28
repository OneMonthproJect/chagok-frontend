import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { holidaysOn, uncoveredHolidayNotice } from '@/shared/lib/holidays'
import { WEEKDAYS, formatDayLabel, formatMonthLabel, monthGrid, shiftMonth } from '../dates'
import { dayToneClasses } from '../dayTone'
import PeriodNavigator from './PeriodNavigator.jsx'
import './MonthCalendar.css'

// 홈 월 캘린더 (09 S-02 「월 보기」, 04 F-RSV-05, chagok-frontend#30). 주 보기·월↔주 전환은 #36.
// - 칸: 6주 × 7일(일요일 시작, 앞뒤 달 날짜 포함). 날짜 칸에 총 건수 + 상태별 작은 숫자(예약·진행중·완료·취소·노쇼).
//   숫자는 08 42 응답 값 그대로 — 총 건수(취소만 제외)를 화면에서 더하거나 다시 세지 않는다.
//   예약이 없는 날(응답에 없음, 또는 모든 수가 0)은 칸만 비워 둔다(문구 없음, 09 S-02 빈 상태).
// - 날짜를 누르면 onSelectDate(그 날짜). 그날 목록·예약 상세 패널은 화면(pages)이 연다.
// - 달 이동(PeriodNavigator, #83): 이전·다음 달은 그 달 1일(그 달이 이번 달이면 오늘)을, "오늘로"는 오늘을,
//   달 표시를 눌러 고른 날짜는 그 날짜를 onSelectDate로 알린다(그 달 + 그날 목록).
// - 오늘은 서울 날짜(today, 화면이 todaySeoul()로 넘김). 칸은 날짜 문자열로만 정한다(08 0.1).
// - state: useMonthSummary의 상태. 실패하면 안내 + 사람이 누르는 다시 시도(onReload), 달력 칸은 그대로 보인다.
// - 요일·공휴일(#110 9절): 일요일 빨강·토요일 파랑, 공휴일은 요일과 관계없이 빨강 + 날짜 아래 공식 명칭(같은 날 여러 개면 모두).
//   공휴일은 shared/lib/holidays(데이터 JSON) 조회만 한다. 데이터가 없는 연도는 칸을 평일처럼 두고 위에 안내 한 줄.
//   공휴일이어도 날짜를 누르는 동작·예약은 그대로다(영업일과 무관).
// 사용: <MonthCalendar date="2026-11-24" today="2026-11-24" state={summary.state} onSelectDate={...} onReload={summary.reload} />

/** 상태별 작은 숫자 — 순서·글자는 09 S-02 월 보기 그대로 */
const COUNTS = [
  { key: 'reserved', label: '예약' },
  { key: 'inProgress', label: '진행중' },
  { key: 'completed', label: '완료' },
  { key: 'canceled', label: '취소' },
  { key: 'noShow', label: '노쇼' },
]

/** 0이 아닌 상태별 숫자만 (빈 날은 칸만 비운다) */
function visibleCounts(summary) {
  if (!summary) return []
  return COUNTS.filter(({ key }) => summary[key] > 0).map(({ key, label }) => ({ key, label, count: summary[key] }))
}

/** 화면 읽기용 이름: "11월 24일 (화), 오늘, 3건, 예약 2, 완료 1" (공휴일이면 이름을 날짜 뒤에) */
function dayLabel(date, today, summary, counts, holidays) {
  const parts = [formatDayLabel(date)]
  for (const h of holidays) parts.push(h.name)
  if (date === today) parts.push('오늘')
  if (summary && (summary.total > 0 || counts.length > 0)) parts.push(`${summary.total}건`)
  for (const c of counts) parts.push(`${c.label} ${c.count}`)
  return parts.join(', ')
}

export default function MonthCalendar({ date, today, state, onSelectDate, onReload }) {
  const { month, days } = monthGrid(date)
  const todayMonth = today.slice(0, 7)
  const byDate = state.kind === 'ok' ? state.byDate : {}
  const holidayNotice = uncoveredHolidayNotice([days[0], days[days.length - 1]])

  /** 그 달로 옮길 때 고를 날짜: 이번 달이면 오늘, 아니면 1일 */
  function moveMonth(months) {
    const target = shiftMonth(date, months)
    onSelectDate(target.slice(0, 7) === todayMonth ? today : target)
  }

  return (
    <div className="mcal">
      <div className="mcal__head">
        <PeriodNavigator
          unit="month"
          label={formatMonthLabel(date)}
          date={date}
          today={today}
          onMove={moveMonth}
          onToday={() => onSelectDate(today)}
          onPick={onSelectDate}
          classPrefix="mcal"
        />
      </div>

      {state.kind === 'error' && (
        <ErrorNotice title="예약 건수를 불러오지 못했습니다." error={state.error} onRetry={onReload} />
      )}

      {holidayNotice && <p className="mcal__holiday-notice">{holidayNotice}</p>}

      <div className="mcal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <ol className="mcal__grid" aria-label={`${formatMonthLabel(date)} 예약 달력`} aria-busy={state.kind === 'loading'}>
        {days.map((day) => {
          const summary = byDate[day]
          const counts = visibleCounts(summary)
          const holidays = holidaysOn(day)
          const selected = day === date
          const classes = ['mcal-day', ...dayToneClasses(day, holidays)]
          if (day.slice(0, 7) !== month) classes.push('is-outside')
          if (day === today) classes.push('is-today')
          if (selected) classes.push('is-selected')
          return (
            <li key={day}>
              <button
                type="button"
                className={classes.join(' ')}
                aria-pressed={selected}
                aria-label={dayLabel(day, today, summary, counts, holidays)}
                data-date={day}
                onClick={() => onSelectDate(day)}
              >
                <span className="mcal-day__num">{Number(day.slice(8, 10))}</span>
                {holidays.map((h) => (
                  <span key={h.name} className="mcal-day__holiday">{h.name}</span>
                ))}
                {summary && summary.total > 0 && <strong className="mcal-day__total">{summary.total}건</strong>}
                {counts.length > 0 && (
                  <span className="mcal-day__counts">
                    {counts.map((c) => (
                      <span key={c.key} className={`mcal-count mcal-count--${c.key}`}>{c.label} {c.count}</span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
