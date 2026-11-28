import StatusBadge from '@/shared/ui/StatusBadge.jsx'
import ItemIcon from '@/shared/ui/ItemIcon.jsx'
import './ItemStatusList.css'

// 정비 항목별 점검 주기 상태 목록. variant로 모양만 바꾼다:
//   summary(예약 패널) · target(재점검 대상 펼침) · table(차량 상세) · preview(방문 기록 미리보기)
// 규칙 (09 0장, 08 17, CONVENTIONS 7장):
//   - 상태는 서버 값 그대로 StatusBadge로만 보인다. 프론트에서 다시 계산하지 않는다.
//   - 순서는 받은 순서 그대로(서버의 sortOrder 순). highlighted 항목도 자리를 옮기지 않고 굵게만 보인다(D-63 B02).
//   - API 타입을 모른다. 08 응답을 아래 모양으로 펼치는 일(날짜 형식 등)은 쓰는 화면이 한다.
// items: [{ id, name, code?(08 0.4 항목 code, 아이콘용 — 없으면 이름으로 고름), status, highlighted?, tag?(이름 옆 작은 꼬리표), details?: [{ label, value }] }]
//   table은 첫 항목의 details label로 열 머리를 만든다 — 모든 항목의 details는 같은 label·같은 순서로 넘긴다.
// loading: 이전 결과를 흐리게 둔 채 새 결과를 기다린다(자리 이동 없음).
// 사용: <ItemStatusList variant="summary" items={panel.itemStatuses.map(toRow)} />

const VARIANTS = ['summary', 'target', 'table', 'preview']
const EMPTY_VALUE = '—'

function display(value) {
  return value === null || value === undefined || value === '' ? EMPTY_VALUE : value
}

function ItemName({ item }) {
  return (
    <span className="item-status-list__name">
      <ItemIcon code={item.code} name={item.name} />
      {item.name}
      {item.tag && <span className="item-status-list__tag">{item.tag}</span>}
    </span>
  )
}

function itemClass(base, item) {
  return `${base}${item.highlighted ? ' is-highlighted' : ''}`
}

export default function ItemStatusList({ variant = 'summary', items = [], loading = false, nameLabel = '항목', statusLabel = '상태' }) {
  const shape = VARIANTS.includes(variant) ? variant : 'summary'
  const className = `item-status-list item-status-list--${shape}${loading ? ' is-loading' : ''}`

  if (shape === 'table') {
    const columns = (items[0]?.details ?? []).map((detail) => detail.label)
    return (
      <div className={className} aria-busy={loading}>
        <table className="item-status-list__table">
          <thead>
            <tr>
              <th scope="col">{nameLabel}</th>
              <th scope="col">{statusLabel}</th>
              {columns.map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={itemClass('item-status-list__row', item)}>
                <th scope="row">
                  <ItemName item={item} />
                </th>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                {columns.map((label, index) => (
                  <td key={label}>{display(item.details?.[index]?.value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={className} aria-busy={loading}>
      <ul className="item-status-list__items">
        {items.map((item) => (
          <li key={item.id} className={itemClass('item-status-list__row', item)}>
            {shape === 'preview' ? (
              <>
                <div className="item-status-list__head">
                  <ItemName item={item} />
                  <StatusBadge status={item.status} />
                </div>
                {item.details?.map((detail) => (
                  <p className="item-status-list__detail" key={detail.label}>
                    <span className="item-status-list__label">{detail.label}</span> {display(detail.value)}
                  </p>
                ))}
              </>
            ) : (
              <>
                <ItemName item={item} />
                <StatusBadge status={item.status} />
                {shape === 'target' &&
                  item.details?.map((detail) => (
                    <span className="item-status-list__detail" key={detail.label}>
                      <span className="item-status-list__label">{detail.label}</span> {display(detail.value)}
                    </span>
                  ))}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
