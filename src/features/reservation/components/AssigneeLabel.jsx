import './AssigneeLabel.css'

// 담당 정비사 라벨 (04 F-RSV-05 「담당 색」, 09 S-02 "목록 줄·카드에 담당(이름+색)", chagok-frontend#30).
// 색은 서버의 colorIndex(08 15·17·36, 계정 id 순서 8색 순환) 그대로 쓰고, 색만으로 구분하지 않도록 이름을 항상 함께 보인다.
// UI·UX 통합 개선 8절(#110): 파스텔 6색(블루·민트·라벤더·피치·옐로우·그레이블루, theme.css --ck-assignee-N-bg/fg).
//   colorIndex를 6으로 나눈 나머지로 고른다 — 같은 정비사는 어느 화면에서나 같은 색. 7번째 직원부터는 색이 다시 쓰이지만 이름으로 구분한다.
//   상태 색(완료 초록·임박 주황·취소 빨강·선택 파랑)과 겹치지 않도록 이름 박스에만 칠하고 예약 칸 전체를 칠하지 않는다.
// assignee가 없으면(P0-핵심 서버 응답) 아무것도 그리지 않는다.
// 사용: <AssigneeLabel assignee={{ staffId: 1, name: '박사장', colorIndex: 0 }} />
// 색 클래스 assigneeColorClass(assignee)는 다른 담당 표시(주 캘린더 카드 색 띠, #36)도 쓴다 — 색 규칙은 이 파일·AssigneeLabel.css 한 곳.

const COLOR_COUNT = 6

/** 담당 색 클래스 "assignee-color--c0"~"c5" (--assignee-bg·--assignee-fg·--assignee-color를 정한다). assignee가 없으면 null.
 *  서버는 0~7을 주고, 범위 밖 값이 와도 색이 사라지지 않게 6으로 나눈 나머지로 고른다 */
export function assigneeColorClass(assignee) {
  if (!assignee) return null
  const color = ((assignee.colorIndex % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT
  return `assignee-color--c${color}`
}

export default function AssigneeLabel({ assignee }) {
  if (!assignee) return null
  return (
    <span className={`assignee-label ${assigneeColorClass(assignee)}`} title={`담당 ${assignee.name}`}>
      <i className="assignee-label__dot" aria-hidden="true" />
      <span className="visually-hidden">담당 </span>
      {assignee.name}
    </span>
  )
}
