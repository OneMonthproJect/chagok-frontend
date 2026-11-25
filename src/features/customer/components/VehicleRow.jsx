import { Link } from 'react-router-dom'
import StatusBadge from '@/shared/ui/StatusBadge.jsx'
import { MILEAGE_MISSING, MODEL_YEAR_MISSING, mileageText, modelYearText } from '../detailFlow'
import './customerDetail.css'

// S-06 차량 한 대: 차량번호 · 차종·연식 · 최근 주행거리 · 도래 n · 임박 n (09 S-06, 08 07 vehicles[]).
// 도래·임박 수는 서버 dueCount·soonCount 그대로(프론트에서 날짜로 다시 계산하지 않음, CONVENTIONS 7장).
//   1 이상이면 상태 색은 StatusBadge 한 곳에서만(09 0장) + 숫자, 0이면 상태 색 없이 흐린 글자(디자인 v3.0 count-badge zero).
// link({ to, state }): 카드를 눌러 갈 곳(S-07, #22). 주소는 pages가 넘긴다(features는 app 경로를 모름).
//   link가 없으면 누를 수 있는 표시를 두지 않는다.

function CountTag({ status, label, count }) {
  if (count > 0) {
    return (
      <span className="vehicle-count">
        <StatusBadge status={status} />
        <strong className="vehicle-count__number">{count}</strong>
      </span>
    )
  }
  return (
    <span className="vehicle-count vehicle-count--zero">
      {label} <strong className="vehicle-count__number">0</strong>
    </span>
  )
}

export default function VehicleRow({ vehicle, link }) {
  const card = <VehicleCard vehicle={vehicle} />
  if (!link) return card
  return (
    <Link className="vehicle-card-link" to={link.to} state={link.state}>
      {card}
    </Link>
  )
}

function VehicleCard({ vehicle }) {
  const { plateNumber, model, modelYear, latestMileage, dueCount, soonCount } = vehicle
  const year = modelYearText(modelYear)
  const mileage = mileageText(latestMileage)
  return (
    <article className="vehicle-card" aria-label={`${plateNumber} 차량`}>
      <h3 className="vehicle-card__plate">{plateNumber}</h3>
      <p className="vehicle-card__model">
        {model} · {year ?? <span className="vehicle-card__missing">{MODEL_YEAR_MISSING}</span>}
      </p>
      <div className="vehicle-card__bottom">
        <div>
          <span className="vehicle-card__label">최근 주행거리</span>
          <strong className="vehicle-card__mileage">
            {mileage ?? <span className="vehicle-card__missing">{MILEAGE_MISSING}</span>}
          </strong>
        </div>
        <div className="vehicle-card__counts">
          <CountTag status="DUE" label="도래" count={dueCount} />
          <CountTag status="SOON" label="임박" count={soonCount} />
        </div>
      </div>
    </article>
  )
}
