import FormField from '@/shared/ui/FormField.jsx'
import { VISIT_MESSAGES } from '../visitRecordFlow'
import './visitRecord.css'

// S-08 방문 정보: 방문일(기본 오늘) · 주행거리 (09 S-08 2번, 04 F-MNT-01, D-58).
// - 방문일은 <input type="date">의 "YYYY-MM-DD" 문자열 그대로 둔다(시간대 변환 없음). max = 오늘(서울)로 미래를 고르지 못하게 한다.
// - 차량에 연식이 비어 있으면 연식 칸이 생긴다. 필수 표시는 required(교체·점검을 골랐을 때만, D-58·08 12)를 따른다. 안내 문구는 화면 위쪽(pages).
// - 값·오류는 받은 그대로 보이기만 한다. 검사·요청 만들기는 visitRecordFlow, 저장은 pages.
// props: form · errors(VisitRecordErrors) · missing(VehicleMissing, 칸을 보일지) · required(VehicleMissing, 필수인지 — 없으면 missing)
//        · today · latestMileage(number|null) · onChange(field, value)

export default function VisitInfoForm({ form, errors = {}, missing, required = missing, today, latestMileage = null, onChange }) {
  const mileagePlaceholder = latestMileage == null ? '현재 주행거리' : `최근 ${latestMileage.toLocaleString('ko-KR')}`
  return (
    <div className="visit-info">
      <FormField id="visit-date" label="방문일" required hint={VISIT_MESSAGES.VISIT_DATE_HINT} error={errors.visitDate}>
        <input type="date" value={form.visitDate} max={today} onChange={(e) => onChange('visitDate', e.target.value)} />
      </FormField>
      <FormField
        id="visit-mileage"
        label={required.latestMileage ? '현재 주행거리' : '현재 주행거리 (선택)'}
        required={required.latestMileage}
        hint={VISIT_MESSAGES.MILEAGE_HINT}
        error={errors.mileage}
        suffix="km"
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={mileagePlaceholder}
          value={form.mileage}
          onChange={(e) => onChange('mileage', e.target.value)}
        />
      </FormField>
      {missing.modelYear && (
        <FormField id="visit-model-year" label={required.modelYear ? '연식' : '연식 (선택)'} required={required.modelYear} error={errors.modelYear} suffix="년">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="예: 2020"
            value={form.modelYear}
            onChange={(e) => onChange('modelYear', e.target.value)}
          />
        </FormField>
      )}
    </div>
  )
}
