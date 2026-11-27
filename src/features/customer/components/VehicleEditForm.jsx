import { useId } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import FormField from '@/shared/ui/FormField.jsx'
import { updateVehicle } from '../api'
import {
  CONFLICT_BODY,
  CONFLICT_TITLE,
  VEHICLE_EDIT_FIELDS,
  toVehicleUpdate,
  validateVehicleEdit,
  vehicleEditForm,
} from '../editFlow'
import { MIN_MODEL_YEAR } from '../registerFlow'
import { submitEdit } from '@/shared/lib/submitEdit'
import { useEditForm } from '@/shared/lib/useEditForm'
import './customer.css'
import './addVehicleInline.css'

// S-07 차량 수정 (09 S-07 "수정", 04 F-CUS-06, 08 23). 차량·고객 머리 아래 인라인 입력. 고객은 바꾸지 않는다.
// - 차량번호·차종 필수, 연식(1980~올해+1)·최근 주행거리(0~2,000,000). 칸 규칙은 차량 추가(08 08)와 같다.
//   연식·최근 주행거리는 값이 있으면 비울 수 없다(F-CUS-06). 원래 비어 있던 칸은 비워 둬도 된다.
// - 저장할 때 09에서 읽은 version(vehicle.version)을 함께 보내고, 바꾼 칸만 보낸다. 바꾼 칸이 없으면 요청 없이 닫는다.
// - 409 CONCURRENT_MODIFICATION(다른 직원의 수정, 그 사이 방문 기록 저장으로 주행거리가 바뀐 경우 포함 — 08 23):
//   onConflict로 화면이 09를 다시 불러 위 머리에 최신 값을 보인다. 고친 칸은 그대로 두고 손대지 않은 칸은 최신 값으로 바뀐다
//   (useEditForm). 자동으로 다시 보내지 않는다(POL-124·125).
// refreshing: 화면이 다시 불러오는 중이면 [저장]을 막는다(409 뒤 최신 version을 받기 전).
// 쓰는 화면은 열 때 그리고 닫을 때 빼서(조건부 렌더) 입력을 새로 시작한다.
// 사용: <VehicleEditForm vehicle={detail} onSaved={reloadAndClose} onConflict={reload} onCancel={close} />

export default function VehicleEditForm({ vehicle, refreshing = false, onSaved, onConflict, onCancel }) {
  const idPrefix = useId()
  const fieldId = (name) => `${idPrefix}-${name}`
  const currentYear = new Date().getFullYear()
  const { form, errors, shown, notice, submitting, formRef, update, blur, save } = useEditForm({
    source: vehicleEditForm(vehicle),
    validate: (value) => validateVehicleEdit(value, vehicle, currentYear),
    submit: (value) =>
      submitEdit(toVehicleUpdate(value, vehicle), (body) => updateVehicle(vehicle.vehicleId, body), VEHICLE_EDIT_FIELDS),
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
      aria-label="차량 수정"
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
        <FormField
          id={fieldId('plateNumber')}
          label="차량번호"
          required
          hint="띄어쓰기는 저장할 때 빠집니다."
          error={shown.plateNumber ? errors.plateNumber : undefined}
        >
          {textInput('plateNumber')}
        </FormField>
        <FormField id={fieldId('model')} label="차종" required error={shown.model ? errors.model : undefined}>
          {textInput('model')}
        </FormField>
        <FormField id={fieldId('modelYear')} label="연식" suffix="년" error={shown.modelYear ? errors.modelYear : undefined}>
          {textInput('modelYear', { inputMode: 'numeric', placeholder: `${MIN_MODEL_YEAR}~${currentYear + 1}` })}
        </FormField>
        <FormField
          id={fieldId('latestMileage')}
          label="최근 주행거리"
          suffix="km"
          error={shown.latestMileage ? errors.latestMileage : undefined}
        >
          {textInput('latestMileage', { inputMode: 'numeric', placeholder: '0~2,000,000' })}
        </FormField>
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
