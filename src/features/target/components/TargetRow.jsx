import { useId, useState } from 'react'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'
import Button from '@/shared/ui/Button.jsx'
import { activeReservationText, itemRows, statusCounts } from '../targetFlow'
import './target.css'

// 재점검 대상 한 줄 = 차량 하나 (09 S-04, 디자인 v3.0 Reinspection): 고객명·연락처 · 차량번호 · 대상 항목 요약 · 행동.
// - 행동: [예약 등록](M-02, 차량 채움) 또는 유효 예약이 있으면 "예약 있음 · 일시"(누르면 S-02 패널). 모달·이동은 화면이 정한다
//   (feature끼리 import 금지 — onReserve·onOpenReservation으로 알리기만).
// - 펼치면 대상 항목마다 상태·다음 정비일·기준 기록일(공통 ItemStatusList variant target). 상태는 서버 값 그대로.
// - 연락처는 서버 값 그대로(P0-나머지부터 서버가 마스킹). 연락 준비 패널·문자 초안·연락 결과는 P1(이 이슈 범위 밖).
export default function TargetRow({ target, onReserve, onOpenReservation }) {
  const detailId = useId()
  const [open, setOpen] = useState(false)
  const t = target

  return (
    <li className="target-row">
      <div className="target-row__main">
        <div className="target-row__customer">
          <b>{t.customerName}</b>
          <span>{t.phone}</span>
        </div>
        <div className="target-row__vehicle">
          <b>{t.plateNumber}</b>
        </div>
        <div className="target-row__items">
          {statusCounts(t.targetItems).map((c) => (
            <span key={c.status} className={`target-row__count target-row__count--${c.status}`}>{c.label}</span>
          ))}
          <span className="target-row__names">{t.targetItems.map((i) => i.name).join(', ')}</span>
        </div>
        <div className="target-row__action">
          {t.activeReservation ? (
            <button type="button" className="target-row__reserved" onClick={() => onOpenReservation(t.activeReservation)}>
              {activeReservationText(t.activeReservation)}
            </button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => onReserve(t)}>예약 등록</Button>
          )}
          <button
            type="button"
            className="target-row__toggle"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={open ? `${t.plateNumber} 대상 항목 접기` : `${t.plateNumber} 대상 항목 펼치기`}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id={detailId} className="target-row__detail">
          <ItemStatusList variant="target" items={itemRows(t.targetItems)} />
        </div>
      )}
    </li>
  )
}
