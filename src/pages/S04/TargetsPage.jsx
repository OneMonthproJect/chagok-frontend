import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TargetList from '@/features/target/components/TargetList.jsx'
import { LOAD_FAILED_MESSAGE, NO_TARGETS_MESSAGE, itemRows, reservationQuery, vehicleOf } from '@/features/target/targetFlow'
import { useTargets } from '@/features/target/useTargets'
import { useMe } from '@/features/auth/useMe'
import ReservationFormModal from '@/features/reservation/components/ReservationFormModal.jsx'
import { formatFullDate } from '@/features/reservation/dates'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import mascotClipboard from '@/shared/ui/assets/mascot-clipboard.png'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { PATHS, QUERY } from '@/app/paths'
import { useServiceItems } from '@/pages/S02/useServiceItems'
import './TargetsPage.css'

// S-04 재점검 대상 (09 S-04, F-TGT-01, 08 14, 디자인 v3.0 Reinspection, chagok-frontend#27) — 시나리오 A: 대상 목록 → 예약.
// - 머리: 기준일(서버 asOf) · 대상 차량 수. 줄은 서버 순서 그대로(도래 먼저 → 다음 정비일 이른 순), 미동의 고객은 서버가 뺀다.
// - [예약 등록] → M-02(차량 채움 + 그 차량의 점검 대상 항목 안내·예약 목적 강조, #110 10절 — 체크는 사람이). 등록되면 목록을 다시 불러 "예약 있음"으로 바뀐다. 409 같은 차량 유효 예약 → S-02 패널.
// - "예약 있음 · 일시" → S-02(/?date=&reservation=)에서 예약 상세 패널.
// - 범위 밖(이 이슈에서 만들지 않음): 디자인의 「연락 준비」 패널·문자 초안·연락 결과(P1, 이슈 댓글), 필터·정렬·검색 탭(09 S-04에 없음).
// - 항목 목록(13)은 S-02와 같은 useServiceItems를 쓴다(M-02 예약 목적).
export default function TargetsPage() {
  const navigate = useNavigate()
  const { state, reload } = useTargets()
  const items = useServiceItems()
  const { me } = useMe() // M-02 담당 기본값 (08 03, #37)
  const [reserveTarget, setReserveTarget] = useState(null)

  function openReservation(active) {
    const q = reservationQuery(active)
    navigate(`${PATHS.HOME}?${new URLSearchParams({ [QUERY.DATE]: q.date, [QUERY.RESERVATION]: q.reservation })}`)
  }

  const data = state.kind === 'ok' ? state.data : null

  return (
    <div className="targets-page">
      <header className="targets-page__header">
        <h1>재점검 대상</h1>
        {data && (
          <p>
            기준일 {formatFullDate(data.asOf)} · 대상 차량 {data.items.length}대 · 안내 수신 동의 고객만
          </p>
        )}
      </header>

      <div aria-busy={state.kind === 'loading'}>
        {state.kind === 'loading' && <p className="targets-page__state">재점검 대상을 불러오는 중…</p>}
        {state.kind === 'error' && <ErrorNotice title={LOAD_FAILED_MESSAGE} error={state.error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <EmptyState title={NO_TARGETS_MESSAGE} illustration={<img src={mascotClipboard} alt="" width="96" height="96" />} />
        )}
        {data && data.items.length > 0 && (
          <TargetList items={data.items} onReserve={setReserveTarget} onOpenReservation={openReservation} />
        )}
      </div>

      {reserveTarget && (
        <ReservationFormModal
          mode="create"
          initialVehicle={vehicleOf(reserveTarget)}
          targetItems={itemRows(reserveTarget.targetItems)}
          targetItemIds={reserveTarget.targetItems.map((i) => i.itemId)}
          items={items}
          login={me}
          onSaved={() => {
            setReserveTarget(null)
            reload()
          }}
          onClose={() => setReserveTarget(null)}
          onOpenExisting={(reservationId) => {
            setReserveTarget(null)
            navigate(`${PATHS.HOME}?${new URLSearchParams({ [QUERY.RESERVATION]: String(reservationId) })}`)
          }}
        />
      )}
    </div>
  )
}
