import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { RECORD_EDIT_TEXT as T, revisionChangeText, revisionHeadText } from '../recordEditFlow'
import { useRecordRevisions } from '../useRecordRevisions'
import './recordEdit.css'

// S-07 수정 이력 패널 (09 S-07 「"수정됨" 꼬리표를 누르면 수정 이력 패널」, 04 F-MNT-04, 08 7.1 38, #34).
// 오래된 것부터(서버 순서 그대로): 수정 날짜 · 수정자 / 바뀐 항목 「항목명: 전 → 후」 / 사유(있을 때만).
// 열 때 한 번 부르고, 실패하면 사람이 누르는 다시 불러오기만 둔다(자동 재요청 없음, POL-125).
// props: recordId · title(부제: "엔진오일 · 2026.10.24" 등) · onClose
export default function RecordRevisionPanel({ recordId, title, onClose }) {
  const { state, reload } = useRecordRevisions(recordId)

  return (
    <Modal
      open
      title={T.REVISIONS_TITLE}
      subtitle={title}
      onClose={onClose}
      footer={
        <Button variant="secondary" data-autofocus onClick={onClose}>
          닫기
        </Button>
      }
    >
      {state.kind === 'loading' && (
        <p className="record-revisions__state" role="status">
          {T.REVISIONS_LOADING}
        </p>
      )}
      {state.kind === 'error' && <ErrorNotice title={T.REVISIONS_FAILED} error={state.error} onRetry={reload} retryLabel={T.RELOAD} />}
      {state.kind === 'ok' && state.items.length === 0 && <p className="record-revisions__state">{T.REVISIONS_EMPTY}</p>}
      {state.kind === 'ok' && state.items.length > 0 && (
        <ol className="record-revisions">
          {state.items.map((revision) => (
            <li key={revision.revisionNo} className="record-revisions__item">
              <p className="record-revisions__head">{revisionHeadText(revision)}</p>
              {revision.changes.map((change) => (
                <p key={change.field} className="record-revisions__change">
                  {revisionChangeText(change)}
                </p>
              ))}
              {revision.reason && <p className="record-revisions__reason">사유: {revision.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
