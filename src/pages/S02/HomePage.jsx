import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import DateNavigator from '@/features/reservation/components/DateNavigator.jsx'
import ReservationList from '@/features/reservation/components/ReservationList.jsx'
import ReservationPanel from '@/features/reservation/components/ReservationPanel.jsx'
import { formatFullDate, isValidDate, todaySeoul } from '@/features/reservation/dates'
import { parseReservationId } from '@/features/reservation/panelFlow'
import { useDayReservations } from '@/features/reservation/useDayReservations'
import { useReservationPanel } from '@/features/reservation/useReservationPanel'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { PATHS, QUERY, vehiclePath } from '@/app/paths'
import { emptyDayMessage, listTitle } from './homeText'
import mascotLaptop from './assets/home-mascot-laptop.png'
import './HomePage.css'

// S-02 홈 — P0-핵심: 날짜별 예약 목록 + 예약 상세 패널 (09 S-02, F-RSV-02·03·04, 디자인 v3.0 Home-Core-TodayList·Home-Week).
// - 날짜는 ?date=YYYY-MM-DD (없거나 잘못되면 오늘, 오늘이면 URL에서 뺌). 새로 고쳐도 같은 날짜.
// - 예약 상세 패널은 ?reservation=<id> (#26). 줄을 누르면 열고(기록 하나 추가), 닫기·Esc·뒤로 가기는 쿼리를 지운다.
//   패널 안 [방문 완료](08 18)가 성공하면 S-08(/visits/new?vehicleId=&reservationId=)로, 409면 패널·목록을 다시 불러오고 이동하지 않는다.
//   [상세 이동]은 S-07(/vehicles/:vehicleId).
// - 다음 이슈가 이어서 고친다: 요약 숫자(#28), [예약 등록]·[변경]·M-02(#25), 캘린더(P0-나머지 #30·#36).
// - 빈 상태·오류는 공통 EmptyState·ErrorNotice(#18). 빈 날의 [예약 등록]은 M-02가 생기는 #25에서 action으로 넣는다.

/** 패널을 목록에서 열었는지(이때만 닫기 = 뒤로 가기). 주소로 바로 들어왔으면 쿼리만 지운다 */
const PANEL_FROM_LIST = 'panelFromList'

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const today = todaySeoul()
  const queryDate = searchParams.get(QUERY.DATE)
  const date = isValidDate(queryDate) ? queryDate : today
  const { state, reload } = useDayReservations(date)
  const reservationId = parseReservationId(searchParams.get(QUERY.RESERVATION)) // undefined면 패널 닫힘
  const panelOpen = reservationId !== undefined
  const openedFromList = location.state?.[PANEL_FROM_LIST] === true

  function changeDate(next) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete(QUERY.DATE)
    else params.set(QUERY.DATE, next)
    setSearchParams(params, { replace: true, state: location.state })
  }

  function openReservation(id) {
    const params = new URLSearchParams(searchParams)
    params.set(QUERY.RESERVATION, String(id))
    // 패널이 이미 열려 있으면 바꾸기만 한다(뒤로 가기 한 번에 닫히도록)
    if (panelOpen) setSearchParams(params, { replace: true, state: location.state })
    else setSearchParams(params, { state: { [PANEL_FROM_LIST]: true } })
  }

  function closePanel() {
    if (openedFromList) {
      navigate(-1)
      return
    }
    const params = new URLSearchParams(searchParams)
    params.delete(QUERY.RESERVATION)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className={`home-page${panelOpen ? ' has-panel' : ''}`}>
      <header className="page-header">
        <div>
          <h1>홈</h1>
          <p>{formatFullDate(today)}</p>
        </div>
      </header>

      <div className="home-layout">
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
              <ErrorNotice title="예약을 불러오지 못했습니다." error={state.error} onRetry={reload} />
            )}

            {state.kind === 'ok' && state.items.length === 0 && (
              <EmptyState
                title={emptyDayMessage(date, today)}
                illustration={<img className="home-empty__mascot" src={mascotLaptop} alt="" />}
              />
            )}

            {state.kind === 'ok' && state.items.length > 0 && (
              <ReservationList
                items={state.items}
                label={listTitle(date, today)}
                selectedId={reservationId ?? null}
                onSelect={openReservation}
              />
            )}
          </div>
        </section>

        {panelOpen && (
          <HomeReservationPanel
            reservationId={reservationId}
            onClose={closePanel}
            onConflict={reload}
            onCompleted={(done) => {
              const params = new URLSearchParams({
                [QUERY.VEHICLE_ID]: String(done.vehicleId),
                [QUERY.RESERVATION_ID]: String(done.reservationId),
              })
              navigate(`${PATHS.VISIT_NEW}?${params}`)
            }}
            onOpenVehicle={(vehicleId) => navigate(vehiclePath(vehicleId))}
          />
        )}
      </div>
    </div>
  )
}

/** 패널이 열렸을 때만 17을 부른다. 409 뒤에는 목록도 다시 불러 같은 상태를 보인다(목록·패널이 어긋나지 않게) */
function HomeReservationPanel({ reservationId, onClose, onConflict, onCompleted, onOpenVehicle }) {
  const panel = useReservationPanel(reservationId)

  async function complete() {
    const result = await panel.complete()
    if (result.kind === 'completed') onCompleted(result.data)
    else if (result.kind === 'conflict') onConflict()
  }

  return <ReservationPanel panel={panel} onClose={onClose} onComplete={complete} onOpenVehicle={onOpenVehicle} />
}
