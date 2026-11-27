import { useEffect, useRef, useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { CONFIRM_BACK_LABEL, START_TEXT, reservedAtText, startRequestBody, validateStartInput } from '../panelFlow'
import './ReservationPanel.css'

// 방문 접수 입력 대화상자 (09 S-02 「방문 접수에서 차량의 연식·최근 주행거리가 비어 있으면 입력 칸이 열린다」, D-58, 08 39, #33).
// 차량에 비어 있는 칸만 연다(missing). 둘 다 있으면 이 대화상자 없이 패널에서 바로 보낸다(ReservationPanel).
// 보내기: onSubmit(body)가 Promise<PanelChangeResult>를 돌려준다. 성공·409(패널이 다시 읽음)·stale이면 닫고,
// 그 밖의 실패(400·403·500·네트워크)는 열어 둔 채 입력값을 지키고 오류를 보인다(05 POL-121·125). 400의 fieldErrors는 칸 아래.
// target: { plateNumber, customerName, reservedAt }, missing: { modelYear, mileage }
export default function StartVisitDialog({ target, missing, onSubmit, onClose }) {
  const [input, setInput] = useState({ modelYear: '', mileage: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  function change(field, value) {
    setInput((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function submit() {
    const found = validateStartInput(input, missing)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setServerError(null)
    setBusy(true)
    const result = await onSubmit(startRequestBody(input, missing))
    // 요청 중에 다른 예약으로 바뀌어 이 대화상자가 언마운트됐으면, 늦게 온 결과가 지금 열린 접수 대화상자를 닫지 않게 한다
    if (!aliveRef.current) return
    setBusy(false)
    if (result.kind !== 'failed') {
      onClose()
      return
    }
    setServerError(result.error)
    const fieldErrors = {}
    for (const { field, reason } of result.error.fieldErrors ?? []) {
      if (field === 'modelYear' || field === 'mileage') fieldErrors[field] = reason
    }
    setErrors(fieldErrors)
  }

  function close() {
    if (!busy) onClose()
  }

  return (
    <Modal
      open
      title={START_TEXT.title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={close}>
            {CONFIRM_BACK_LABEL}
          </Button>
          <Button pendingText="처리 중…" onClick={submit}>
            {START_TEXT.confirmLabel}
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
      <p className="rsv-confirm__desc">{START_TEXT.description}</p>
      {serverError && <ErrorNotice error={serverError} />}
      <div className="rsv-dialog__fields">
        {missing.modelYear && (
          <FormField id="start-model-year" label="연식" required suffix="년식" error={errors.modelYear}>
            <input inputMode="numeric" autoComplete="off" value={input.modelYear} onChange={(e) => change('modelYear', e.target.value)} />
          </FormField>
        )}
        {missing.mileage && (
          <FormField id="start-mileage" label="주행거리" required suffix="km" error={errors.mileage}>
            <input inputMode="numeric" autoComplete="off" value={input.mileage} onChange={(e) => change('mileage', e.target.value)} />
          </FormField>
        )}
      </div>
    </Modal>
  )
}
