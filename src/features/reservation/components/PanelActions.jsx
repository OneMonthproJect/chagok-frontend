import Button from '@/shared/ui/Button.jsx'
import { canCancel, canComplete, canCorrect, canEdit, canNoShow, canStart } from '../panelFlow'

// 예약 상세 패널의 상태별 버튼 (09 S-02 5번, COMPONENT_SPEC 「PanelActions」 — 상태별 버튼 분기는 여기 한 곳).
// P0-핵심: [방문 완료] — 상태 "예약"·"진행중"일 때(08 18, #26). [변경] — 상태 "예약"만(08 19, M-02 변경 모드, #25).
// P0-나머지(#31): [취소] — 상태 "예약"·"진행중"(08 20). [노쇼] — 상태 "예약"이고 시각이 지난 예약만(08 21, needsAction).
//   둘 다 확인 대화상자를 연다(onConfirm('cancel'|'noShow')). 요청은 대화상자에서 확인한 뒤에만 보낸다.
// P0-나머지(#33): [방문 접수] — 상태 "예약"만(08 39). [정정] — 끝난 예약(완료·취소·노쇼, 08 40). [이력 보기] — 모든 상태(08 41).
// 버튼은 쓰는 화면이 해당 콜백을 넘길 때만 그린다(연결 안 된 버튼 금지).
// onComplete·onStart가 Promise를 돌려주면 끝날 때까지 버튼이 잠긴다(두 번 눌러도 요청 한 번, POL-120).
export default function PanelActions({
  status,
  needsAction = false,
  disabled = false,
  onComplete,
  onEdit,
  onConfirm,
  onStart,
  onCorrect,
  onHistory,
}) {
  const showComplete = canComplete(status)
  const showStart = canStart(status) && Boolean(onStart)
  const showEdit = canEdit(status) && Boolean(onEdit)
  const showCancel = canCancel(status) && Boolean(onConfirm)
  const showNoShow = canNoShow(status, needsAction) && Boolean(onConfirm)
  const showCorrect = canCorrect(status) && Boolean(onCorrect)
  const showHistory = Boolean(onHistory)
  if (!showComplete && !showStart && !showEdit && !showCancel && !showNoShow && !showCorrect && !showHistory) return null
  return (
    <div className="rsv-panel__actions">
      {showComplete && (
        <Button size="lg" pendingText="처리 중…" disabled={disabled} onClick={onComplete}>
          방문 완료
        </Button>
      )}
      {showStart && (
        <Button variant="secondary" pendingText="처리 중…" disabled={disabled} onClick={onStart}>
          방문 접수
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
      {(showCorrect || showHistory) && (
        <div className="rsv-panel__actions-row">
          {showCorrect && (
            <Button variant="secondary" disabled={disabled} onClick={onCorrect}>
              정정
            </Button>
          )}
          {showHistory && (
            <Button variant="ghost" disabled={disabled} onClick={onHistory}>
              이력 보기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
