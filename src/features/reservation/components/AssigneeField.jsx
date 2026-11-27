import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import { ASSIGNEE_MESSAGES as M, REASSIGN_REASON_MAX } from '../assigneeRules'

// M-02 담당 정비사 칸 (09 M-02, 08 36·16·19, #37). 받은 값을 보이기만 한다 — 후보 조회(36)·기본값·재배정 가능 판단·저장은 ReservationFormModal.
// - 후보 조회 실패: 칸 대신 오류 안내 + 사람이 누르는 [다시 불러오기](자동 재조회 없음, POL-125). 등록은 모달이 저장을 막는다.
// - disabledReason이 있으면 칸을 잠그고 그 문구를 칸 아래에 보인다(재배정 마감·당일 정비사·지난 날짜).
// - showReason이면 재배정 사유 칸(당일 사장 재배정, 필수)을 연다.
// props: idPrefix · status('loading'|'ready'|'error') · candidates(08 36 items) · value(staffId|null) · onChange(staffId) ·
//        error · loadError(ApiError) · loadFailedBody · onRetry · disabledReason · hint ·
//        showReason · reason · onReasonChange(text) · reasonError

export default function AssigneeField({
  idPrefix,
  status,
  candidates = [],
  value,
  onChange,
  error,
  loadError,
  loadFailedBody,
  onRetry,
  disabledReason,
  hint,
  showReason = false,
  reason = '',
  onReasonChange,
  reasonError,
}) {
  if (status === 'error') {
    return (
      <section className="rsv-form__section">
        <p className="rsv-form__label">{M.LABEL}</p>
        <ErrorNotice title={M.LOAD_FAILED} body={loadFailedBody} error={loadError} onRetry={onRetry} retryLabel={M.RELOAD} />
        {error && <p className="rsv-form__error" role="alert">⚠ {error}</p>}
      </section>
    )
  }

  const loading = status !== 'ready'
  return (
    <section className="rsv-form__section">
      <FormField id={`${idPrefix}-assignee`} label={M.LABEL} required hint={disabledReason ?? hint} error={error}>
        <select
          value={value == null ? '' : String(value)}
          disabled={loading || Boolean(disabledReason)}
          aria-busy={loading ? 'true' : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="" disabled>
            {loading ? M.LOADING : M.PLACEHOLDER}
          </option>
          {candidates.map((c) => (
            <option key={c.staffId} value={String(c.staffId)}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>
      {showReason && (
        <FormField id={`${idPrefix}-reassign-reason`} label={M.REASON_LABEL} required error={reasonError}>
          <input
            type="text"
            maxLength={REASSIGN_REASON_MAX}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </FormField>
      )}
    </section>
  )
}
