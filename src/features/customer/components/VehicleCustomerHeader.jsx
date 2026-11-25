import { Link } from 'react-router-dom'
import { MILEAGE_MISSING, MODEL_YEAR_MISSING, mileageText, modelYearText } from '../detailFlow'
import './customerDetail.css'

// S-07 차량·고객 머리: 차량번호 · 차종·연식 · 최근 주행거리 · 고객명(→ S-06) · 연락처(전체) (09 S-07, 08 09, 디자인 v3.0 S-07).
// 연락처는 서버가 준 전체 번호 그대로 보인다(상세 화면은 마스킹하지 않음, 09 0장, D-40).
// 연식·최근 주행거리는 비어 있을 수 있다(08 09, 07 3.5) — S-06 차량 카드와 같은 문구로 흐리게 보인다.
// customerLink({ to, state }): 고객명을 눌러 갈 곳(S-06). pages가 정한다(features는 app 경로를 모름). 없으면 글자만.
// 수정(P0-나머지 #32)·비활성화(P1)·약식 도면(P1)은 그 이슈가 더한다 — 지금은 버튼을 두지 않는다(09 0장).

export default function VehicleCustomerHeader({ vehicle, customerLink }) {
  const { plateNumber, model, modelYear, latestMileage, customer } = vehicle
  const year = modelYearText(modelYear)
  const mileage = mileageText(latestMileage)
  return (
    <section className="vehicle-header" aria-label="차량·고객 정보">
      <h2 className="vehicle-header__plate">{plateNumber}</h2>
      <p className="vehicle-header__spec">
        {model} · {year ?? <span className="vehicle-card__missing">{MODEL_YEAR_MISSING}</span>} · 최근 주행거리{' '}
        {mileage ?? <span className="vehicle-card__missing">{MILEAGE_MISSING}</span>}
      </p>
      <p className="vehicle-header__customer">
        {customerLink ? (
          <Link className="vehicle-header__customer-link" to={customerLink.to} state={customerLink.state}>
            {customer.name} 고객
          </Link>
        ) : (
          <span className="vehicle-header__customer-name">{customer.name} 고객</span>
        )}
        <span className="vehicle-header__phone">{customer.phone}</span>
      </p>
    </section>
  )
}
