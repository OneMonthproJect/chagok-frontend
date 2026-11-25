// 점검 주기 상태 표시는 이 컴포넌트 한 곳에서만 (09 0장, 05 POL-01).
// 서버가 준 status(08 0.4)를 그대로 보여 준다. 프론트에서 날짜로 다시 계산하지 않는다 (CONVENTIONS 7장).
// 모양: 점 + 글자 + 토큰 색 (디자인 v3.0). 글자를 항상 함께 보인다 — 색만으로 구분하지 않음.
// 사용: <StatusBadge status={item.status} />

const LABELS = {
  UNKNOWN: '미확인',
  AHEAD: '여유',
  SOON: '임박',
  DUE: '도래',
}

export default function StatusBadge({ status }) {
  const label = LABELS[status]
  if (!label) return null // 08 0.4에 없는 값은 보이지 않는다 (지어낸 문구를 만들지 않음)
  return (
    <span className={`status-badge status-badge--${status}`}>
      <i className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
