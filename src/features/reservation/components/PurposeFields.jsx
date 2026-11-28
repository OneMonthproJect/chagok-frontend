import ItemIcon from '@/shared/ui/ItemIcon.jsx'
import { MEMO_MAX } from '../reservationForm'

// 예약 목적 (09 M-02: 6개 항목 체크(여러 개)·기타·메모, 모두 선택 입력, 07 3.9).
// 항목 목록(08 13)은 이 feature가 부르지 않고 화면(pages)이 items로 넘긴다(feature끼리 import 금지, STARTER 07 3.2).
// highlightIds(#110 10절): S-04에서 연 예약의 점검 대상 항목 — 점선 테두리 + "점검 대상" 글자로만 강조한다. 체크는 하지 않는다(사람이 고름).
// 사용: <PurposeFields idPrefix="rsv" items={[{ itemId, name }]} itemIds={[1]} other={false} memo="" onChange={(patch) => …} />
export default function PurposeFields({ idPrefix, items, itemIds, other, memo, onChange, error, memoError, highlightIds = [] }) {
  function toggle(itemId) {
    onChange({ itemIds: itemIds.includes(itemId) ? itemIds.filter((id) => id !== itemId) : [...itemIds, itemId] })
  }

  return (
    <fieldset className="purpose-fields" aria-describedby={error ? `${idPrefix}-purpose-error` : undefined}>
      <legend>예약 목적 <small>(선택)</small></legend>
      <div className="purpose-fields__chips">
        {items.map((item) => (
          <label
            key={item.itemId}
            className={`purpose-chip${itemIds.includes(item.itemId) ? ' is-checked' : ''}${highlightIds.includes(item.itemId) ? ' is-target' : ''}`}
          >
            <input type="checkbox" checked={itemIds.includes(item.itemId)} onChange={() => toggle(item.itemId)} />
            <ItemIcon code={item.code} name={item.name} />
            {item.name}
            {highlightIds.includes(item.itemId) && <small className="purpose-chip__target">점검 대상</small>}
          </label>
        ))}
        <label className={`purpose-chip${other ? ' is-checked' : ''}`}>
          <input type="checkbox" checked={other} onChange={(e) => onChange({ other: e.target.checked })} />
          기타
        </label>
      </div>
      {error && <p id={`${idPrefix}-purpose-error`} className="rsv-form__error">⚠ {error}</p>}

      <label className="purpose-fields__memo" htmlFor={`${idPrefix}-memo`}>메모</label>
      <textarea
        id={`${idPrefix}-memo`}
        rows={2}
        maxLength={MEMO_MAX}
        placeholder="예: 에어컨 냄새"
        value={memo}
        onChange={(e) => onChange({ memo: e.target.value })}
        aria-invalid={memoError ? 'true' : undefined}
        aria-describedby={memoError ? `${idPrefix}-memo-error` : `${idPrefix}-memo-count`}
      />
      <p id={`${idPrefix}-memo-count`} className="purpose-fields__count">{memo.length}/{MEMO_MAX}</p>
      {memoError && <p id={`${idPrefix}-memo-error`} className="rsv-form__error">⚠ {memoError}</p>}
    </fieldset>
  )
}
