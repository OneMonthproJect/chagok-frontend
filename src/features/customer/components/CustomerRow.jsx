import { Link, useNavigate } from 'react-router-dom'
import LicensePlate from '@/shared/ui/LicensePlate.jsx'
import './customer.css'

// S-05 결과 줄 하나: 고객명 · 연락처 · 동의 · 차량번호들 (09 S-05, 08 05 items[]).
// 연락처는 서버가 준 값 그대로(P0-나머지부터 서버가 마스킹, 화면이 다시 가리거나 풀지 않음 — 09 0장).
// 줄을 누르면 S-06 (09 S-05, #20). 주소는 pages가 link({ to, state })로 넘긴다(features는 app 경로를 모름).
//   키보드·화면 읽기 프로그램은 고객명 링크로, 마우스는 줄 어디를 눌러도 같은 곳으로 간다.
//   link가 없으면 누를 수 있는 표시를 두지 않는다. 차량번호 칩 → S-07 이동(디자인 + 제안)은 S-07 이슈 범위라 만들지 않는다.

export default function CustomerRow({ customer, link }) {
  const navigate = useNavigate()
  const { name, phone, consent, vehicles } = customer

  function handleRowClick(event) {
    if (!link || event.target.closest('a')) return // 링크를 직접 누르면 링크가 이동한다(두 번 이동 방지)
    navigate(link.to, { state: link.state })
  }

  return (
    <tr className={`customer-row${link ? ' customer-row--link' : ''}`} onClick={link ? handleRowClick : undefined}>
      <th scope="row" className="customer-row__name">
        <span className="customer-row__avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        {link ? (
          <Link className="customer-row__link" to={link.to} state={link.state}>
            <span className="customer-row__name-text">{name}</span>
          </Link>
        ) : (
          <span className="customer-row__name-text">{name}</span>
        )}
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
              <LicensePlate key={vehicle.vehicleId} number={vehicle.plateNumber} compact />
            ))}
            {vehicles.length > 1 && <span className="customer-row__count">{vehicles.length}대</span>}
          </span>
        )}
      </td>
    </tr>
  )
}
