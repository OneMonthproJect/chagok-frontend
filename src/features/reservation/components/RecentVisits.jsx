import { mileageText, recordTypeLabel, visitDateText } from '../panelFlow'

// 예약 상세 패널 「최근 정비 이력」 (09 S-02 4번, 08 17 recentVisits = 11의 방문 모양, 최대 2회, D-54).
// 한 방문: 날짜 · 주행거리 / 항목 · 구분 · 메모. 받은 순서(최신순) 그대로. 빈 목록 문구는 패널이 정한다.
// P0-나머지의 점검 결과(주의)·출처(고객 진술) 표시는 그 이슈(#29·#31)가 더한다.
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
                <span className="rsv-visits__item">{record.itemName}</span>
                <span className="rsv-visits__type">{recordTypeLabel(record.type)}</span>
                {record.memo && <span className="rsv-visits__memo">{record.memo}</span>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
