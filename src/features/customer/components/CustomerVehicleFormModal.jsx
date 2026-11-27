import { useEffect, useId, useRef, useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { NETWORK_ERROR } from '@/shared/api/client'
import { searchCustomers } from '../api'
import { EDIT_EXISTING_LABEL } from '../editFlow'
import {
  CONSENT_HINT,
  CONSENT_LABEL,
  DUPLICATE_HINT,
  DUPLICATE_INFO_TITLE,
  DUPLICATE_TITLE,
  MIN_MODEL_YEAR,
  OPTIONAL_VEHICLE_HINT,
  duplicateCandidates,
  hasErrors,
  initialRegisterForm,
  mergeSearchItems,
  normalizePlate,
  submitRegistration,
  validateRegisterForm,
} from '../registerFlow'
import './customer.css'

// M-01 고객·차량 등록 (09 M-01, 04 F-CUS-02, 08 05·06, 디자인 v3.0 Modal-Register-*).
// - 안내 수신 동의는 체크 안 됨이 기본(D-11). 차종 필수(D-58). 연식·주행거리는 선택.
// - 칸 오류는 칸을 벗어날 때 보이고, 한 번 보인 칸은 입력마다 다시 검사한다. 저장 때 서버 400 fieldErrors를 칸 아래에.
// - 저장 중 버튼 비활성·두 번 눌러도 한 번(Button, POL-120). 실패해도 입력값 유지, 위에 오류 안내 + 사람이 누르는 다시 시도(POL-125).
// - 연락처·차량번호 칸을 벗어나면 05로 같은 연락처·차량번호의 기존 고객을 찾아 위에 보인다. 같아도 등록을 막지 않는다(가족 공동 번호).
//   05의 연락처는 서버가 가린 값(08 0.5)이라 연락처 검색에 나온 고객 중 가린 값과 자리가 맞는 고객을 "같은 연락처"로 본다(#32).
//   기존 고객 행동 버튼은 쓰는 화면이 연결한 것만 그린다(pickKinds) — 연결 안 된 버튼 없음:
//     'vehicle' 같은 차량번호의 차량 (목록: 차량 보기 / 예약: 이 차량 선택), 'add' 이 고객에 차량 추가,
//     'edit' 기존 고객 수정(09 M-01 ③, F-CUS-06 #32 — S-06 고객 수정으로 감)
// 쓰는 화면은 열 때 그리고 닫을 때 빼서(조건부 렌더) 입력을 새로 시작한다.
// 사용: <CustomerVehicleFormModal initialQuery={q} context="list" onCreated={done} onClose={close} />

const PICK_LABELS = {
  vehicle: { list: '차량 보기', reservation: '이 차량 선택' },
  add: { list: '이 고객에 차량 추가', reservation: '이 고객에 차량 추가' },
  edit: { list: EDIT_EXISTING_LABEL, reservation: EDIT_EXISTING_LABEL },
}

export default function CustomerVehicleFormModal({
  initialQuery = '',
  context = 'list',
  stacked = false,
  pickKinds = [],
  onPick,
  onCreated,
  onClose,
}) {
  const idPrefix = useId()
  const formId = `${idPrefix}-form`
  const fieldId = (name) => `${idPrefix}-${name}`
  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState(() => initialRegisterForm(initialQuery))
  const [errors, setErrors] = useState({})
  const [shown, setShown] = useState({}) // 오류를 보이기 시작한 칸
  const [saveNotice, setSaveNotice] = useState(null) // { error } 저장 실패 · { title } 칸에 붙일 수 없는 400
  const [duplicates, setDuplicates] = useState([])
  const [focusTick, setFocusTick] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false) // "등록"과 "다시 시도"가 함께 쓰는 잠금 — 요청 중에는 어느 쪽도 다시 보내지 않는다(POL-120)
  const formRef = useRef(null)
  const duplicateRequest = useRef(0)
  const pickable = Boolean(onPick) && pickKinds.length > 0

  // 저장을 눌렀는데 칸 오류가 있으면 첫 오류 칸으로 초점
  useEffect(() => {
    if (focusTick === 0) return
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [focusTick])

  function update(field, value) {
    const next = { ...form, [field]: value }
    setForm(next)
    if (shown[field]) setErrors((prev) => ({ ...prev, [field]: validateRegisterForm(next, currentYear)[field] }))
  }

  function blur(field) {
    setShown((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateRegisterForm(form, currentYear)[field] }))
    if (field === 'phone' || field === 'plateNumber') findDuplicates(form)
  }

  async function findDuplicates(value) {
    const request = ++duplicateRequest.current
    const phone = value.phone.trim()
    const plate = normalizePlate(value.plateNumber)
    if (!phone && !plate) {
      setDuplicates([])
      return
    }
    try {
      // 연락처 검색 결과를 따로 알아 둔다 — 05의 연락처는 가린 값이라(08 0.5) 같은 번호인지는 이 결과로 확인한다(registerFlow)
      const [byPhone, byPlate] = await Promise.all([
        phone ? searchCustomers({ q: phone }) : null,
        plate ? searchCustomers({ q: plate }) : null,
      ])
      if (request !== duplicateRequest.current) return
      const lists = [byPhone, byPlate].filter(Boolean).map((page) => page.items)
      const phoneHitIds = new Set((byPhone?.items ?? []).map((customer) => customer.customerId))
      setDuplicates(duplicateCandidates(mergeSearchItems(lists), value, phoneHitIds))
    } catch {
      // 중복 확인은 안내일 뿐이라 실패해도 등록을 막지 않는다. 401은 client가 로그인 화면으로 보낸다.
      if (request === duplicateRequest.current) setDuplicates([])
    }
  }

  async function save() {
    if (submittingRef.current) return
    setSaveNotice(null)
    const found = validateRegisterForm(form, currentYear)
    if (hasErrors(found)) {
      showErrors(found)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    let outcome
    try {
      outcome = await submitRegistration(form)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
    if (outcome.kind === 'created') {
      onCreated({ ...outcome.result, name: form.name.trim(), plateNumber: normalizePlate(form.plateNumber) })
      return
    }
    if (outcome.kind === 'invalid') {
      showErrors(outcome.errors)
      if (outcome.message) setSaveNotice({ title: outcome.message })
      return
    }
    setSaveNotice({ error: outcome.error })
    // 응답이 없으면 저장됐는지 알 수 없다 — 같은 연락처·차량번호를 다시 찾아, 저장됐다면 위 안내에 보이게 한다(09 0장)
    if (outcome.error.code === NETWORK_ERROR) findDuplicates(form)
  }

  function showErrors(found) {
    setErrors(found)
    setShown(Object.fromEntries(Object.keys(found).map((field) => [field, true])))
    setFocusTick((tick) => tick + 1)
  }

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
    <Modal
      open
      title="신규 고객·차량 등록"
      subtitle="고객과 첫 차량을 함께 등록합니다."
      stacked={stacked}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form={formId} onClick={save} loading={submitting}>
            등록
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} className="customer-form" noValidate onSubmit={(event) => event.preventDefault()}>
        {saveNotice?.error && <ErrorNotice error={saveNotice.error} onRetry={save} />}
        {saveNotice?.title && <ErrorNotice title={saveNotice.title} />}

        {duplicates.length > 0 && (
          <div className="customer-dup" role="status">
            <p className="customer-dup__title">{pickable ? DUPLICATE_TITLE : DUPLICATE_INFO_TITLE}</p>
            <ul className="customer-dup__list">
              {duplicates.map(({ customer, samePhone, samePlate, vehicleId }) => (
                <li key={customer.customerId} className="customer-dup__item">
                  <span className="customer-dup__who">
                    <strong>{customer.name}</strong> {customer.phone}
                    {customer.vehicles.length > 0 && ` · ${customer.vehicles.map((v) => v.plateNumber).join(', ')}`}
                    {samePhone && <em className="customer-dup__tag">같은 연락처</em>}
                    {samePlate && <em className="customer-dup__tag">같은 차량번호</em>}
                  </span>
                  {pickable && (
                    <span className="customer-dup__actions">
                      {pickKinds.includes('vehicle') && vehicleId !== null && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onPick({ kind: 'vehicle', customerId: customer.customerId, vehicleId })}
                        >
                          {PICK_LABELS.vehicle[context]}
                        </Button>
                      )}
                      {pickKinds.includes('add') && (
                        <Button variant="secondary" size="sm" onClick={() => onPick({ kind: 'add', customerId: customer.customerId })}>
                          {PICK_LABELS.add[context]}
                        </Button>
                      )}
                      {pickKinds.includes('edit') && (
                        <Button variant="secondary" size="sm" onClick={() => onPick({ kind: 'edit', customerId: customer.customerId })}>
                          {PICK_LABELS.edit[context]}
                        </Button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="customer-form__help">{DUPLICATE_HINT}</p>
          </div>
        )}

        <section className="customer-form__section" aria-labelledby={fieldId('customer-title')}>
          <h3 id={fieldId('customer-title')} className="customer-form__section-title">
            고객
          </h3>
          <div className="customer-form__grid">
            <FormField id={fieldId('name')} label="고객명" required error={shown.name ? errors.name : undefined}>
              {textInput('name', { placeholder: '예) 홍길동' })}
            </FormField>
            <FormField
              id={fieldId('phone')}
              label="연락처"
              required
              hint="숫자와 하이픈(-)만"
              error={shown.phone ? errors.phone : undefined}
            >
              {textInput('phone', { type: 'tel', inputMode: 'tel', placeholder: '010-0000-0000' })}
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
        </section>

        <section className="customer-form__section" aria-labelledby={fieldId('vehicle-title')}>
          <h3 id={fieldId('vehicle-title')} className="customer-form__section-title">
            차량
          </h3>
          <div className="customer-form__grid">
            <FormField
              id={fieldId('plateNumber')}
              label="차량번호"
              required
              hint="띄어쓰기는 저장할 때 빠집니다."
              error={shown.plateNumber ? errors.plateNumber : undefined}
            >
              {textInput('plateNumber', { placeholder: '예) 12가3456' })}
            </FormField>
            <FormField id={fieldId('model')} label="차종" required error={shown.model ? errors.model : undefined}>
              {textInput('model', { placeholder: '예) 아반떼' })}
            </FormField>
            <FormField id={fieldId('modelYear')} label="연식" suffix="년" error={shown.modelYear ? errors.modelYear : undefined}>
              {textInput('modelYear', { inputMode: 'numeric', placeholder: `${MIN_MODEL_YEAR}~${currentYear + 1}` })}
            </FormField>
            <FormField id={fieldId('mileage')} label="주행거리" suffix="km" error={shown.mileage ? errors.mileage : undefined}>
              {textInput('mileage', { inputMode: 'numeric', placeholder: '0~2,000,000' })}
            </FormField>
            <p className="customer-form__help customer-form__span">{OPTIONAL_VEHICLE_HINT}</p>
          </div>
        </section>
      </form>
    </Modal>
  )
}
