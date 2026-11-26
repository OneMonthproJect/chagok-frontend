import FormField from '@/shared/ui/FormField.jsx'
import { MEMO_MAX, RECORD_CHOICES, rowOf } from '../visitRecordFlow'
import './visitRecord.css'

// S-08 항목 기록: 항목 줄마다 기록 안 함(기본) / 교체 / 점검 + 메모 (09 S-08 4번, 04 F-MNT-01, 08 12·13).
// - 항목은 API 13의 쓰는 항목을 sortOrder 순으로 pages가 넘긴다(recordItems). 상태는 여기서 보이지 않는다(미리보기는 #35).
// - 메모 칸은 기록 안 함이 아닌 줄에만 연다. 기록 안 함으로 되돌려도 쓴 메모는 지우지 않는다(다시 고르면 그대로).
// - 거절·외부·점검 결과(P0-나머지 #29)는 그 이슈가 선택지를 더한다.
// props: items([{ itemId, name }]) · form · memoErrors({ itemId: 문구 }) · onChoice(itemId, choice) · onMemo(itemId, text)

export default function ItemRecordRows({ items, form, memoErrors = {}, onChoice, onMemo }) {
  return (
    <ul className="item-record-rows">
      {items.map((item) => {
        const row = rowOf(form, item.itemId)
        const nameId = `record-name-${item.itemId}`
        return (
          <li key={item.itemId} className={`item-record-row${row.choice !== 'NONE' ? ' item-record-row--selected' : ''}`}>
            <div className="item-record-row__main">
              <span id={nameId} className="item-record-row__name">
                {item.name}
              </span>
              <div className="item-record-row__choices" role="radiogroup" aria-labelledby={nameId}>
                {RECORD_CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className={`item-record-row__choice${row.choice === choice.value ? ' item-record-row__choice--checked' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`record-${item.itemId}`}
                      value={choice.value}
                      checked={row.choice === choice.value}
                      onChange={() => onChoice(item.itemId, choice.value)}
                    />
                    {choice.label}
                  </label>
                ))}
              </div>
            </div>
            {row.choice !== 'NONE' && (
              <div className="item-record-row__memo">
                <FormField id={`record-memo-${item.itemId}`} label={`${item.name} 메모 (선택)`} error={memoErrors[item.itemId]}>
                  <input
                    type="text"
                    maxLength={MEMO_MAX}
                    autoComplete="off"
                    placeholder="확인한 내용·고객에게 안내한 말 (200자 이내)"
                    value={row.memo}
                    onChange={(e) => onMemo(item.itemId, e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
