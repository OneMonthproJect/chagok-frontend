import { useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { reservationStatusLabel } from '../status'
import {
  CONFIRM_BACK_LABEL,
  CORRECT_TEXT,
  CORRECT_TEXT_MAX,
  correctRequestBody,
  correctionStatusOptions,
  reservedAtText,
} from '../panelFlow'
import './ReservationPanel.css'

// 지난 예약 정정 대화상자 (09 S-02 「정정 … 확인 대화상자, 사유(선택) 입력」, F-RSV-10, 08 7.1 40, #33).
// 대상은 끝난 예약(완료·취소·노쇼). 상태 선택은 사장에게만 허용표대로 보이고(08 40, R27), 정비사는 메모만 고친다.
// 메모 정정의 담당·기간(예약 날짜 + 3일) 판정은 서버가 하고, 403 문구(FORBIDDEN·EDIT_PERIOD_EXPIRED)를 이 대화상자에 그대로 보인다.
// 보내기: 바뀐 것만 보낸다(없으면 보내지 않고 알림). 성공·409(패널이 다시 읽음)면 닫고, 그 밖의 실패는 열어 둔 채 입력값을 지킨다(POL-121).
// reservation: { status, purpose: { memo }, reservedAt }, target: { plateNumber, customerName }, role: 'OWNER' | 'MECHANIC' | null
export default function CorrectDialog({ reservation, target, role, onSubmit, onClose }) {
  const currentMemo = reservation.purpose.memo
  const options = correctionStatusOptions(reservation.status, role)
  const [input, setInput] = useState({ status: '', memo: currentMemo ?? '', reason: '' })
  const [notice, setNotice] = useState(null) // { error } | { message }
  const [busy, setBusy] = useState(false)

  function change(field, value) {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  async function submit() {
    const body = correctRequestBody(input, currentMemo)
    if (!body) {
      setNotice({ message: CORRECT_TEXT.noChange })
      return
    }
    setNotice(null)
    setBusy(true)
    const result = await onSubmit(body)
    setBusy(false)
    if (result.kind === 'failed') setNotice({ error: result.error })
    else onClose()
  }

  function close() {
    if (!busy) onClose()
  }

  return (
    <Modal
      open
      title={CORRECT_TEXT.title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" data-autofocus disabled={busy} onClick={close}>
            {CONFIRM_BACK_LABEL}
          </Button>
          <Button pendingText="처리 중…" onClick={submit}>
            {CORRECT_TEXT.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="rsv-confirm__target">
        <strong>
          {target.plateNumber} · {target.customerName}
        </strong>
        <span>
          {reservedAtText(reservation.reservedAt)} · {reservationStatusLabel(reservation.status)}
        </span>
      </p>
      <p className="rsv-confirm__desc">{CORRECT_TEXT.description}</p>
      {notice?.error && <ErrorNotice error={notice.error} />}
      {notice?.message && <ErrorNotice tone="warn" title={notice.message} />}
      <div className="rsv-dialog__fields">
        {options.length > 0 ? (
          <FormField id="correct-status" label="상태">
            <select value={input.status} onChange={(e) => change('status', e.target.value)}>
              <option value="">
                {CORRECT_TEXT.keepStatus} ({reservationStatusLabel(reservation.status)})
              </option>
              {options.map((status) => (
                <option key={status} value={status}>
                  {reservationStatusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          role !== 'OWNER' && <p className="rsv-dialog__hint">{CORRECT_TEXT.ownerOnly}</p>
        )}
        <FormField id="correct-memo" label="메모" hint={`${input.memo.length}/${CORRECT_TEXT_MAX}자`}>
          <textarea rows={3} maxLength={CORRECT_TEXT_MAX} value={input.memo} onChange={(e) => change('memo', e.target.value)} />
        </FormField>
        <FormField id="correct-reason" label="사유 (선택)" hint={`${input.reason.length}/${CORRECT_TEXT_MAX}자`}>
          <input maxLength={CORRECT_TEXT_MAX} autoComplete="off" value={input.reason} onChange={(e) => change('reason', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}
