// 점검 주기 상태 표시는 이 컴포넌트 한 곳에서만 (09 0장, 05 POL-01).
// 서버가 준 status(08 0.4)를 그대로 보여 준다. 프론트에서 날짜로 다시 계산하지 않는다 (CONVENTIONS 7장).
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
  return <span className={`status-badge status-badge--${status}`}>{label}</span>
}
