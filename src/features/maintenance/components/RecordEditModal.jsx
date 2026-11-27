import { useId } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { submitEdit } from '@/shared/lib/submitEdit'
import { useEditForm } from '@/shared/lib/useEditForm'
import { updateRecord } from '../api'
import { INSPECT_RESULT_LABELS, RECORD_TYPE_LABELS } from '../maintenanceFlow'
import {
  RECORD_EDIT_FIELDS,
  RECORD_EDIT_TEXT as T,
  TEXT_MAX,
  recordEditForm,
  toRecordUpdate,
  validateRecordEdit,
  withCurrentStaff,
} from '../recordEditFlow'
import './recordEdit.css'

// M-03 정비 기록 수정 (09 M-03, 04 F-MNT-04, 08 7.1 37, D-55). 기록 1행.
// - 입력: 방문일(외부는 고객이 말한 정비일) · 주행거리 · 구분 · 항목 · 점검 결과(구분이 점검일 때만) · 메모 · 담당 정비사, 사유(선택).
//   차량은 표시만 하고 바꿀 수 없다. 삭제는 없다.
// - 저장할 때 11에서 읽은 version을 함께 보내고, 바꾼 칸만 보낸다(recordEditFlow.toRecordUpdate). 바꾼 칸이 없으면 요청 없이 안내만.
// - 409 CONCURRENT_MODIFICATION: onConflict로 화면이 11을 다시 불러 record·visit이 최신으로 바뀐다. 고친 칸은 그대로, 손대지 않은 칸은
//   최신 값으로 바뀐다(shared/lib/useEditForm). 자동으로 다시 보내지 않는다(POL-124·125).
// - 403 FORBIDDEN·EDIT_PERIOD_EXPIRED·404·500은 서버 문구를 그대로 위에 보이고 입력은 유지한다.
// - 저장 성공은 onSaved — 화면이 11·10을 다시 불러온다(수정 즉시 상태·다음 정비일에 반영, H2).
// missing: 409 뒤 다시 받은 11 첫 쪽에 이 기록이 없음(더 보기 뒤쪽이었거나 그사이 바뀜). reloadFailed: 11 다시 부르기 실패.
//   둘 다 최신 version을 모르는 상태라 409 뒤에는 저장을 막고 닫았다 다시 열게 안내한다(같은 409 반복 방지, POL-124).
// - 403은 다시 보내도 같은 결과라 "다시 시도"를 두지 않는다(POL-127).
// props: record(11 records[]) · vehicleLabel(차량번호 표시) · items(08 13 [{ itemId, name }]) ·
//        mechanicOptions([{ staffId, label }], 08 36) · today(서울 YYYY-MM-DD) · refreshing(11 다시 부르는 중) · onSaved · onConflict · onClose

export default function RecordEditModal({
  record,
  missing = false,
  reloadFailed = false,
  vehicleLabel,
  items,
  mechanicOptions,
  today,
  refreshing = false,
  onSaved,
  onConflict,
  onClose,
}) {
  const idPrefix = useId()
  const formId = `${idPrefix}-form`
  const fieldId = (name) => `${idPrefix}-${name}`
  const initial = recordEditForm(record)
  const { form, errors, shown, notice, submitting, formRef, update, blur, save } = useEditForm({
    source: initial,
    validate: (value) => validateRecordEdit(value, initial, today),
    submit: async (value) => {
      const body = toRecordUpdate(value, initial, record.version)
      if (body === null) return { kind: 'invalid', errors: {}, message: T.UNCHANGED }
      return submitEdit(body, (b) => updateRecord(record.recordId, b), RECORD_EDIT_FIELDS)
    },
    onSaved,
    onConflict,
    refreshing,
  })
  const error = (field) => (shown[field] ? errors[field] : undefined)
  // 저장 중에는 닫지 않는다([취소]·×·Esc·바깥 누름 모두). 닫고 다른 기록을 연 뒤 늦게 온 onSaved가 그 모달을 닫아 입력이 사라지지 않게(PR #89 리뷰).
  const close = () => {
    if (!submitting) onClose()
  }
  const stale = Boolean(notice?.conflict) && !refreshing && (missing || reloadFailed) // 409 뒤 최신 version을 받지 못함
  const conflictBody = reloadFailed ? T.CONFLICT_RELOAD_FAILED : missing ? T.CONFLICT_GONE : T.CONFLICT_BODY
  const options = withCurrentStaff(mechanicOptions, record.staff)
  // 항목 목록에 지금 항목이 없으면(쓰지 않는 항목 등) 그 이름으로 한 줄 더한다
  const itemOptions = items.some((i) => i.itemId === record.itemId) ? items : [{ itemId: record.itemId, name: record.itemName }, ...items]

  return (
    <Modal
      open
      title={T.TITLE}
      subtitle={T.NO_DELETE_HINT}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            {T.CANCEL}
          </Button>
          <Button type="submit" form={formId} loading={submitting} disabled={refreshing || stale}>
            {T.SAVE}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={formRef}
        className="record-edit"
        aria-label={T.TITLE}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        {notice?.conflict && <ErrorNotice tone="warn" title={T.CONFLICT_TITLE} body={conflictBody} />}
        {notice?.error && <ErrorNotice error={notice.error} onRetry={notice.error.status === 403 ? undefined : save} />}
        {notice?.title && <ErrorNotice title={notice.title} />}
        <p className="record-edit__vehicle">
          <span className="record-edit__label">{T.VEHICLE}</span> <strong>{vehicleLabel}</strong>
        </p>
        <div className="record-edit__grid">
          <FormField id={fieldId('recordDate')} label={form.type === 'EXTERNAL' ? T.EXTERNAL_DATE : T.VISIT_DATE} required error={error('recordDate')}>
            <input
              type="date"
              max={today}
              value={form.recordDate}
              onChange={(e) => update('recordDate', e.target.value)}
              onBlur={() => blur('recordDate')}
            />
          </FormField>
          <FormField id={fieldId('mileage')} label={T.MILEAGE} suffix="km" error={error('mileage')}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0~2,000,000"
              autoComplete="off"
              value={form.mileage}
              onChange={(e) => update('mileage', e.target.value)}
              onBlur={() => blur('mileage')}
            />
          </FormField>
          <FormField id={fieldId('type')} label={T.TYPE} required error={error('type')}>
            <select value={form.type} onChange={(e) => update('type', e.target.value)} onBlur={() => blur('type')}>
              {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id={fieldId('itemId')} label={T.ITEM} required error={error('itemId')}>
            <select value={form.itemId} onChange={(e) => update('itemId', e.target.value)} onBlur={() => blur('itemId')}>
              {itemOptions.map((item) => (
                <option key={item.itemId} value={String(item.itemId)}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          {form.type === 'INSPECT' && (
            <FormField id={fieldId('inspectResult')} label={T.INSPECT_RESULT} error={error('inspectResult')}>
              <select value={form.inspectResult} onChange={(e) => update('inspectResult', e.target.value)} onBlur={() => blur('inspectResult')}>
                <option value="">{T.INSPECT_RESULT_NONE}</option>
                {Object.entries(INSPECT_RESULT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField id={fieldId('mechanicId')} label={T.MECHANIC} required error={error('mechanicId')}>
            <select value={form.mechanicId} onChange={(e) => update('mechanicId', e.target.value)} onBlur={() => blur('mechanicId')}>
              {options.map((option) => (
                <option key={option.staffId} value={String(option.staffId)}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="record-edit__span">
            <FormField id={fieldId('memo')} label={T.MEMO} error={error('memo')}>
              <textarea rows={2} maxLength={TEXT_MAX} value={form.memo} onChange={(e) => update('memo', e.target.value)} onBlur={() => blur('memo')} />
            </FormField>
          </div>
          <div className="record-edit__span">
            <FormField id={fieldId('reason')} label={T.REASON} hint={T.REASON_HINT} error={error('reason')}>
              <input
                type="text"
                maxLength={TEXT_MAX}
                autoComplete="off"
                value={form.reason}
                onChange={(e) => update('reason', e.target.value)}
                onBlur={() => blur('reason')}
              />
            </FormField>
          </div>
        </div>
      </form>
    </Modal>
  )
}
