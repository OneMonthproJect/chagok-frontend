import { useEffect, useId, useRef, useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import { ApiError, DEFAULT_MESSAGES } from '@/shared/api/client'
import { addVehicle } from '../api'
import {
  MIN_MODEL_YEAR,
  OPTIONAL_VEHICLE_HINT,
  fieldErrorsToForm,
  hasErrors,
  normalizePlate,
  parseOptionalInt,
  validateVehicleFields,
} from '../registerFlow'
import './customer.css'
import './addVehicleInline.css'

// S-06 기존 고객에 차량 추가 (09 S-06 "차량 추가(인라인 입력)", 04 F-CUS-03, 08 08). 표시 방식은 09 기준 인라인이다
// (디자인 v3.0의 모달은 D1 팀 결정 전, DESIGN_VERIFICATION 9-5). 차량 칸 규칙은 M-01과 같다(registerFlow).
// - 차종·차량번호 필수. 연식(1980~올해+1)·주행거리(0~2,000,000)는 선택.
// - 칸 오류는 칸을 벗어날 때 보이고, 한 번 보인 칸은 입력마다 다시 검사한다. 저장 때 서버 400 fieldErrors를 칸 아래에.
// - 저장 중 버튼 비활성·두 번 눌러도 한 번(잠금 ref, POL-120). 실패해도 입력값 유지, 위에 오류 안내 + 사람이 누르는 다시 시도(POL-125).
// 쓰는 화면은 열 때 그리고 닫을 때 빼서(조건부 렌더) 입력을 새로 시작한다.
// 사용: <AddVehicleInline customerId={id} onAdded={reloadAndClose} onCancel={close} />

const EMPTY = { plateNumber: '', model: '', modelYear: '', mileage: '' }

export default function AddVehicleInline({ customerId, onAdded, onCancel }) {
  const idPrefix = useId()
  const fieldId = (name) => `${idPrefix}-${name}`
  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [shown, setShown] = useState({})
  const [notice, setNotice] = useState(null) // { error } 저장 실패 · { title } 칸에 붙일 수 없는 400
  const [submitting, setSubmitting] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const submittingRef = useRef(false)
  const formRef = useRef(null)

  // 열리면 첫 칸으로 초점
  useEffect(() => {
    formRef.current?.querySelector('input')?.focus()
  }, [])

  // 저장을 눌렀는데 칸 오류가 있으면 첫 오류 칸으로 초점
  useEffect(() => {
    if (focusTick === 0) return
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [focusTick])

  function update(field, value) {
    const next = { ...form, [field]: value }
    setForm(next)
    if (shown[field]) setErrors((prev) => ({ ...prev, [field]: validateVehicleFields(next, currentYear)[field] }))
  }

  function blur(field) {
    setShown((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateVehicleFields(form, currentYear)[field] }))
  }

  function showErrors(found) {
    setErrors(found)
    setShown(Object.fromEntries(Object.keys(found).map((field) => [field, true])))
    setFocusTick((tick) => tick + 1)
  }

  async function save() {
    if (submittingRef.current) return
    setNotice(null)
    const found = validateVehicleFields(form, currentYear)
    if (hasErrors(found)) {
      showErrors(found)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      await addVehicle(customerId, {
        plateNumber: normalizePlate(form.plateNumber),
        model: form.model.trim(),
        modelYear: parseOptionalInt(form.modelYear),
        mileage: parseOptionalInt(form.mileage),
      })
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError(0, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR)
      if (error.code === 'INVALID_INPUT') {
        // 08 08 본문은 평평해서 fieldErrors.field가 차량 칸 이름 그대로다. 공용 변환은 `vehicle.` 접두를 쓰므로 붙여서 넘긴다.
        const prefixed = error.fieldErrors.map((item) => ({ ...item, field: `vehicle.${item.field}` }))
        const { errors: byField, unmatched } = fieldErrorsToForm(prefixed)
        showErrors(byField)
        if (unmatched.length > 0 || !hasErrors(byField)) setNotice({ title: error.message })
      } else {
        setNotice({ error })
      }
      return
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
    onAdded()
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
    <form
      ref={formRef}
      className="customer-form add-vehicle"
      aria-label="차량 추가"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      {notice?.error && <ErrorNotice error={notice.error} onRetry={save} />}
      {notice?.title && <ErrorNotice title={notice.title} />}
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
      <div className="add-vehicle__actions">
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={submitting}>
          추가
        </Button>
      </div>
    </form>
  )
}
