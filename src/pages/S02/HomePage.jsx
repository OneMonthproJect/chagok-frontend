import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import DateNavigator from '@/features/reservation/components/DateNavigator.jsx'
import MonthCalendar from '@/features/reservation/components/MonthCalendar.jsx'
import ReservationList from '@/features/reservation/components/ReservationList.jsx'
import ReservationPanel from '@/features/reservation/components/ReservationPanel.jsx'
import ReservationFormModal from '@/features/reservation/components/ReservationFormModal.jsx'
import { formatFullDate, isValidDate, todaySeoul } from '@/features/reservation/dates'
import { parseReservationId } from '@/features/reservation/panelFlow'
import { useDayReservations } from '@/features/reservation/useDayReservations'
import { useMonthSummary } from '@/features/reservation/useMonthSummary'
import { useReservationPanel } from '@/features/reservation/useReservationPanel'
import SummaryCards from '@/features/home/components/SummaryCards.jsx'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import VehiclePicker from '@/features/customer/components/VehiclePicker.jsx'
import CustomerVehicleFormModal from '@/features/customer/components/CustomerVehicleFormModal.jsx'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { PATHS, QUERY, vehiclePath } from '@/app/paths'
import { appRoutes } from '@/app/routes'
import { emptyDayMessage, listTitle } from './homeText'
import { useServiceItems } from './useServiceItems'
import mascotLaptop from './assets/home-mascot-laptop.png'
import './HomePage.css'

// S-02 홈 — 월 캘린더(P0-나머지 #30) + 고른 날짜의 예약 목록 + 예약 상세 패널 + 예약 등록·변경 M-02
//   (09 S-02·M-02, F-RSV-01·02·03·04·05·06, 디자인 v3.0 Home-Core-TodayList·Home-Week·Modal-Create·Modal-Edit).
// - 날짜는 ?date=YYYY-MM-DD (없거나 잘못되면 오늘, 오늘이면 URL에서 뺌). 새로 고쳐도 같은 날짜.
//   캘린더는 그 날짜가 속한 달을 보이고(08 42 건수), 날짜 칸을 누르면 ?date=가 바뀌어 아래 목록(08 15, P0-핵심 목록 재사용)이 그날로 바뀐다.
//   주 보기·월↔주 전환(기본 주 보기)은 #36이 이어서 고친다. "내 담당만" 토글은 #30에서 넣지 않았다(42에 담당 쿼리가 없음, ❓ PR 본문).
// - 예약 상세 패널은 ?reservation=<id> (#26). 줄을 누르면 열고(기록 하나 추가), 닫기·Esc·뒤로 가기는 쿼리를 지운다.
//   패널 안 [방문 완료](08 18)가 성공하면 S-08(/visits/new?vehicleId=&reservationId=)로, 409면 패널·목록을 다시 불러오고 이동하지 않는다.
//   [상세 이동]은 S-07(/vehicles/:vehicleId). [변경]은 M-02 변경 모드(#25).
//   [취소]·[노쇼](08 20·21, #31)는 확인 대화상자를 거친다. 성공·409 모두 패널·목록·요약을 다시 불러온다(자동 재전송 없음).
// - [예약 등록](머리·빈 날) → M-02 (#25). 차량은 customer의 VehiclePicker, 신규는 M-01(CustomerVehicleFormModal), 항목은 13 —
//   여기서 조립한다(feature끼리 import 금지). 등록·변경되면 그 날짜 목록으로 옮겨 다시 불러온다.
// - 요약 숫자(#28, 08 04): 오늘 예약·오늘 연락할 고객. 다른 날짜를 볼 때만 "목록 →"(오늘로), [보기 →]는 S-04 라우트가 있을 때만(→ /targets).
//   예약이 바뀌면(등록·변경·409) 함께 다시 부른다.
// - 다음 이슈가 이어서 고친다: 주 캘린더(P0-나머지 #36), 방문 접수·정정(#33).

/** 패널을 목록에서 열었는지(이때만 닫기 = 뒤로 가기). 주소로 바로 들어왔으면 쿼리만 지운다 */
const PANEL_FROM_LIST = 'panelFromList'

/**
 * S-04 화면이 있을 때만 [보기 →]를 그린다(연결 안 된 버튼 없음).
 * app/routes는 이 파일(S-02 route.jsx)을 불러오면서 만들어지므로(순환), 모듈을 읽는 시점이 아니라 그릴 때 확인한다.
 */
function hasTargetsPage() {
  return appRoutes.some((route) => route.path === PATHS.TARGETS)
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const today = todaySeoul()
  const queryDate = searchParams.get(QUERY.DATE)
  const date = isValidDate(queryDate) ? queryDate : today
  const { state, reload: reloadList } = useDayReservations(date)
  const month = useMonthSummary(date)
  const summary = useHomeSummary()
  const reservationId = parseReservationId(searchParams.get(QUERY.RESERVATION)) // undefined면 패널 닫힘
  const panelOpen = reservationId !== undefined
  const openedFromList = location.state?.[PANEL_FROM_LIST] === true
  const items = useServiceItems()
  const [createOpen, setCreateOpen] = useState(false)
  const [registerQuery, setRegisterQuery] = useState(null) // M-01을 열 때의 검색어 (null = 닫힘)
  const pickVehicleRef = useRef(null) // M-02 안의 차량 선택 함수 (M-01로 새로 등록한 차량을 채울 때)

  /** 목록·캘린더 건수·요약을 함께 다시 부른다 (예약이 바뀐 뒤) */
  function reload() {
    reloadList()
    month.reload()
    summary.reload()
  }

  function changeDate(next) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete(QUERY.DATE)
    else params.set(QUERY.DATE, next)
    // 패널을 연 채 날짜를 바꾸면 닫기는 뒤로 가기가 아니라 쿼리 지우기(뒤로 가면 이전 날짜로 돌아가므로)
    setSearchParams(params, { replace: true, state: null })
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

  /** 등록·변경 뒤: 그 날짜 목록으로 옮기거나(다른 날) 다시 불러온다(같은 날) */
  function showSaved(saved) {
    const savedDate = saved.reservedAt.slice(0, 10)
    if (savedDate === date) reload()
    else {
      changeDate(savedDate) // 날짜가 바뀌면 목록은 새로 불린다(다른 달이면 캘린더도)
      month.reload() // 같은 달이면 조회 기간이 같아 저절로 다시 부르지 않는다. 다른 달이면 새 달 응답이 이 요청을 덮는다
      summary.reload()
    }
  }

  function handleCreated(saved) {
    setCreateOpen(false)
    showSaved(saved)
  }

  /** 409 같은 차량 유효 예약 → 기존 예약 상세 패널 */
  function openExisting(id) {
    setCreateOpen(false)
    openReservation(id)
  }

  function renderVehiclePicker({ value, onChange }) {
    pickVehicleRef.current = onChange
    return <VehiclePicker value={value} onChange={onChange} onRegister={(query) => setRegisterQuery(query ?? '')} />
  }

  return (
    <div className={`home-page${panelOpen ? ' has-panel' : ''}`}>
      <header className="page-header">
        <div>
          <h1>홈</h1>
          <p>{formatFullDate(today)}</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setCreateOpen(true)}>+ 예약 등록</Button>
        </div>
      </header>

      <SummaryCards
        state={summary.state}
        onReload={summary.reload}
        onShowToday={date !== today ? () => changeDate(today) : undefined}
        onShowTargets={hasTargetsPage() ? () => navigate(PATHS.TARGETS) : undefined}
      />

      <div className="home-layout">
        <div className="home-main">
          <section className="home-card" aria-label="예약 캘린더">
            <div className="home-card__body">
              <MonthCalendar date={date} today={today} state={month.state} onSelectDate={changeDate} onReload={month.reload} />
            </div>
          </section>

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
                <ErrorNotice title="예약을 불러오지 못했습니다." error={state.error} onRetry={reloadList} />
              )}

              {state.kind === 'ok' && state.items.length === 0 && (
                <EmptyState
                  title={emptyDayMessage(date, today)}
                  illustration={<img className="home-empty__mascot" src={mascotLaptop} alt="" />}
                  action={date >= today ? { label: '예약 등록', onClick: () => setCreateOpen(true) } : undefined}
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
        </div>

        {panelOpen && (
          <HomeReservationPanel
            reservationId={reservationId}
            items={items}
            onClose={closePanel}
            onConflict={reload}
            onStatusChanged={reload}
            onEdited={showSaved}
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

      {createOpen && (
        <ReservationFormModal
          mode="create"
          initialDate={date}
          items={items}
          vehiclePicker={renderVehiclePicker}
          onSaved={handleCreated}
          onClose={() => setCreateOpen(false)}
          onOpenExisting={openExisting}
        />
      )}

      {registerQuery !== null && (
        <CustomerVehicleFormModal
          initialQuery={registerQuery}
          context="reservation"
          stacked
          onCreated={(created) => {
            pickVehicleRef.current?.({ vehicleId: created.vehicleId, plateNumber: created.plateNumber, customerId: created.customerId, customerName: created.name })
            setRegisterQuery(null)
          }}
          onClose={() => setRegisterQuery(null)}
        />
      )}
    </div>
  )
}

/**
 * 패널이 열렸을 때만 17을 부른다. 409 뒤에는 목록도 다시 불러 같은 상태를 보인다(목록·패널이 어긋나지 않게).
 * [변경] → M-02 변경 모드: 패널이 읽은 예약(version 포함)으로 열고, 저장되면 패널·목록을 다시 불러온다.
 */
function HomeReservationPanel({ reservationId, items, onClose, onConflict, onStatusChanged, onCompleted, onEdited, onOpenVehicle }) {
  const panel = useReservationPanel(reservationId)
  const [editTarget, setEditTarget] = useState(null)

  async function complete() {
    const result = await panel.complete()
    if (result.kind === 'completed') onCompleted(result.data)
    else if (result.kind === 'conflict') onConflict()
  }

  /** [취소]·[노쇼] 확인 뒤 (#31). 패널은 hook이 다시 읽고, 목록·요약은 바뀌었거나(성공) 어긋났을 수 있어(409) 다시 부른다 */
  async function changeStatus(action) {
    const result = await panel.changeStatus(action)
    if (result.kind === 'changed') onStatusChanged()
    else if (result.kind === 'conflict') onConflict()
  }

  function openEdit(data) {
    setEditTarget({
      reservationId: data.reservation.reservationId,
      version: data.reservation.version,
      reservedAt: data.reservation.reservedAt,
      purpose: data.reservation.purpose,
      vehicle: { vehicleId: data.vehicle.vehicleId, plateNumber: data.vehicle.plateNumber, customerName: data.customer.name },
    })
  }

  return (
    <>
      <ReservationPanel
        panel={panel}
        onClose={onClose}
        onComplete={complete}
        onEdit={openEdit}
        onStatusChange={changeStatus}
        onOpenVehicle={onOpenVehicle}
      />
      {editTarget && (
        <ReservationFormModal
          mode="edit"
          target={editTarget}
          items={items}
          onSaved={(saved) => {
            setEditTarget(null)
            panel.reload()
            onEdited(saved)
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  )
}
