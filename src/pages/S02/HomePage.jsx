import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DateNavigator from '@/features/reservation/components/DateNavigator.jsx'
import ReservationList from '@/features/reservation/components/ReservationList.jsx'
import ReservationFormModal from '@/features/reservation/components/ReservationFormModal.jsx'
import { formatFullDate, isValidDate, todaySeoul } from '@/features/reservation/dates'
import { useDayReservations } from '@/features/reservation/useDayReservations'
import VehiclePicker from '@/features/customer/components/VehiclePicker.jsx'
import CustomerVehicleFormModal from '@/features/customer/components/CustomerVehicleFormModal.jsx'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { QUERY } from '@/app/paths'
import { emptyDayMessage, listTitle } from './homeText'
import { useServiceItems } from './useServiceItems'
import mascotLaptop from './assets/home-mascot-laptop.png'
import './HomePage.css'

// S-02 홈 — P0-핵심: 날짜별 예약 목록 (09 S-02, F-RSV-02, 디자인 v3.0 Home-Core-TodayList, chagok-frontend#24) + 예약 등록 M-02(#25).
// - 날짜는 ?date=YYYY-MM-DD (없거나 잘못되면 오늘, 오늘이면 URL에서 뺌). 새로 고쳐도 같은 날짜.
// - [예약 등록](머리·빈 날) → M-02. 차량은 customer의 VehiclePicker, 신규는 M-01(CustomerVehicleFormModal), 항목은 13 — 여기서 조립한다
//   (feature끼리 import 금지). 등록되면 그 날짜 목록으로 옮겨 다시 불러온다.
// - 다음 이슈가 이어서 고친다: 요약 숫자(#28), 줄 → 예약 상세 패널·[변경](#26), 캘린더(P0-나머지 #30·#36).
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todaySeoul()
  const queryDate = searchParams.get(QUERY.DATE)
  const date = isValidDate(queryDate) ? queryDate : today
  const { state, reload } = useDayReservations(date)
  const items = useServiceItems()
  const [createOpen, setCreateOpen] = useState(false)
  const [registerQuery, setRegisterQuery] = useState(null) // M-01을 열 때의 검색어 (null = 닫힘)
  const pickVehicleRef = useRef(null) // M-02 안의 차량 선택 함수 (M-01로 새로 등록한 차량을 채울 때)

  function changeDate(next) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete(QUERY.DATE)
    else params.set(QUERY.DATE, next)
    setSearchParams(params, { replace: true })
  }

  function handleSaved(saved) {
    setCreateOpen(false)
    const savedDate = saved.reservedAt.slice(0, 10)
    if (savedDate === date) reload()
    else changeDate(savedDate)
  }

  /** 409 같은 차량 유효 예약 → 기존 예약 상세 패널 (?reservation=, 패널은 #26) */
  function openExisting(reservationId) {
    setCreateOpen(false)
    const params = new URLSearchParams(searchParams)
    params.set(QUERY.RESERVATION, String(reservationId))
    setSearchParams(params)
  }

  function renderVehiclePicker({ value, onChange }) {
    pickVehicleRef.current = onChange
    return <VehiclePicker value={value} onChange={onChange} onRegister={(query) => setRegisterQuery(query ?? '')} />
  }

  return (
    <div className="home-page">
      <header className="page-header">
        <div>
          <h1>홈</h1>
          <p>{formatFullDate(today)}</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setCreateOpen(true)}>+ 예약 등록</Button>
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
            <ErrorNotice title="예약을 불러오지 못했습니다." error={state.error} onRetry={reload} />
          )}

          {state.kind === 'ok' && state.items.length === 0 && (
            <EmptyState
              title={emptyDayMessage(date, today)}
              illustration={<img className="home-empty__mascot" src={mascotLaptop} alt="" />}
              action={date >= today ? { label: '예약 등록', onClick: () => setCreateOpen(true) } : undefined}
            />
          )}

          {state.kind === 'ok' && state.items.length > 0 && (
            <ReservationList items={state.items} label={listTitle(date, today)} />
          )}
        </div>
      </section>

      {createOpen && (
        <ReservationFormModal
          mode="create"
          initialDate={date}
          items={items}
          vehiclePicker={renderVehiclePicker}
          onSaved={handleSaved}
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
