import './LicensePlate.css'

// 차량번호판 표시 (UI·UX 통합 개선 2절, chagok-frontend#110). 번호는 서버 값 그대로 보이고 바꾸거나 자르지 않는다.
// 흰 바탕 · 진한 글자 · 실버 쿨그레이 1px 테두리 · 모서리 4px. 그림자·그라데이션·장식 없음. 줄바꿈하지 않는다.
// compact: 좁은 캘린더 카드·표·목록 줄. as: 감쌀 태그(제목 h2·h3 안에 쓸 때는 바깥 태그를 그대로 두고 이 컴포넌트를 넣는다).
// 누르는 동작은 감싸는 쪽(링크·버튼·줄)이 맡는다. 이 컴포넌트는 커서·Hover를 바꾸지 않는다(누를 수 없는 곳에서 누를 것처럼 보이지 않게).
// 사용: <LicensePlate number="12가3456" /> · <LicensePlate number={r.plateNumber} compact />
export default function LicensePlate({ number, compact = false, as: Tag = 'span', className }) {
  const classes = ['license-plate']
  if (compact) classes.push('license-plate--compact')
  if (className) classes.push(className)
  return <Tag className={classes.join(' ')}>{number}</Tag>
}
