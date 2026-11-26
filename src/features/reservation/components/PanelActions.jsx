import Button from '@/shared/ui/Button.jsx'
import { canCancel, canComplete, canEdit, canNoShow } from '../panelFlow'

// 예약 상세 패널의 상태별 버튼 (09 S-02 5번, COMPONENT_SPEC 「PanelActions」 — 상태별 버튼 분기는 여기 한 곳).
// P0-핵심: [방문 완료] — 상태 "예약"·"진행중"일 때(08 18, #26). [변경] — 상태 "예약"만(08 19, M-02 변경 모드, #25).
// P0-나머지(#31): [취소] — 상태 "예약"·"진행중"(08 20). [노쇼] — 상태 "예약"이고 시각이 지난 예약만(08 21, needsAction).
//   둘 다 확인 대화상자를 연다(onConfirm('cancel'|'noShow')). 요청은 대화상자에서 확인한 뒤에만 보낸다.
// [변경]·[취소]·[노쇼]는 쓰는 화면이 해당 콜백을 넘길 때만 그린다(연결 안 된 버튼 금지). 끝난 예약은 버튼이 없다.
// 다음 이슈가 이 파일에 더한다: 방문 접수·정정·이력 보기(P0-나머지 #33).
// onComplete가 Promise를 돌려주면 끝날 때까지 버튼이 잠긴다(두 번 눌러도 요청 한 번, POL-120).
export default function PanelActions({ status, needsAction = false, disabled = false, onComplete, onEdit, onConfirm }) {
  const showComplete = canComplete(status)
  const showEdit = canEdit(status) && Boolean(onEdit)
  const showCancel = canCancel(status) && Boolean(onConfirm)
  const showNoShow = canNoShow(status, needsAction) && Boolean(onConfirm)
  if (!showComplete && !showEdit && !showCancel && !showNoShow) return null
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
      {(showCancel || showNoShow) && (
        <div className="rsv-panel__actions-row">
          {showCancel && (
            <Button variant="ghost" disabled={disabled} onClick={() => onConfirm('cancel')}>
              취소
            </Button>
          )}
          {showNoShow && (
            <Button variant="danger" disabled={disabled} onClick={() => onConfirm('noShow')}>
              노쇼
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
