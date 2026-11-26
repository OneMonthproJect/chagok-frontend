import { useEffect, useState } from 'react'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'
import { PREVIEW_MESSAGES as M, itemStatusTableRows, previewBasisText } from '../maintenanceFlow'
import { useItemStatus } from '../useItemStatus'
import { parseWholeNumber } from '../visitRecordFlow'
import './visitPreview.css'

// S-08 저장 전 미리보기 (09 S-08 3번, 04 F-VIS-01, 08 10, 05 POL-04·125, 디자인 v3.0 S-08 미리보기 카드).
// - 주행거리를 넣으면 입력이 멈춘 뒤 0.5초에 08 10 `?mileage=`로 다시 부른다. 비우면 날짜 기준만(T11). 기록을 남기지 않는다.
// - 상태·도래 근거·다음 정비일·km는 서버 값 그대로(ItemStatusList·StatusBadge). 줄 모양은 S-07 점검 주기 표와 같은 itemStatusTableRows.
// - 숫자가 아닌 입력은 부르지 않고 마지막 결과를 둔다(칸 오류는 저장할 때 visitRecordFlow가 보인다).
// - 입력이 멈추기를 기다리는 0.5초 동안도 "불러오는 중"으로 보이고 목록을 흐리게 둔다 — 지난 값 기준 결과를 "최신"으로 보이지 않게(09 S-08 3번).
// - 실패해도 자동으로 다시 부르지 않는다 — 사람이 "다시 불러오기"를 누를 때만(POL-125). 400(주행거리 범위)은 같은 값으로 다시 불러도 같아 버튼이 없고, 서버의 칸 이유를 보인다.
//   미리보기 실패는 방문 기록 입력·저장을 막지 않는다(입력값은 pages가 가진다).
// - 차량이 바뀌면 pages가 key로 새로 만든다(앞 차량의 주행거리로 부르지 않게).
// props: vehicleId(number) · mileage(주행거리 칸의 글자 그대로)

export const PREVIEW_DELAY_MS = 500

export default function VisitPreview({ vehicleId, mileage }) {
  const parsed = parseWholeNumber(mileage)
  const [query, setQuery] = useState(() => (Number.isNaN(parsed) ? null : parsed))

  useEffect(() => {
    if (Number.isNaN(parsed) || parsed === query) return
    const timer = setTimeout(() => setQuery(parsed), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [parsed, query])

  const preview = useItemStatus(vehicleId, query)
  const failed = preview.status === 'error' || preview.status === 'notFound'
  const waiting = !Number.isNaN(parsed) && parsed !== query
  const loading = waiting || preview.status === 'loading'
  const stateLabel = loading ? M.STATE_LOADING : failed ? M.STATE_FAILED : M.STATE_READY
  const invalid = preview.error?.code === 'INVALID_INPUT'
  const canRetry = preview.status === 'error' && !invalid
  // 400은 같은 값으로 저장해도 칸 오류가 나므로 "저장에 영향 없음" 대신 서버의 칸 이유를 보인다(POL-121)
  // 404(없는 차량·다른 정비소 차량)는 여기까지 오지 않는다: S-08이 먼저 08 09로 차량을 불러 404면 "찾을 수 없습니다"로 막는다
  // (2026-11-26 실서버에서 B 토큰 → /visits/new?vehicleId=4 확인, 미리보기 요청 없음). 그래서 실패 문구는 404를 따로 나누지 않는다.
  const failBody = invalid ? (preview.error.fieldErrors?.[0]?.reason ?? preview.error.message) : M.NO_EFFECT

  return (
    <div className="visit-preview">
      <div className="visit-preview__head">
        <div>
          <span className="visit-preview__chip">{M.CHIP}</span>
          <h2 id="visit-preview-title" className="visit-preview__title">
            {M.TITLE}
          </h2>
          {preview.data && <p className="visit-preview__meta">{previewBasisText(preview.data)}</p>}
        </div>
        <span className="visit-preview__state" aria-live="polite">
          {stateLabel}
        </span>
      </div>
      <div className="visit-preview__body">
        {failed ? (
          <ErrorNotice title={M.FAILED} body={failBody} onRetry={canRetry ? preview.reload : undefined} retryLabel="다시 불러오기" />
        ) : preview.data ? (
          <ItemStatusList variant="preview" items={itemStatusTableRows(preview.data.items)} loading={loading} />
        ) : (
          <span className="visit-preview__loading" role="status" aria-label={M.STATE_LOADING} />
        )}
      </div>
    </div>
  )
}
