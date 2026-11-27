import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import { MECHANIC_MESSAGES as M } from '../mechanicFlow'

// S-08 담당 정비사 드롭다운 (09 S-08 5번, 04 F-MNT-01, 08 36·12 mechanicId, #62).
// - 후보·기본값·오류는 받은 그대로 보이기만 한다. 후보 조회(36)·기본값 계산·저장은 pages(mechanicFlow 함수).
// - 후보 조회 실패면 칸 대신 오류 안내 + 사람이 누르는 다시 불러오기(자동 재조회 없음, POL-125). 저장 막기는 pages가 한다.
// props: status('loading'|'ready'|'error') · options(MechanicOption[]) · value(number|null) · error(칸 오류) ·
//        loadError(ApiError) · onChange(staffId|null) · onRetry

export default function MechanicSelect({ status, options = [], value, error, loadError, onChange, onRetry }) {
  if (status === 'error') {
    return (
      <ErrorNotice title={M.LOAD_FAILED} body={M.LOAD_FAILED_BODY} error={loadError} onRetry={onRetry} retryLabel={M.RELOAD} />
    )
  }
  const loading = status !== 'ready'
  return (
    <FormField id="visit-mechanic" label={M.TITLE} required hint={M.HINT} error={error}>
      <select
        value={value == null ? '' : String(value)}
        disabled={loading}
        aria-busy={loading ? 'true' : undefined}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="" disabled>
          {loading ? M.LOADING : M.PLACEHOLDER}
        </option>
        {options.map((option) => (
          <option key={option.staffId} value={String(option.staffId)}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}
