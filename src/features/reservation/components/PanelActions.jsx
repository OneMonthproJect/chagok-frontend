import Button from '@/shared/ui/Button.jsx'
import { canComplete, canEdit } from '../panelFlow'

// 예약 상세 패널의 상태별 버튼 (09 S-02 5번, COMPONENT_SPEC 「PanelActions」 — 상태별 버튼 분기는 여기 한 곳).
// P0-핵심: [방문 완료] — 상태 "예약"·"진행중"일 때(08 18, #26). [변경] — 상태 "예약"만(08 19, M-02 변경 모드, #25).
//   [변경]은 쓰는 화면이 onEdit을 넘길 때만 그린다(연결 안 된 버튼 금지). 그 밖의 상태는 버튼이 없다.
// 다음 이슈가 이 파일에 더한다: 방문 접수·취소·노쇼·정정·이력 보기(P0-나머지 #31·#33).
// onComplete가 Promise를 돌려주면 끝날 때까지 버튼이 잠긴다(두 번 눌러도 요청 한 번, POL-120).
export default function PanelActions({ status, disabled = false, onComplete, onEdit }) {
  const showComplete = canComplete(status)
  const showEdit = canEdit(status) && Boolean(onEdit)
  if (!showComplete && !showEdit) return null
  return (
    <div className="rsv-panel__actions">
      {showComplete && (
        <Button size="lg" pendingText="처리 중…" disabled={disabled} onClick={onComplete}>
          방문 완료
        </Button>
      )}
      {showEdit && (
        <Button variant="secondary" disabled={disabled} onClick={onEdit}>
          변경
        </Button>
      )}
    </div>
  )
}
