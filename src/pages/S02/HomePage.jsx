import { useSearchParams } from 'react-router-dom'
import DateNavigator from '@/features/reservation/components/DateNavigator.jsx'
import ReservationList from '@/features/reservation/components/ReservationList.jsx'
import { formatFullDate, isValidDate, todaySeoul } from '@/features/reservation/dates'
import { useDayReservations } from '@/features/reservation/useDayReservations'
import { QUERY } from '@/app/paths'
import { emptyDayMessage, listTitle } from './homeText'
import mascotLaptop from './assets/home-mascot-laptop.png'
import './HomePage.css'

// S-02 홈 — P0-핵심: 날짜별 예약 목록 (09 S-02, F-RSV-02, 디자인 v3.0 Home-Core-TodayList, chagok-frontend#24).
// - 날짜는 ?date=YYYY-MM-DD (없거나 잘못되면 오늘, 오늘이면 URL에서 뺌). 새로 고쳐도 같은 날짜.
// - 다음 이슈가 이어서 고친다: 요약 숫자(#28), [예약 등록]·M-02(#25), 줄 → 예약 상세 패널(#26), 캘린더(P0-나머지 #30·#36).
// - TODO(#18): 빈 상태·오류 표시는 공통 EmptyState·ErrorNotice가 머지되면 그것으로 바꾼다(지금은 이 화면 안의 임시 표시).
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todaySeoul()
  const queryDate = searchParams.get(QUERY.DATE)
  const date = isValidDate(queryDate) ? queryDate : today
  const { state, reload } = useDayReservations(date)

  function changeDate(next) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete(QUERY.DATE)
    else params.set(QUERY.DATE, next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="home-page">
      <header className="page-header">
        <div>
          <h1>홈</h1>
          <p>{formatFullDate(today)}</p>
        </div>
      </header>

      <section className="home-card" aria-labelledby="home-list-title">
        <div className="home-card__head">
          <div>
            <h2 id="home-list-title" className="home-card__title">{listTitle(date, today)}</h2>
            <p className="home-card__sub">시각순</p>
          </div>
          <DateNavigator date={date} today={today} onChange={changeDate} />
        </div>

        <div className="home-card__body" aria-busy={state.kind === 'loading'}>
          {state.kind === 'loading' && <p className="home-state">예약을 불러오는 중…</p>}

          {state.kind === 'error' && (
            <div className="home-state home-state--error" role="alert">
              <p>{state.error?.message || '예약을 불러오지 못했습니다.'}</p>
              <button type="button" className="home-retry" onClick={reload}>다시 시도</button>
            </div>
          )}

          {state.kind === 'ok' && state.items.length === 0 && (
            <div className="home-empty">
              <img src={mascotLaptop} alt="" height="120" />
              <p>{emptyDayMessage(date, today)}</p>
            </div>
          )}

          {state.kind === 'ok' && state.items.length > 0 && (
            <ReservationList items={state.items} label={listTitle(date, today)} />
          )}
        </div>
      </section>
    </div>
  )
}
