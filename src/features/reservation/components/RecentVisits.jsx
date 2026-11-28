import { ItemLabel } from '@/shared/ui/ItemIcon.jsx'
import {
  CUSTOMER_STATEMENT_LABEL,
  INSPECT_RESULT_LABELS,
  isCustomerStatement,
  mileageText,
  recordTypeLabel,
  visitDateText,
} from '../panelFlow'

// 예약 상세 패널 「최근 정비 이력」 (09 S-02 4번, 08 17 recentVisits = 11의 방문 모양, 최대 2회, D-54).
// 한 방문: 날짜 · 주행거리 / 항목 · 구분 · 점검 결과 · 고객 진술 · 메모. 받은 순서(최신순) 그대로. 빈 목록 문구는 패널이 정한다.
// P0-나머지(#29): 점검 결과(양호·주의)는 값이 있을 때만, 외부(source CUSTOMER_STATEMENT)는 "고객 진술" — S-07 정비 이력과 같은 표시.
export default function RecentVisits({ visits }) {
  return (
    <ol className="rsv-visits">
      {visits.map((visit) => (
        <li key={visit.visitKey} className="rsv-visits__visit">
          <p className="rsv-visits__head">
            <strong>{visitDateText(visit.visitDate)}</strong>
            <span>{mileageText(visit.mileage)}</span>
          </p>
          <ul className="rsv-visits__records">
            {visit.records.map((record) => (
              <li key={record.recordId}>
                <ItemLabel className="rsv-visits__item" name={record.itemName} />
                <span className="rsv-visits__type">{recordTypeLabel(record.type)}</span>
                {record.inspectResult && (
                  <span className={`rsv-visits__result rsv-visits__result--${record.inspectResult.toLowerCase()}`}>
                    {INSPECT_RESULT_LABELS[record.inspectResult]}
                  </span>
                )}
                {isCustomerStatement(record) && <span className="rsv-visits__source">{CUSTOMER_STATEMENT_LABEL}</span>}
                {record.memo && <span className="rsv-visits__memo">{record.memo}</span>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
