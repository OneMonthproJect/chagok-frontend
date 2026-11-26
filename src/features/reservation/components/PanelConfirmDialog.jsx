import { useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { CONFIRM_BACK_LABEL, CONFIRM_TEXT, reservedAtText } from '../panelFlow'
import './ReservationPanel.css'

// 예약 패널 행동의 확인 대화상자 (09 S-02 「취소·노쇼…는 확인 대화상자를 거친다」, 디자인 v3.0 Home-Confirm-Cancel·NoShow).
// 제목 · 대상(차량번호 · 고객 / 일시) · 설명 · [돌아가기] [예약 취소|노쇼 처리]. 처음 초점은 [돌아가기](실수로 Enter를 눌러도 처리되지 않게).
// 확인을 누르면 onConfirm(Promise)이 끝날 때까지 버튼이 잠기고(POL-120), 그동안은 닫지 않는다. 결과 안내는 패널이 보인다.
// 공용 ConfirmDialog(COMPONENT_SPEC, shared/ui)가 생기면 그것으로 옮긴다 — 지금은 패널에서만 쓰여 여기 둔다(#31).
// action: 'cancel' | 'noShow', target: { plateNumber, customerName, reservedAt }
export default function PanelConfirmDialog({ action, target, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const text = CONFIRM_TEXT[action]

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      onClose()
    }
  }

  function close() {
    if (!busy) onClose()
  }

  return (
    <Modal
      open
      title={text.title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" data-autofocus disabled={busy} onClick={close}>
            {CONFIRM_BACK_LABEL}
          </Button>
          <Button variant="danger" pendingText="처리 중…" onClick={confirm}>
            {text.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="rsv-confirm__target">
        <strong>
          {target.plateNumber} · {target.customerName}
        </strong>
        <span>{reservedAtText(target.reservedAt)}</span>
      </p>
      <p className="rsv-confirm__desc">{text.description}</p>
    </Modal>
  )
}
