import './customer.css'

// S-05 결과 줄 하나: 고객명 · 연락처 · 동의 · 차량번호들 (09 S-05, 08 05 items[]).
// 연락처는 서버가 준 값 그대로(P0-나머지부터 서버가 마스킹, 화면이 다시 가리거나 풀지 않음 — 09 0장).
// 줄을 눌러 S-06으로 가는 이동은 S-06 이슈(#20)가 연결한다. 그 전에는 누를 수 있는 표시를 두지 않는다.

export default function CustomerRow({ customer }) {
  const { name, phone, consent, vehicles } = customer
  return (
    <tr className="customer-row">
      <th scope="row" className="customer-row__name">
        <span className="customer-row__avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <span>{name}</span>
      </th>
      <td className="customer-row__phone">{phone}</td>
      <td>
        <span className={`customer-consent${consent ? ' customer-consent--yes' : ''}`}>{consent ? '동의' : '미동의'}</span>
      </td>
      <td>
        {vehicles.length === 0 ? (
          <span className="customer-row__none">—</span>
        ) : (
          <span className="customer-row__plates">
            {vehicles.map((vehicle) => (
              <span key={vehicle.vehicleId} className="customer-plate">
                {vehicle.plateNumber}
              </span>
            ))}
            {vehicles.length > 1 && <span className="customer-row__count">{vehicles.length}대</span>}
          </span>
        )}
      </td>
    </tr>
  )
}
