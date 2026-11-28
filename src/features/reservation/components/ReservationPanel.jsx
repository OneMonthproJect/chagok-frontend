import { useEffect, useRef, useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'
import LicensePlate from '@/shared/ui/LicensePlate.jsx'
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
  needsStartInput,
  purposeLabels,
  reservedAtText,
  startMissingFields,
} from '../panelFlow'
import AssigneeLabel from './AssigneeLabel.jsx'
import CorrectDialog from './CorrectDialog.jsx'
import PanelActions from './PanelActions.jsx'
import PanelConfirmDialog from './PanelConfirmDialog.jsx'
import RecentVisits from './RecentVisits.jsx'
import ReservationStatusBadge from './ReservationStatusBadge.jsx'
import RevisionHistoryDialog from './RevisionHistoryDialog.jsx'
import StartVisitDialog from './StartVisitDialog.jsx'
import './ReservationPanel.css'

// 예약 상세 패널 (09 S-02 「예약 상세 패널」, F-RSV-03·04·07~10, 08 17·18·20·21·39~41, 디자인 v3.0 Home-Week·Home-Panel-Conflict409).
// 순서: 예약(일시·상태·담당·목적) → 고객·차량(전체 연락처, D-40) → 점검 주기 요약 → 최근 방문 2회 + [상세 이동] → 버튼.
// 데이터·요청은 쓰는 화면이 useReservationPanel로 들고 넘긴다. 이동(S-07·S-08)과 닫기도 화면이 정한다(features는 경로를 모름).
// 넓은 화면(1024px 이상)은 목록 오른쪽, 좁은 화면은 화면 전체를 덮는다(CSS). Esc·닫기 버튼으로 닫는다.
// panel: useReservationPanel 결과 { status, data, error, notice, reload, complete, changeStatus }
// onEdit(data): 있으면 상태 "예약"에서 [변경]을 보인다(M-02 변경 모드는 쓰는 화면이 연다, #25)
// onStatusChange(action): 있으면 [취소]·[노쇼]를 보인다(#31). 확인 대화상자에서 확인하면 부른다(Promise) — 요청·목록 갱신은 쓰는 화면이 한다.
// onStart(body, options): 있으면 [방문 접수]를 보인다(#33). 차량에 연식·최근 주행거리가 비어 있으면 입력 대화상자를 거치고(D-58),
//   다 있으면 바로 부른다. Promise<PanelChangeResult>를 돌려준다. 접수 뒤에도 패널에 남는다(S-08 이동은 [방문 완료]만).
// onCorrect(body, options): 있으면 끝난 예약에 [정정]을 보인다(#33). role('OWNER'|'MECHANIC'|null)로 상태 선택지를 정한다(사장만).
// [이력 보기](08 41)는 조회만 하므로 패널이 스스로 연다.
export default function ReservationPanel({ panel, role = null, onClose, onComplete, onEdit, onStatusChange, onStart, onCorrect, onOpenVehicle }) {
  const { status, data, error, notice, reload } = panel
  const headingRef = useRef(null)
  const reservationId = data?.reservation.reservationId
  // 열린 대화상자: 'cancel' | 'noShow' | 'start' | 'correct' | 'history' | null
  const [dialog, setDialog] = useState(null)

  // 다른 예약으로 바뀌면 열린 대화상자를 닫는다(대상이 바뀐 채 확인되지 않게)
  const [dialogFor, setDialogFor] = useState(reservationId)
  if (dialogFor !== reservationId) {
    setDialogFor(reservationId)
    setDialog(null)
  }
  const confirming = dialog === 'cancel' || dialog === 'noShow' ? dialog : null

  // 패널을 열거나 다른 예약으로 바뀌면 제목에 초점(화면 읽기 프로그램이 새 내용을 읽게)
  useEffect(() => {
    headingRef.current?.focus()
  }, [reservationId])

  function handleKeyDown(event) {
    // 확인 대화상자의 Esc는 대화상자만 닫는다(포털이라도 React 이벤트는 패널로 올라온다)
    if (event.key === 'Escape' && !dialog) onClose()
  }

  /** [방문 접수]: 비어 있는 차량 값이 있으면 입력 대화상자, 없으면 바로 보낸다(Promise → 버튼 잠금) */
  function startVisit() {
    if (needsStartInput(startMissingFields(data.vehicle))) {
      setDialog('start')
      return undefined
    }
    return onStart({})
  }

  const target = data && { plateNumber: data.vehicle.plateNumber, customerName: data.customer.name, reservedAt: data.reservation.reservedAt }

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
            onConfirm={onStatusChange ? setDialog : undefined}
            onStart={onStart ? startVisit : undefined}
            onCorrect={onCorrect ? () => setDialog('correct') : undefined}
            onHistory={() => setDialog('history')}
          />
        </footer>
      )}

      {confirming && data && (
        <PanelConfirmDialog action={confirming} target={target} onConfirm={() => onStatusChange(confirming)} onClose={() => setDialog(null)} />
      )}
      {dialog === 'start' && data && (
        <StartVisitDialog
          target={target}
          missing={startMissingFields(data.vehicle)}
          onSubmit={(body) => onStart(body, { inline: true })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'correct' && data && (
        <CorrectDialog
          reservation={data.reservation}
          target={target}
          role={role}
          onSubmit={(body) => onCorrect(body, { inline: true })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'history' && data && <RevisionHistoryDialog reservationId={data.reservation.reservationId} onClose={() => setDialog(null)} />}
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
          {reservation.assignee && (
            <>
              <dt>담당</dt>
              <dd>
                <AssigneeLabel assignee={reservation.assignee} />
              </dd>
            </>
          )}
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
          <LicensePlate number={vehicle.plateNumber} />
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
