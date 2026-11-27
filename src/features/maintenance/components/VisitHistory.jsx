import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import {
  CUSTOMER_STATEMENT_LABEL,
  INSPECT_RESULT_LABELS,
  MORE_FAILED_MESSAGE,
  NO_HISTORY_MESSAGE,
  RECORD_VISIT_LABEL,
  RECORD_TYPE_LABELS,
  SHOW_MORE_LABEL,
  dateText,
  isCustomerStatement,
  visitCountText,
  visitMetaText,
} from '../maintenanceFlow'
import { RECORD_EDIT_TEXT } from '../recordEditFlow'
import './visitHistory.css'

// S-07 정비 이력: 방문 단위 최신순 + 더 보기 (09 S-07·5장, 08 11, 디자인 v3.0 S-07).
// - 순서는 서버가 준 순서 그대로(visitDate 내림차순, 같으면 나중에 저장한 방문 먼저). 화면이 다시 정렬하지 않는다.
// - 방문 한 줄: 방문일 · 주행거리 · 담당 정비사, 그 아래 기록(항목 · 구분 · 점검 결과 · 메모).
//   고객 진술(08 11 source CUSTOMER_STATEMENT, source가 없으면 type EXTERNAL — isCustomerStatement)이면 "고객 진술" 꼬리표.
//   점검 결과(양호·주의)는 값이 있을 때만(F-MNT-03).
//   기록마다 자기 날짜가 있다(외부는 고객이 말한 날짜) — 방문일과 다르면 기록 옆에 보인다.
// - 이력이 없으면 "정비 이력이 없습니다." + "방문 기록"(09 5장). 버튼은 화면이 onRecordVisit을 넘길 때만 그린다(연결 안 된 버튼 금지, 09 0장).
// - 더 보기는 사람이 누를 때만 다음 쪽을 받는다. 실패하면 받은 이력은 그대로 두고 그 자리에서 다시 누르게 한다(POL-125).
// - 출처 "우리 정비소"(SHOP)는 따로 보이지 않는다(09 S-07은 외부만 표시).
// - P0-나머지 기록 수정(#34, F-MNT-04): 화면이 recordActions를 넘길 때만 그린다(연결 안 된 버튼 금지).
//   줄 오른쪽 "수정" — 쓸 수 없으면 비활성 모양 + 이유(툴팁·스크린리더 설명). 비활성이어도 초점은 받아 이유를 읽을 수 있게 aria-disabled로 둔다.
//   "수정됨"(08 11 edited) 꼬리표는 누르면 수정 이력 패널(08 38).
// props: visits(08 11 items[] 이어 붙인 것), totalElements, hasMore, loadingMore, moreError, onLoadMore, onRecordVisit(선택),
//        recordActions(선택): { permissionOf(record) → { enabled, reason }, onEdit(record, visit), onShowRevisions(record) }

function RecordLine({ record, visit, actions }) {
  const permission = actions ? actions.permissionOf(record) : null
  const reasonId = `visit-record-${record.recordId}-edit-reason`
  return (
    <li className="visit-record">
      <span className="visit-record__item">{record.itemName}</span>
      <span className={`visit-record__type visit-record__type--${record.type.toLowerCase()}`}>{RECORD_TYPE_LABELS[record.type]}</span>
      {record.inspectResult && (
        <span className={`visit-record__result visit-record__result--${record.inspectResult.toLowerCase()}`}>
          {INSPECT_RESULT_LABELS[record.inspectResult]}
        </span>
      )}
      {isCustomerStatement(record) && <span className="visit-record__source">{CUSTOMER_STATEMENT_LABEL}</span>}
      {record.date !== visit.visitDate && <span className="visit-record__date">{dateText(record.date)}</span>}
      {record.edited && actions && (
        <button
          type="button"
          className="visit-record__edited"
          aria-label={`${record.itemName} ${RECORD_EDIT_TEXT.EDITED} — 수정 이력 보기`}
          onClick={() => actions.onShowRevisions(record)}
        >
          {RECORD_EDIT_TEXT.EDITED}
        </button>
      )}
      {record.memo && <span className="visit-record__memo">{record.memo}</span>}
      {permission && (
        <span className="visit-record__actions">
          <button
            type="button"
            className="visit-record__edit"
            aria-label={`${record.itemName} 기록 ${RECORD_EDIT_TEXT.EDIT}`}
            aria-disabled={permission.enabled ? undefined : 'true'}
            aria-describedby={permission.enabled ? undefined : reasonId}
            title={permission.reason ?? undefined}
            onClick={() => {
              if (permission.enabled) actions.onEdit(record, visit)
            }}
          >
            {RECORD_EDIT_TEXT.EDIT}
          </button>
          {!permission.enabled && (
            <span id={reasonId} className="visually-hidden">
              {permission.reason}
            </span>
          )}
        </span>
      )}
    </li>
  )
}

export default function VisitHistory({
  visits,
  totalElements,
  hasMore = false,
  loadingMore = false,
  moreError = null,
  onLoadMore,
  onRecordVisit,
  recordActions,
}) {
  return (
    <section className="visit-history" aria-labelledby="visit-history-title">
      <header className="visit-history__header">
        <h2 id="visit-history-title" className="visit-history__title">
          정비 이력
        </h2>
        <p className="visit-history__meta">{visitCountText(totalElements)}</p>
      </header>
      {visits.length === 0 ? (
        <EmptyState
          title={NO_HISTORY_MESSAGE}
          compact
          action={onRecordVisit ? { label: RECORD_VISIT_LABEL, onClick: onRecordVisit } : undefined}
        />
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
                  <RecordLine key={record.recordId} record={record} visit={visit} actions={recordActions} />
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
