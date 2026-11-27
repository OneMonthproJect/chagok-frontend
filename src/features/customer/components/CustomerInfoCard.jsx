import { consentText } from '../detailFlow'
import './customer.css'
import './customerDetail.css'

// S-06 고객 정보 카드: 고객명 · 연락처(전체, D-40) · 안내 수신 동의 (09 S-06, 08 07, 디자인 v3.0 Customer-Detail).
// 연락처는 서버가 준 전체 번호 그대로 보인다(상세 화면은 마스킹하지 않음, 09 0장).
// [수정](#32)은 화면(S-06)이 카드 옆에 두고 CustomerEditForm을 연다. 비활성화/삭제·지표(P1)는 그 이슈가 더한다(09 0장 빈 화면 금지).

export default function CustomerInfoCard({ customer }) {
  const { name, phone, consent } = customer
  return (
    <section className="customer-info" aria-label="고객 정보">
      <span className="customer-info__avatar" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <div className="customer-info__text">
        <div className="customer-info__title">
          <h2 className="customer-info__name">{name}</h2>
          <span className={`customer-consent${consent ? ' customer-consent--yes' : ''}`}>{consentText(consent)}</span>
        </div>
        <p className="customer-info__phone">{phone}</p>
      </div>
    </section>
  )
}
