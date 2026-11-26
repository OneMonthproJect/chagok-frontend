import { useEffect, useRef, useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'
import {
  LOAD_FAILED_MESSAGE,
  NO_HISTORY_MESSAGE,
  NO_PURPOSE,
  NOT_FOUND_MESSAGE,
  RELOAD_LABEL,
  canOpenVehicleDetail,
  itemStatusRows,
  mileageText,
  modelYearText,
  purposeLabels,
  reservedAtText,
} from '../panelFlow'
import PanelActions from './PanelActions.jsx'
import PanelConfirmDialog from './PanelConfirmDialog.jsx'
import RecentVisits from './RecentVisits.jsx'
import ReservationStatusBadge from './ReservationStatusBadge.jsx'
import './ReservationPanel.css'

// 예약 상세 패널 (09 S-02 「예약 상세 패널」, F-RSV-03·04, 08 17·18, 디자인 v3.0 Home-Week·Home-Panel-Conflict409).
// 순서: 예약(일시·상태·목적) → 고객·차량(전체 연락처, D-40) → 점검 주기 요약 → 최근 방문 2회 + [상세 이동] → 버튼.
// 데이터·요청은 쓰는 화면이 useReservationPanel로 들고 넘긴다. 이동(S-07·S-08)과 닫기도 화면이 정한다(features는 경로를 모름).
// 넓은 화면(1024px 이상)은 목록 오른쪽, 좁은 화면은 화면 전체를 덮는다(CSS). Esc·닫기 버튼으로 닫는다.
// panel: useReservationPanel 결과 { status, data, error, notice, reload, complete, changeStatus }
// onEdit(data): 있으면 상태 "예약"에서 [변경]을 보인다(M-02 변경 모드는 쓰는 화면이 연다, #25)
// onStatusChange(action): 있으면 [취소]·[노쇼]를 보인다(#31). 확인 대화상자에서 확인하면 부른다(Promise) — 요청·목록 갱신은 쓰는 화면이 한다.
export default function ReservationPanel({ panel, onClose, onComplete, onEdit, onStatusChange, onOpenVehicle }) {
  const { status, data, error, notice, reload } = panel
  const headingRef = useRef(null)
  const reservationId = data?.reservation.reservationId
  const [confirming, setConfirming] = useState(null) // 'cancel' | 'noShow' | null

  // 다른 예약으로 바뀌면 열린 확인 대화상자를 닫는다(대상이 바뀐 채 확인되지 않게)
  const [confirmFor, setConfirmFor] = useState(reservationId)
  if (confirmFor !== reservationId) {
    setConfirmFor(reservationId)
    setConfirming(null)
  }

  // 패널을 열거나 다른 예약으로 바뀌면 제목에 초점(화면 읽기 프로그램이 새 내용을 읽게)
  useEffect(() => {
    headingRef.current?.focus()
  }, [reservationId])

  function handleKeyDown(event) {
    // 확인 대화상자의 Esc는 대화상자만 닫는다(포털이라도 React 이벤트는 패널로 올라온다)
    if (event.key === 'Escape' && !confirming) onClose()
  }

  return (
    <aside className="rsv-panel" aria-labelledby="rsv-panel-title" onKeyDown={handleKeyDown}>
      <header className="rsv-panel__header">
        <h2 id="rsv-panel-title" className="rsv-panel__title" tabIndex={-1} ref={headingRef}>
          예약 상세
        </h2>
        <button type="button" className="rsv-panel__close" aria-label="예약 상세 닫기" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="rsv-panel__scroll">
        {notice?.tone === 'info' && <ErrorNotice tone="info" title={notice.message} />}
        {notice && notice.tone !== 'info' && (
          <ErrorNotice
            tone={notice.tone}
            error={notice.error}
            onRetry={notice.tone === 'error' ? reload : undefined}
            retryLabel={RELOAD_LABEL}
          />
        )}
        <PanelBody status={status} data={data} error={error} reload={reload} onOpenVehicle={onOpenVehicle} />
      </div>

      {data && (
        <footer className="rsv-panel__footer">
          <PanelActions
            status={data.reservation.status}
            needsAction={data.reservation.needsAction}
            disabled={status !== 'ready'}
            onComplete={onComplete}
            onEdit={onEdit ? () => onEdit(data) : undefined}
            onConfirm={onStatusChange ? setConfirming : undefined}
          />
        </footer>
      )}

      {confirming && data && (
        <PanelConfirmDialog
          action={confirming}
          target={{ plateNumber: data.vehicle.plateNumber, customerName: data.customer.name, reservedAt: data.reservation.reservedAt }}
          onConfirm={() => onStatusChange(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </aside>
  )
}

function PanelBody({ status, data, error, reload, onOpenVehicle }) {
  if (status === 'notFound') return <EmptyState compact title={NOT_FOUND_MESSAGE} />
  if (status === 'error') {
    return <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />
  }
  if (!data) {
    return (
      <p className="rsv-panel__state" role="status">
        예약을 불러오는 중…
      </p>
    )
  }

  const { reservation, customer, vehicle, recentVisits, totalVisitCount, itemStatuses } = data
  const purposes = purposeLabels(reservation.purpose)
  const detailEnabled = canOpenVehicleDetail(totalVisitCount)

  return (
    <div className={`rsv-panel__body${status === 'loading' ? ' is-refreshing' : ''}`} aria-busy={status === 'loading'}>
      <section className="rsv-panel__section" aria-label="예약">
        <div className="rsv-panel__chips">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.needsAction && <em className="rsv-row__needs-action">처리 필요</em>}
        </div>
        <p className="rsv-panel__when">{reservedAtText(reservation.reservedAt)}</p>
        <dl className="rsv-panel__facts">
          <dt>예약 목적</dt>
          <dd>
            {purposes.length === 0 ? (
              <span className="rsv-panel__muted">{NO_PURPOSE}</span>
            ) : (
              <span className="rsv-panel__purposes">
                {purposes.map((label) => (
                  <span key={label} className="rsv-panel__purpose">
                    {label}
                  </span>
                ))}
              </span>
            )}
          </dd>
          {reservation.purpose.memo && (
            <>
              <dt>메모</dt>
              <dd className="rsv-panel__memo">{reservation.purpose.memo}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rsv-panel__section" aria-label="고객·차량">
        <p className="rsv-panel__vehicle">
          <strong>{vehicle.plateNumber}</strong>
          <span>{vehicle.model}</span>
        </p>
        <p className="rsv-panel__meta">
          <span>{customer.name}</span>
          <span>{customer.phone}</span>
        </p>
        <p className="rsv-panel__meta">
          <span className={vehicle.modelYear == null ? 'rsv-panel__muted' : undefined}>{modelYearText(vehicle.modelYear)}</span>
          <span className={vehicle.latestMileage == null ? 'rsv-panel__muted' : undefined}>{mileageText(vehicle.latestMileage)}</span>
        </p>
      </section>

      <section className="rsv-panel__section" aria-labelledby="rsv-panel-cycle">
        <h3 id="rsv-panel-cycle" className="rsv-panel__subtitle">
          점검 주기
        </h3>
        <ItemStatusList variant="summary" items={itemStatusRows(itemStatuses)} />
      </section>

      <section className="rsv-panel__section" aria-labelledby="rsv-panel-history">
        <div className="rsv-panel__subhead">
          <h3 id="rsv-panel-history" className="rsv-panel__subtitle">
            최근 정비 이력
          </h3>
          <Button
            variant="secondary"
            size="sm"
            disabled={!detailEnabled}
            aria-describedby="rsv-panel-visit-count"
            onClick={() => onOpenVehicle(vehicle.vehicleId)}
          >
            상세 이동
          </Button>
        </div>
        <p id="rsv-panel-visit-count" className="rsv-panel__caption">
          총 방문 {totalVisitCount}회
        </p>
        {recentVisits.length === 0 ? <p className="rsv-panel__empty">{NO_HISTORY_MESSAGE}</p> : <RecentVisits visits={recentVisits} />}
      </section>
    </div>
  )
}
