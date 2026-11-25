import './EmptyState.css'

// 빈 상태: 문구 + (있으면) 이어지는 버튼 하나. 문구는 09 5장 표 그대로 화면이 넘긴다(여기서 문구를 만들지 않음).
// action이 없으면 버튼을 그리지 않는다 — 연결 안 된 버튼을 두지 않는다(09 0장 빈 화면 금지).
// illustration: 마스코트 등 그림 자리(쓰는 화면이 크기를 줄인 이미지를 넘김). 업무 정보 영역 안에는 넣지 않는다(COMPONENT_SPEC 3장).
// 사용: <EmptyState title="등록된 차량이 없습니다." action={{ label: '차량 추가', onClick: openAdd }} />

export default function EmptyState({ title, description, illustration, action, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      {illustration && (
        <div className="empty-state__illustration" aria-hidden="true">
          {illustration}
        </div>
      )}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action && (
        <button type="button" className="empty-state__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
