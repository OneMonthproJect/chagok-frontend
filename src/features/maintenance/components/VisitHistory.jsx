import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import {
  CUSTOMER_STATEMENT_LABEL,
  MORE_FAILED_MESSAGE,
  NO_HISTORY_MESSAGE,
  RECORD_TYPE_LABELS,
  SHOW_MORE_LABEL,
  dateText,
  visitCountText,
  visitMetaText,
} from '../maintenanceFlow'
import './visitHistory.css'

// S-07 정비 이력: 방문 단위 최신순 + 더 보기 (09 S-07·5장, 08 11, 디자인 v3.0 S-07).
// - 순서는 서버가 준 순서 그대로(visitDate 내림차순, 같으면 나중에 저장한 방문 먼저). 화면이 다시 정렬하지 않는다.
// - 방문 한 줄: 방문일 · 주행거리 · 담당 정비사, 그 아래 기록(항목 · 구분 · 메모). 외부 기록은 "고객 진술" 꼬리표.
//   기록마다 자기 날짜가 있다(외부는 고객이 말한 날짜) — 방문일과 다르면 기록 옆에 보인다.
// - 이력이 없으면 "정비 이력이 없습니다." 이어지는 "방문 기록" 버튼은 S-08(#23) 머지 뒤 #22 후속 PR이 붙인다(연결 안 된 버튼 금지, 09 0장).
// - 더 보기는 사람이 누를 때만 다음 쪽을 받는다. 실패하면 받은 이력은 그대로 두고 그 자리에서 다시 누르게 한다(POL-125).
// - 수정 버튼·"수정됨"·출처 "우리 정비소"(P0-나머지 #34)는 그 이슈가 더한다.
// props: visits(08 11 items[] 이어 붙인 것), totalElements, hasMore, loadingMore, moreError, onLoadMore

function RecordLine({ record, visitDate }) {
  const external = record.type === 'EXTERNAL'
  return (
    <li className="visit-record">
      <span className="visit-record__item">{record.itemName}</span>
      <span className={`visit-record__type visit-record__type--${record.type.toLowerCase()}`}>{RECORD_TYPE_LABELS[record.type]}</span>
      {external && <span className="visit-record__source">{CUSTOMER_STATEMENT_LABEL}</span>}
      {record.date !== visitDate && <span className="visit-record__date">{dateText(record.date)}</span>}
      {record.memo && <span className="visit-record__memo">{record.memo}</span>}
    </li>
  )
}

export default function VisitHistory({ visits, totalElements, hasMore = false, loadingMore = false, moreError = null, onLoadMore }) {
  return (
    <section className="visit-history" aria-labelledby="visit-history-title">
      <header className="visit-history__header">
        <h2 id="visit-history-title" className="visit-history__title">
          정비 이력
        </h2>
        <p className="visit-history__meta">{visitCountText(totalElements)}</p>
      </header>
      {visits.length === 0 ? (
        <EmptyState title={NO_HISTORY_MESSAGE} compact />
      ) : (
        <ol className="visit-history__list">
          {visits.map((visit) => (
            <li key={visit.visitKey} className="visit-item">
              <div className="visit-item__head">
                <strong className="visit-item__date">{dateText(visit.visitDate)}</strong>
                <span className="visit-item__meta">{visitMetaText(visit)}</span>
              </div>
              <ul className="visit-item__records">
                {visit.records.map((record) => (
                  <RecordLine key={record.recordId} record={record} visitDate={visit.visitDate} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {moreError && (
        <div className="visit-history__more-error">
          <ErrorNotice title={MORE_FAILED_MESSAGE} error={moreError} />
        </div>
      )}
      {hasMore && onLoadMore && (
        <div className="visit-history__more">
          <Button variant="secondary" size="sm" loading={loadingMore} pendingText="불러오는 중…" onClick={onLoadMore}>
            {SHOW_MORE_LABEL}
          </Button>
        </div>
      )}
    </section>
  )
}
