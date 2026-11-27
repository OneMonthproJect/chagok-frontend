import './AssigneeLabel.css'

// 담당 정비사 라벨 (04 F-RSV-05 「담당 색」, 09 S-02 "목록 줄·카드에 담당(이름+색)", chagok-frontend#30).
// 색은 서버의 colorIndex(08 15·17·36, 8색 순환) 그대로 쓰고, 색만으로 구분하지 않도록 이름을 항상 함께 보인다.
// 색 8개(💡 04): 보라·청록·분홍·갈색·연두·남색·올리브·자주 — 상태 색(회색·파랑·주황·빨강)과 겹치지 않는다.
// assignee가 없으면(P0-핵심 서버 응답) 아무것도 그리지 않는다.
// 사용: <AssigneeLabel assignee={{ staffId: 1, name: '박사장', colorIndex: 0 }} />

const COLOR_COUNT = 8

export default function AssigneeLabel({ assignee }) {
  if (!assignee) return null
  // 서버가 0~7을 주지만, 범위 밖 값이 와도 라벨이 사라지지 않게 8로 나눈 나머지로 고른다
  const color = ((assignee.colorIndex % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT
  return (
    <span className={`assignee-label assignee-label--c${color}`} title={`담당 ${assignee.name}`}>
      <i className="assignee-label__dot" aria-hidden="true" />
      <span className="visually-hidden">담당 </span>
      {assignee.name}
    </span>
  )
}
