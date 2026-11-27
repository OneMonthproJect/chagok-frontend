import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL, REVISION_TEXT, revisionChangeText, revisionKindLabel, revisionTimeText } from '../panelFlow'
import { useReservationRevisions } from '../useReservationRevisions'
import './ReservationPanel.css'

// 예약 변경 이력 대화상자 (09 S-02 「이력 보기(재배정·정정 이력)」, 08 41, #33).
// 오래된 것부터(서버 순서 그대로): 일시 · 종류(상태 정정·메모 정정·담당 재배정) · 바꾼 사람 · 「전 → 후」 · 사유.
// 열 때 한 번 부르고, 실패하면 사람이 누르는 다시 불러오기만 둔다(자동 재요청 없음).
export default function RevisionHistoryDialog({ reservationId, onClose }) {
  const { state, reload } = useReservationRevisions(reservationId)

  return (
    <Modal
      open
      title={REVISION_TEXT.title}
      onClose={onClose}
      footer={
        <Button variant="secondary" data-autofocus onClick={onClose}>
          닫기
        </Button>
      }
    >
      {state.kind === 'loading' && (
        <p className="rsv-panel__state" role="status">
          이력을 불러오는 중…
        </p>
      )}
      {state.kind === 'error' && <ErrorNotice title={LOAD_FAILED_MESSAGE} error={state.error} onRetry={reload} retryLabel={RELOAD_LABEL} />}
      {state.kind === 'ok' && state.items.length === 0 && <p className="rsv-panel__empty">{REVISION_TEXT.empty}</p>}
      {state.kind === 'ok' && state.items.length > 0 && (
        <ol className="rsv-revisions">
          {state.items.map((revision, index) => (
            <li key={`${revision.changedAt}-${index}`} className="rsv-revisions__item">
              <p className="rsv-revisions__head">
                <strong>{revisionKindLabel(revision.kind)}</strong>
                <span>
                  {revisionTimeText(revision.changedAt)} · {revision.changedBy.name}
                </span>
              </p>
              {revision.changes.map((change) => (
                <p key={change.field} className="rsv-revisions__change">
                  {revisionChangeText(change)}
                </p>
              ))}
              {revision.reason && <p className="rsv-revisions__reason">사유: {revision.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
