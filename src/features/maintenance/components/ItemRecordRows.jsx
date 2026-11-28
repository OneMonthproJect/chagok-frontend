import FormField from '@/shared/ui/FormField.jsx'
import ItemIcon from '@/shared/ui/ItemIcon.jsx'
import { INSPECT_RESULT_CHOICES, MEMO_MAX, RECORD_CHOICES, VISIT_MESSAGES, rowOf } from '../visitRecordFlow'
import './visitRecord.css'

// S-08 항목 기록: 항목 줄마다 기록 안 함(기본) / 교체 / 점검 / 거절 / 외부 + 메모 (09 S-08 4번, 04 F-MNT-01~03, 08 12·13).
// - 항목은 API 13의 쓰는 항목을 sortOrder 순으로 pages가 넘긴다(recordItems). 상태는 여기서 보이지 않는다(미리보기는 VisitPreview).
// - 점검이면 결과 양호·주의(고르지 않아도 됨, F-MNT-03), 외부면 정비일(필수, 오늘까지)·주행거리(선택) 칸을 연다(F-MNT-02).
// - 메모 칸은 기록 안 함이 아닌 줄에만 연다. 구분을 바꾸거나 기록 안 함으로 되돌려도 쓴 값은 지우지 않는다(다시 고르면 그대로).
//   요청에 어떤 값을 넣을지는 visitRecordFlow.toVisitSaveRequest가 정한다.
// - 값·오류는 받은 그대로 보이기만 한다. 검사는 visitRecordFlow.
// props: items([{ itemId, name }]) · form · errors(VisitRecordErrors의 memo·externalDate·externalMileage) · today · onChange(itemId, patch)

function RadioGroup({ name, labelledBy, choices, value, onPick, small = false }) {
  return (
    <div className={`item-record-row__choices${small ? ' item-record-row__choices--sm' : ''}`} role="radiogroup" aria-labelledby={labelledBy}>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={`item-record-row__choice${value === choice.value ? ' item-record-row__choice--checked' : ''}`}
        >
          <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onPick(choice.value)} />
          {choice.label}
        </label>
      ))}
    </div>
  )
}

export default function ItemRecordRows({ items, form, errors = {}, today, onChange }) {
  return (
    <ul className="item-record-rows">
      {items.map((item) => {
        const row = rowOf(form, item.itemId)
        const nameId = `record-name-${item.itemId}`
        const resultId = `record-result-label-${item.itemId}`
        return (
          <li key={item.itemId} className={`item-record-row${row.choice !== 'NONE' ? ' item-record-row--selected' : ''}`}>
            <div className="item-record-row__main">
              <span id={nameId} className="item-record-row__name">
                <ItemIcon code={item.code} name={item.name} />
                {item.name}
              </span>
              <RadioGroup
                name={`record-${item.itemId}`}
                labelledBy={nameId}
                choices={RECORD_CHOICES}
                value={row.choice}
                onPick={(choice) => onChange(item.itemId, { choice })}
              />
            </div>
            {row.choice === 'INSPECT' && (
              <div className="item-record-row__result">
                <span id={resultId} className="item-record-row__sub-label">
                  {item.name} 점검 결과 (선택)
                </span>
                <RadioGroup
                  small
                  name={`record-result-${item.itemId}`}
                  labelledBy={resultId}
                  choices={INSPECT_RESULT_CHOICES}
                  value={row.inspectResult}
                  onPick={(inspectResult) => onChange(item.itemId, { inspectResult })}
                />
              </div>
            )}
            {row.choice === 'EXTERNAL' && (
              <div className="item-record-row__external">
                <FormField
                  id={`record-external-date-${item.itemId}`}
                  label={`${item.name} 정비일`}
                  required
                  hint={VISIT_MESSAGES.EXTERNAL_DATE_HINT}
                  error={errors.externalDate?.[item.itemId]}
                >
                  <input
                    type="date"
                    max={today}
                    value={row.externalDate}
                    onChange={(e) => onChange(item.itemId, { externalDate: e.target.value })}
                  />
                </FormField>
                <FormField
                  id={`record-external-mileage-${item.itemId}`}
                  label={`${item.name} 정비 때 주행거리 (선택)`}
                  hint={VISIT_MESSAGES.EXTERNAL_MILEAGE_HINT}
                  error={errors.externalMileage?.[item.itemId]}
                  suffix="km"
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={row.externalMileage}
                    onChange={(e) => onChange(item.itemId, { externalMileage: e.target.value })}
                  />
                </FormField>
              </div>
            )}
            {row.choice !== 'NONE' && (
              <div className="item-record-row__memo">
                <FormField id={`record-memo-${item.itemId}`} label={`${item.name} 메모 (선택)`} error={errors.memo?.[item.itemId]}>
                  <input
                    type="text"
                    maxLength={MEMO_MAX}
                    autoComplete="off"
                    placeholder="확인한 내용·고객에게 안내한 말 (200자 이내)"
                    value={row.memo}
                    onChange={(e) => onChange(item.itemId, { memo: e.target.value })}
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
