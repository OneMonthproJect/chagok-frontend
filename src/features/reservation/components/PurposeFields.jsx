import { MEMO_MAX } from '../reservationForm'

// 예약 목적 (09 M-02: 6개 항목 체크(여러 개)·기타·메모, 모두 선택 입력, 07 3.9).
// 항목 목록(08 13)은 이 feature가 부르지 않고 화면(pages)이 items로 넘긴다(feature끼리 import 금지, STARTER 07 3.2).
// 사용: <PurposeFields idPrefix="rsv" items={[{ itemId, name }]} itemIds={[1]} other={false} memo="" onChange={(patch) => …} />
export default function PurposeFields({ idPrefix, items, itemIds, other, memo, onChange, error, memoError }) {
  function toggle(itemId) {
    onChange({ itemIds: itemIds.includes(itemId) ? itemIds.filter((id) => id !== itemId) : [...itemIds, itemId] })
  }

  return (
    <fieldset className="purpose-fields" aria-describedby={error ? `${idPrefix}-purpose-error` : undefined}>
      <legend>예약 목적 <small>(선택)</small></legend>
      <div className="purpose-fields__chips">
        {items.map((item) => (
          <label key={item.itemId} className={`purpose-chip${itemIds.includes(item.itemId) ? ' is-checked' : ''}`}>
            <input type="checkbox" checked={itemIds.includes(item.itemId)} onChange={() => toggle(item.itemId)} />
            {item.name}
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
