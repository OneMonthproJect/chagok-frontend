import { useId, useRef, useState } from 'react'
import Modal from '@/shared/ui/Modal.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { createReservation, getReservationPanel, updateReservation } from '../api'
import {
  ASSIGNEE_MESSAGES, canReassign, closedMessage, defaultCreateAssignee, needsReassignReason, reassignWindow,
} from '../assigneeRules'
import { formatDayLabel, nowSeoul, todaySeoul } from '../dates'
import {
  createRequest, emptyForm, fieldOf, formFromReservation, updateRequest, validateForm,
} from '../reservationForm'
import { useAssignees } from '../useAssignees'
import AssigneeField from './AssigneeField.jsx'
import PurposeFields from './PurposeFields.jsx'
import TimeSlotPicker from './TimeSlotPicker.jsx'
import './ReservationFormModal.css'

// M-02 예약 등록·변경 (09 M-02, F-RSV-01·06, 08 16·19, 디자인 v3.0 Modal-Create·Modal-Edit, chagok-frontend#25).
// - 차량 → 날짜(오늘 이후) → 시각(30분 단위) → 담당 정비사(필수, 08 36) → 예약 목적(선택).
// - 담당 정비사(P0-나머지, D-51·D-53, #37): 등록은 기본값이 로그인 계정이고 assigneeId를 항상 보낸다(R19).
//   변경은 변경 전 예약 날짜(서울)로 재배정 가능 구간에서만 칸을 열고, 당일 사장이 바꾸면 사유 필수(assigneeRules). 최종 판정은 서버.
//   409 MECHANIC_SLOT_CONFLICT → 안내 + 겹친 예약 보기(onOpenExisting), 409 ASSIGNEE_CHANGE_CLOSED → 칸을 잠그고 원래 담당으로 되돌림.
// - 차량 고르기·항목 목록·로그인 계정은 화면(pages)이 넘긴다(feature끼리 import 금지): vehiclePicker({ value, onChange }), items, login({ staffId, role }).
// - 변경 모드: 차량은 바꿀 수 없다. 읽어 온 version과 바뀐 칸만 보낸다(19). 바뀐 게 없으면 저장 버튼 비활성(R14).
// - 409 RESERVATION_ACTIVE_EXISTS → 안내 + 기존 예약 보기(onOpenExisting), 409 CONCURRENT_MODIFICATION → 최신 예약을 다시 불러와 채움.
// - 저장 중 버튼 잠금·두 번 눌러도 한 번(POL-120). 실패해도 입력값 유지, 자동 재전송 없음(POL-125).
// 사용 (등록): <ReservationFormModal mode="create" initialDate="2026-11-26" items={items} login={login} vehiclePicker={render} onSaved={…} onClose={…} onOpenExisting={(id) => …} />
//      (변경): <ReservationFormModal mode="edit" target={{ reservationId, version, reservedAt, purpose, vehicle, assignee }} items={items} login={login} onSaved={…} onClose={…} onOpenExisting={(id) => …} />

/** 입력 칸 이름 → 지울 오류 칸 */
const ERROR_KEY = { itemIds: 'purpose', other: 'purpose', assigneeId: 'assignee' }

export default function ReservationFormModal({
  mode = 'create',
  target = null,
  initialDate,
  initialVehicle = null,
  items = [],
  login = null,
  vehiclePicker,
  onSaved,
  onClose,
  onOpenExisting,
}) {
  const idPrefix = useId()
  const formId = `${idPrefix}-form`
  const today = todaySeoul()
  const nowTime = nowSeoul().slice(11, 16)

  const [editTarget, setEditTarget] = useState(target)
  const [values, setValues] = useState(() =>
    mode === 'edit' && target ? formFromReservation(target) : emptyForm(initialDate && initialDate >= today ? initialDate : today, initialVehicle),
  )
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  /** 서버가 409 ASSIGNEE_CHANGE_CLOSED로 막았으면 그 문구. 이 뒤로는 담당 칸을 잠근다 */
  const [closedByServer, setClosedByServer] = useState(null)
  const lockRef = useRef(false)
  const assignees = useAssignees()

  const isEdit = mode === 'edit'
  const candidates = assignees.status === 'ready' ? assignees.data : []
  const originalAssigneeId = editTarget?.assignee?.staffId ?? null
  // 등록: 고르기 전에는 로그인 계정(후보에 있을 때)을 기본값으로 본다. 로그인·후보가 늦게 와도 따라 채워진다
  const assigneeId = values.assigneeId ?? (isEdit ? null : defaultCreateAssignee(candidates.map((c) => c.staffId), login?.staffId ?? null))
  const current = { ...values, assigneeId }
  const reassign = isEdit && editTarget ? reassignWindow(editTarget.reservedAt.slice(0, 10), today, login?.role ?? null) : 'open'
  const assigneeLocked = isEdit && (closedByServer != null || !canReassign(reassign))
  const reasonRequired = isEdit && !assigneeLocked && needsReassignReason(reassign, originalAssigneeId, assigneeId)
  const changes = isEdit && editTarget ? updateRequest(editTarget, current, { reasonRequired }) : null

  function update(patch) {
    setValues((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(patch)) delete next[ERROR_KEY[key] ?? key]
      return next
    })
  }

  async function submit(event) {
    event?.preventDefault()
    if (lockRef.current) return
    const found = validateForm(current, today, nowTime, mode, { reasonRequired })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (isEdit && !changes) return

    lockRef.current = true
    setSubmitting(true)
    setNotice(null)
    try {
      const saved = isEdit
        ? await updateReservation(editTarget.reservationId, changes)
        : await createReservation(createRequest(current))
      onSaved?.(saved)
    } catch (error) {
      await handleError(error)
    } finally {
      lockRef.current = false
      setSubmitting(false)
    }
  }

  async function handleError(error) {
    const code = error?.code
    if (code === 'RESERVATION_ACTIVE_EXISTS') {
      setNotice({ kind: 'existing', reservationId: error.details?.reservationId ?? null, message: '이 차량에는 유효한 예약이 있습니다. 기존 예약을 확인한 뒤 변경해 주세요.', linkLabel: '기존 예약 보기' })
      return
    }
    if (code === 'MECHANIC_SLOT_CONFLICT') {
      setNotice({ kind: 'existing', reservationId: error.details?.reservationId ?? null, message: ASSIGNEE_MESSAGES.SLOT_CONFLICT, linkLabel: ASSIGNEE_MESSAGES.SLOT_CONFLICT_LINK })
      return
    }
    if (code === 'ASSIGNEE_CHANGE_CLOSED' && isEdit) {
      // 담당만 원래대로 되돌리고 다른 입력은 그대로 둔다(POL-121). 사람이 다시 저장한다(자동 재전송 없음)
      setClosedByServer(error.message || ASSIGNEE_MESSAGES.CLOSED_TODAY)
      setValues((prev) => ({ ...prev, assigneeId: originalAssigneeId, reassignReason: '' }))
      setErrors((prev) => ({ ...prev, assignee: undefined, reassignReason: undefined }))
      setNotice({ kind: 'closed' })
      return
    }
    if (code === 'CONCURRENT_MODIFICATION' && isEdit) {
      await reloadLatest()
      return
    }
    if (code === 'RESERVATION_PAST_DATE') {
      setErrors((prev) => ({ ...prev, date: error.message || '오늘 이후 날짜만 예약할 수 있습니다.' }))
      return
    }
    if (code === 'INVALID_INPUT' && error.fieldErrors?.length) {
      const mapped = {}
      for (const f of error.fieldErrors) {
        const field = fieldOf(f.field)
        if (field) mapped[field] = f.reason
      }
      if (Object.keys(mapped).length > 0) {
        setErrors((prev) => ({ ...prev, ...mapped }))
        return
      }
    }
    setNotice({ kind: 'error', error })
  }

  /** 409 동시 수정: 최신 예약을 다시 불러와 칸을 채운다. 사람이 다시 고쳐서 저장한다(자동 재전송 없음) */
  async function reloadLatest() {
    try {
      const panel = await getReservationPanel(editTarget.reservationId)
      const latest = {
        reservationId: panel.reservation.reservationId,
        version: panel.reservation.version,
        reservedAt: panel.reservation.reservedAt,
        purpose: panel.reservation.purpose,
        vehicle: { vehicleId: panel.vehicle.vehicleId, plateNumber: panel.vehicle.plateNumber, customerName: panel.customer.name },
        assignee: panel.reservation.assignee ?? null,
      }
      setEditTarget(latest)
      setValues(formFromReservation(latest))
      setClosedByServer(null)
      setErrors({})
      setNotice({ kind: 'concurrent', status: panel.reservation.status })
    } catch (error) {
      setNotice({ kind: 'error', error })
    }
  }

  const vehicle = values.vehicle
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>취소</Button>
      <Button
        type="submit"
        form={formId}
        loading={submitting}
        pendingText={isEdit ? '저장 중…' : '등록 중…'}
        disabled={isEdit && !changes}
      >
        {isEdit ? '저장' : '등록'}
      </Button>
    </>
  )

  return (
    <Modal
      open
      size="lg"
      title={isEdit ? '예약 변경' : '예약 등록'}
      subtitle={isEdit ? '차량은 바꿀 수 없습니다. 바꾼 칸만 저장합니다.' : '차량과 예약 시각을 선택해 주세요.'}
      onClose={onClose}
      footer={footer}
    >
      <form id={formId} className="rsv-form" onSubmit={submit} noValidate>
        {notice?.kind === 'existing' && (
          <div className="rsv-form__notice rsv-form__notice--warn" role="alert">
            <p>{notice.message}</p>
            {notice.reservationId != null && onOpenExisting && (
              <button type="button" className="rsv-form__link" onClick={() => onOpenExisting(notice.reservationId)}>
                {notice.linkLabel}
              </button>
            )}
          </div>
        )}
        {notice?.kind === 'closed' && (
          <ErrorNotice tone="warn" title={closedByServer} body={ASSIGNEE_MESSAGES.CLOSED_BY_SERVER} />
        )}
        {notice?.kind === 'concurrent' && (
          <ErrorNotice
            tone="warn"
            title="다른 사용자가 먼저 바꿨습니다."
            body={notice.status === 'RESERVED'
              ? '최신 내용을 불러왔습니다. 확인한 뒤 다시 수정해 주세요.'
              : '이 예약은 이미 처리되어 더 바꿀 수 없습니다.'}
          />
        )}
        {notice?.kind === 'error' && <ErrorNotice title="저장하지 못했습니다." error={notice.error} onRetry={() => submit()} />}

        <section className="rsv-form__section">
          <p className="rsv-form__label" id={`${idPrefix}-vehicle-label`}>차량{!isEdit && <span aria-hidden="true"> *</span>}</p>
          {vehicle && (
            <p className="rsv-form__vehicle" aria-labelledby={`${idPrefix}-vehicle-label`}>
              <b>{vehicle.plateNumber}</b>
              {vehicle.customerName && <span>{vehicle.customerName}</span>}
            </p>
          )}
          {!isEdit && vehiclePicker?.({
            value: vehicle?.vehicleId ?? null,
            onChange: (option) => update({ vehicle: option ? { vehicleId: option.vehicleId, plateNumber: option.plateNumber, customerName: option.customerName } : null }),
          })}
          {errors.vehicle && <p className="rsv-form__error" role="alert">⚠ {errors.vehicle}</p>}
        </section>

        <div className="rsv-form__when">
          <FormField id={`${idPrefix}-date`} label="날짜" required error={errors.date} hint={values.date ? formatDayLabel(values.date) : undefined}>
            <input type="date" min={today} value={values.date} onChange={(e) => update({ date: e.target.value, time: '' })} />
          </FormField>

          <div className="rsv-form__time">
            <p className="rsv-form__label" id={`${idPrefix}-time-label`}>시각 <span aria-hidden="true">*</span></p>
            <TimeSlotPicker
              id={`${idPrefix}-time`}
              date={values.date}
              today={today}
              nowTime={nowTime}
              value={values.time}
              onChange={(time) => update({ time })}
              invalid={Boolean(errors.time)}
              describedBy={errors.time ? `${idPrefix}-time-error` : undefined}
            />
            {errors.time && <p id={`${idPrefix}-time-error`} className="rsv-form__error">⚠ {errors.time}</p>}
          </div>
        </div>

        <AssigneeField
          idPrefix={idPrefix}
          status={assignees.status}
          candidates={candidates}
          value={assigneeId}
          onChange={(staffId) => update({ assigneeId: staffId })}
          error={errors.assignee}
          loadError={assignees.error}
          loadFailedBody={isEdit ? ASSIGNEE_MESSAGES.LOAD_FAILED_EDIT : ASSIGNEE_MESSAGES.LOAD_FAILED_CREATE}
          onRetry={assignees.reload}
          disabledReason={isEdit ? (closedByServer ?? closedMessage(reassign) ?? undefined) : undefined}
          hint={reassign === 'ownerToday' ? ASSIGNEE_MESSAGES.OWNER_TODAY_HINT : undefined}
          showReason={reasonRequired}
          reason={values.reassignReason}
          onReasonChange={(reassignReason) => update({ reassignReason })}
          reasonError={errors.reassignReason}
        />

        <PurposeFields
          idPrefix={idPrefix}
          items={items}
          itemIds={values.itemIds}
          other={values.other}
          memo={values.memo}
          onChange={update}
          error={errors.purpose}
          memoError={errors.memo}
        />
      </form>
    </Modal>
  )
}
