import { useId } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import { updateCustomer } from '../api'
import {
  CONFLICT_BODY,
  CONFLICT_TITLE,
  CUSTOMER_EDIT_FIELDS,
  customerEditForm,
  toCustomerUpdate,
  validateCustomerEdit,
} from '../editFlow'
import { CONSENT_HINT, CONSENT_LABEL } from '../registerFlow'
import { submitEdit } from '@/shared/lib/submitEdit'
import { useEditForm } from '@/shared/lib/useEditForm'
import './customer.css'
import './addVehicleInline.css'

// S-06 고객 수정 (09 S-06 "수정(동의 포함)", 04 F-CUS-06, 08 22). 고객 정보 카드 아래 인라인 입력.
// - 고객명·연락처(전체 번호, D-40)·안내 수신 동의. 칸 규칙은 M-01과 같다(06 검증).
// - 저장할 때 07에서 읽은 version(customer.version)을 함께 보내고, 바꾼 칸만 보낸다. 바꾼 칸이 없으면 요청 없이 닫는다.
// - 409 CONCURRENT_MODIFICATION: onConflict로 화면이 07을 다시 불러 위 카드에 최신 값을 보인다. 고친 칸은 그대로 두고,
//   손대지 않은 칸은 최신 값으로 바뀐다(옛 값으로 덮어쓰지 않게, useEditForm).
//   다시 불러온 version은 customer prop으로 들어와 다음 저장에 쓰인다. 자동으로 다시 보내지 않는다(POL-124·125).
// refreshing: 화면이 다시 불러오는 중이면 [저장]을 막는다(409 뒤 최신 version을 받기 전).
// 쓰는 화면은 열 때 그리고 닫을 때 빼서(조건부 렌더) 입력을 새로 시작한다.
// 사용: <CustomerEditForm customer={detail} onSaved={reloadAndClose} onConflict={reload} onCancel={close} />

export default function CustomerEditForm({ customer, refreshing = false, onSaved, onConflict, onCancel }) {
  const idPrefix = useId()
  const fieldId = (name) => `${idPrefix}-${name}`
  const { form, errors, shown, notice, submitting, formRef, update, blur, save } = useEditForm({
    source: customerEditForm(customer),
    validate: validateCustomerEdit,
    submit: (value) =>
      submitEdit(toCustomerUpdate(value, customer), (body) => updateCustomer(customer.customerId, body), CUSTOMER_EDIT_FIELDS),
    onSaved,
    onConflict,
    refreshing,
  })

  const textInput = (field, props = {}) => (
    <input
      type="text"
      value={form[field]}
      onChange={(event) => update(field, event.target.value)}
      onBlur={() => blur(field)}
      autoComplete="off"
      {...props}
    />
  )

  return (
    <form
      ref={formRef}
      className="customer-form add-vehicle"
      aria-label="고객 수정"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      {notice?.conflict && <ErrorNotice tone="warn" title={CONFLICT_TITLE} body={CONFLICT_BODY} />}
      {notice?.error && <ErrorNotice error={notice.error} onRetry={save} />}
      {notice?.title && <ErrorNotice title={notice.title} />}
      <div className="customer-form__grid">
        <FormField id={fieldId('name')} label="고객명" required error={shown.name ? errors.name : undefined}>
          {textInput('name')}
        </FormField>
        <FormField
          id={fieldId('phone')}
          label="연락처"
          required
          hint="숫자와 하이픈(-)만"
          error={shown.phone ? errors.phone : undefined}
        >
          {textInput('phone', { type: 'tel', inputMode: 'tel' })}
        </FormField>
        <div className="customer-form__span">
          <label className="customer-form__check">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => update('consent', event.target.checked)}
              aria-describedby={fieldId('consent-help')}
            />
            {CONSENT_LABEL}
          </label>
          <p id={fieldId('consent-help')} className="customer-form__help">
            {CONSENT_HINT}
          </p>
          {shown.consent && errors.consent && (
            <p className="customer-form__error" role="alert">
              {errors.consent}
            </p>
          )}
        </div>
      </div>
      <div className="add-vehicle__actions">
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={submitting} disabled={refreshing}>
          저장
        </Button>
      </div>
    </form>
  )
}
