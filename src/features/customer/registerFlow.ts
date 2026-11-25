// M-01 고객·차량 등록의 판단 규칙 (09 M-01, 04 F-CUS-02, 08 06, 05 POL-120~125). 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// - 안내 수신 동의는 체크 안 됨이 기본이다(D-11). 검색어를 채워 열어도 바뀌지 않는다.
// - 칸 검사는 08 06 검증과 같은 범위로 미리 알려 줄 뿐이고, 최종 판정은 서버(400 fieldErrors)다.
// - 저장 실패(400·500·네트워크)여도 입력값을 바꾸지 않는다. 자동으로 다시 보내지 않는다(POL-125).

import { ApiError, DEFAULT_MESSAGES, type FieldError } from '@/shared/api/client'
import { createCustomer } from './api'
import type { CustomerCreateRequest, CustomerCreateResponse, CustomerSearchItem } from './types'

/** 입력 칸 값. 숫자 칸(연식·주행거리)도 입력 중에는 글자로 둔다 */
export interface RegisterForm {
  name: string
  phone: string
  consent: boolean
  plateNumber: string
  model: string
  modelYear: string
  mileage: string
}

export type RegisterField = keyof RegisterForm
export type RegisterErrors = Partial<Record<RegisterField, string>>

/** 칸 아래 문구. 서버(08 06 검증) 문구와 같게 둔다 */
export const REGISTER_MESSAGES = {
  REQUIRED: '필수 입력입니다.',
  NAME_MAX: '50자 이하로 입력해 주세요.',
  PHONE_PATTERN: '숫자와 하이픈만 입력할 수 있습니다.',
  PHONE_LENGTH: '9~20자로 입력해 주세요.',
  PLATE_MAX: '20자 이하로 입력해 주세요.',
  MODEL_MAX: '50자 이하로 입력해 주세요.',
  MILEAGE_MIN: '0 이상이어야 합니다.',
  MILEAGE_MAX: '2,000,000 이하여야 합니다.',
  NOT_INTEGER: '숫자만 입력해 주세요.',
} as const

export const MIN_MODEL_YEAR = 1980
export const MAX_MILEAGE = 2_000_000

/** 연식 범위 문구 (08 0.1: 1980 ~ 현재 연도 + 1) */
export function modelYearRangeMessage(currentYear: number): string {
  return `${MIN_MODEL_YEAR}년부터 ${currentYear + 1}년까지 입력할 수 있습니다.`
}

/** 화면 안내문 (09 M-01, 디자인 v3.0 Modal-Register) */
export const CONSENT_LABEL = '점검 시기 안내 수신 동의'
export const CONSENT_HINT = '고객에게 물어보고 체크하세요. 동의한 고객만 재점검 연락 대상이 됩니다.'
export const OPTIONAL_VEHICLE_HINT = '연식과 주행거리는 정비 시작 때 입력해도 됩니다.'
export const DUPLICATE_TITLE = '이미 있는 고객이면 고르세요'
export const DUPLICATE_HINT = '다른 고객이면 그대로 새로 등록할 수 있습니다. (가족이 같은 번호를 쓰는 경우 등)'

/** 서버 fieldErrors.field → 입력 칸 (08 06: 차량 칸은 `vehicle.` 접두) */
const FIELD_BY_SERVER: Record<string, RegisterField> = {
  name: 'name',
  phone: 'phone',
  consent: 'consent',
  'vehicle.plateNumber': 'plateNumber',
  'vehicle.model': 'model',
  'vehicle.modelYear': 'modelYear',
  'vehicle.mileage': 'mileage',
}

/**
 * 검색어로 어느 칸을 채울지 (09 S-05 "검색어를 M-01에 채워 준다" 💡).
 * 숫자·하이픈만 → 연락처, 숫자가 섞임 → 차량번호, 그 밖 → 고객명.
 */
export function guessFieldFromQuery(query: string | undefined): 'name' | 'phone' | 'plateNumber' | null {
  const text = query?.trim() ?? ''
  if (!text) return null
  if (/^[0-9\s-]+$/.test(text)) return 'phone'
  if (/[0-9]/.test(text)) return 'plateNumber'
  return 'name'
}

/** 처음 값. 동의는 항상 false(D-11) */
export function initialRegisterForm(initialQuery?: string): RegisterForm {
  const form: RegisterForm = { name: '', phone: '', consent: false, plateNumber: '', model: '', modelYear: '', mileage: '' }
  const field = guessFieldFromQuery(initialQuery)
  if (field) form[field] = (initialQuery ?? '').trim()
  return form
}

/** 선택 숫자 칸: 빈 값이면 null, 정수가 아니면 NaN. 주행거리의 천 단위 쉼표는 허용 */
export function parseOptionalInt(text: string): number | null {
  const value = text.trim().replace(/,/g, '')
  if (value === '') return null
  return /^\d+$/.test(value) ? Number(value) : Number.NaN
}

/** 차량번호: 형식 검사 없이 공백만 제거 (04 F-CUS-02) */
export function normalizePlate(plate: string): string {
  return plate.replace(/\s+/g, '')
}

/** 입력 칸 검사. currentYear는 연식 상한(현재 연도 + 1) 계산용 */
export function validateRegisterForm(form: RegisterForm, currentYear: number): RegisterErrors {
  const errors: RegisterErrors = {}
  const M = REGISTER_MESSAGES

  const name = form.name.trim()
  if (!name) errors.name = M.REQUIRED
  else if (name.length > 50) errors.name = M.NAME_MAX

  const phone = form.phone.trim()
  if (!phone) errors.phone = M.REQUIRED
  else if (!/^[0-9-]+$/.test(phone)) errors.phone = M.PHONE_PATTERN
  else if (phone.length < 9 || phone.length > 20) errors.phone = M.PHONE_LENGTH

  const plate = normalizePlate(form.plateNumber)
  if (!plate) errors.plateNumber = M.REQUIRED
  else if (plate.length > 20) errors.plateNumber = M.PLATE_MAX

  const model = form.model.trim()
  if (!model) errors.model = M.REQUIRED
  else if (model.length > 50) errors.model = M.MODEL_MAX

  const modelYear = parseOptionalInt(form.modelYear)
  if (modelYear !== null && (Number.isNaN(modelYear) || modelYear < MIN_MODEL_YEAR || modelYear > currentYear + 1)) {
    errors.modelYear = modelYearRangeMessage(currentYear)
  }

  const mileage = parseOptionalInt(form.mileage)
  if (mileage !== null) {
    if (Number.isNaN(mileage)) errors.mileage = M.NOT_INTEGER
    else if (mileage > MAX_MILEAGE) errors.mileage = M.MILEAGE_MAX
  }

  return errors
}

export function hasErrors(errors: RegisterErrors): boolean {
  return Object.values(errors).some(Boolean)
}

/** 08 06 요청 본문. 선택 칸이 비어 있으면 null */
export function toCreateRequest(form: RegisterForm): CustomerCreateRequest {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    consent: form.consent,
    vehicle: {
      plateNumber: normalizePlate(form.plateNumber),
      model: form.model.trim(),
      modelYear: parseOptionalInt(form.modelYear),
      mileage: parseOptionalInt(form.mileage),
    },
  }
}

/** 400 fieldErrors를 칸별 문구로. 칸에 대응하지 않는 것은 unmatched로 돌려 화면 위 안내에 쓴다 */
export function fieldErrorsToForm(fieldErrors: FieldError[]): { errors: RegisterErrors; unmatched: FieldError[] } {
  const errors: RegisterErrors = {}
  const unmatched: FieldError[] = []
  for (const fieldError of fieldErrors) {
    const field = FIELD_BY_SERVER[fieldError.field]
    if (field && !errors[field]) errors[field] = fieldError.reason
    else if (!field) unmatched.push(fieldError)
  }
  return { errors, unmatched }
}

export type RegisterOutcome =
  | { kind: 'created'; result: CustomerCreateResponse }
  /** 400: 칸 아래 문구. message는 칸에 붙일 수 없는 오류가 있을 때만(화면 위 안내) */
  | { kind: 'invalid'; errors: RegisterErrors; message: string | null }
  /** 그 밖(500·네트워크·401·403 등): 입력값 유지, 화면 위 오류 안내 + 사람이 누르는 다시 시도 */
  | { kind: 'failed'; error: ApiError }

/**
 * 06 저장 한 번. 입력값(form)은 바꾸지 않는다. 다시 보내는 것은 사람이 버튼을 다시 누를 때만(POL-125).
 * 두 번 누름 막기는 Button(submitGuard)이 한다(POL-120).
 */
export async function submitRegistration(
  form: RegisterForm,
  save: (body: CustomerCreateRequest) => Promise<CustomerCreateResponse> = createCustomer,
): Promise<RegisterOutcome> {
  try {
    const result = await save(toCreateRequest(form))
    return { kind: 'created', result }
  } catch (e) {
    const error = e instanceof ApiError ? e : new ApiError(0, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR)
    if (error.code === 'INVALID_INPUT') {
      const { errors, unmatched } = fieldErrorsToForm(error.fieldErrors)
      const message = unmatched.length > 0 || !hasErrors(errors) ? error.message : null
      return { kind: 'invalid', errors, message }
    }
    return { kind: 'failed', error }
  }
}

// ---- 같은 연락처·차량번호 기존 고객 (09 M-01, 04 F-CUS-02) ----

export interface DuplicateCandidate {
  customer: CustomerSearchItem
  samePhone: boolean
  samePlate: boolean
  /** 같은 차량번호인 차량 (있으면) */
  vehicleId: number | null
}

const digits = (text: string) => text.replace(/\D/g, '')
const plateKey = (text: string) => text.replace(/[\s-]/g, '')

/** 05 검색 결과 여러 개를 고객 하나씩으로 합친다 (연락처·차량번호로 따로 검색한 결과) */
export function mergeSearchItems(lists: CustomerSearchItem[][]): CustomerSearchItem[] {
  const seen = new Set<number>()
  const merged: CustomerSearchItem[] = []
  for (const item of lists.flat()) {
    if (seen.has(item.customerId)) continue
    seen.add(item.customerId)
    merged.push(item)
  }
  return merged
}

/**
 * 입력한 연락처·차량번호와 같은 기존 고객만 골라, 둘 다 같은 고객을 먼저 보인다.
 * 같아도 막지 않는다 — 가족 공동 번호 등은 그대로 새로 등록할 수 있다(09 M-01 ②).
 */
export function duplicateCandidates(items: CustomerSearchItem[], form: Pick<RegisterForm, 'phone' | 'plateNumber'>): DuplicateCandidate[] {
  const phone = digits(form.phone)
  const plate = plateKey(form.plateNumber)
  return items
    .map((customer) => {
      const samePhone = phone !== '' && digits(customer.phone) === phone
      const vehicle = plate === '' ? undefined : customer.vehicles.find((v) => plateKey(v.plateNumber) === plate)
      return { customer, samePhone, samePlate: vehicle !== undefined, vehicleId: vehicle?.vehicleId ?? null }
    })
    .filter((c) => c.samePhone || c.samePlate)
    .sort((a, b) => Number(b.samePhone && b.samePlate) - Number(a.samePhone && a.samePlate))
}
