// S-06 고객 수정 · S-07 차량 수정의 판단 규칙 (09 S-06·S-07, 04 F-CUS-06, 08 22·23, 05 POL-120~125·124). 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// - 요청에는 화면이 읽은 version(07·09 응답)을 함께 보내고, 바꾼 칸만 담는다(08 22·23 "보낸 필드만").
//   바꾼 칸이 없으면 요청하지 않는다(서버도 같은 값이면 version을 올리지 않음 — 보낼 이유가 없음).
// - 칸 검사는 06·08과 같은 범위로 미리 알려 줄 뿐이고 최종 판정은 서버(400 fieldErrors)다. 차량 칸은 registerFlow를 그대로 쓴다.
// - 연식·최근 주행거리는 값이 있으면 비울 수 없다(04 F-CUS-06). 원래 비어 있던 칸은 비워 둬도 된다(보내지 않음).
// - 409 CONCURRENT_MODIFICATION은 따로 돌려준다: 화면이 07·09를 다시 불러 최신 값·version을 보이고, 사람이 고친 칸은 지우지 않는다.
//   자동으로 다시 보내지 않는다(POL-124·125).

import { ApiError, DEFAULT_MESSAGES, type FieldError } from '@/shared/api/client'
import { REGISTER_MESSAGES, normalizePlate, parseOptionalInt, validateVehicleFields } from './registerFlow'
import type { CustomerDetail, CustomerUpdateRequest, VehicleDetail, VehicleUpdateRequest } from './types'

export const EDIT_LABEL = '수정'
/** 값이 있던 연식·최근 주행거리를 비웠을 때 (서버 문구와 같음) */
export const CANNOT_CLEAR = '비울 수 없습니다.'
/** 409 동시 수정 안내 (08 0.2 표: 덮어쓰지 않음, 최신 내용을 보여 주고 다시 수정하게 함) */
export const CONFLICT_TITLE = '다른 직원이 먼저 수정했습니다.'
export const CONFLICT_BODY = '최신 내용을 다시 불러왔습니다. 위 정보를 확인한 뒤 다시 저장해 주세요. 입력한 내용은 그대로 있습니다.'
/** M-01 같은 연락처·차량번호 안내의 ③ (09 M-01) */
export const EDIT_EXISTING_LABEL = '기존 고객 수정'

// ---- 고객 (08 22) ----

export interface CustomerEditForm {
  name: string
  phone: string
  consent: boolean
}
export type CustomerEditErrors = Partial<Record<keyof CustomerEditForm, string>>

export function customerEditForm(customer: Pick<CustomerDetail, 'name' | 'phone' | 'consent'>): CustomerEditForm {
  return { name: customer.name, phone: customer.phone, consent: customer.consent }
}

/** 06과 같은 검사 (이름 1~50자, 연락처 숫자·하이픈 9~20자) */
export function validateCustomerEdit(form: CustomerEditForm): CustomerEditErrors {
  const M = REGISTER_MESSAGES
  const errors: CustomerEditErrors = {}
  const name = form.name.trim()
  if (!name) errors.name = M.REQUIRED
  else if (name.length > 50) errors.name = M.NAME_MAX
  const phone = form.phone.trim()
  if (!phone) errors.phone = M.REQUIRED
  else if (!/^[0-9-]+$/.test(phone)) errors.phone = M.PHONE_PATTERN
  else if (phone.length < 9 || phone.length > 20) errors.phone = M.PHONE_LENGTH
  return errors
}

/** 22 요청: 지금(current) 값과 다른 칸만 + current.version. 바뀐 칸이 없으면 null */
export function toCustomerUpdate(form: CustomerEditForm, current: CustomerDetail): CustomerUpdateRequest | null {
  const changes: Omit<CustomerUpdateRequest, 'version'> = {}
  const name = form.name.trim()
  const phone = form.phone.trim()
  if (name !== current.name) changes.name = name
  if (phone !== current.phone) changes.phone = phone
  if (form.consent !== current.consent) changes.consent = form.consent
  return Object.keys(changes).length > 0 ? { version: current.version, ...changes } : null
}

// ---- 차량 (08 23) ----

/** 숫자 칸도 입력 중에는 글자로 둔다 */
export interface VehicleEditForm {
  plateNumber: string
  model: string
  modelYear: string
  latestMileage: string
}
export type VehicleEditErrors = Partial<Record<keyof VehicleEditForm, string>>

export function vehicleEditForm(vehicle: Pick<VehicleDetail, 'plateNumber' | 'model' | 'modelYear' | 'latestMileage'>): VehicleEditForm {
  return {
    plateNumber: vehicle.plateNumber,
    model: vehicle.model,
    modelYear: vehicle.modelYear == null ? '' : String(vehicle.modelYear),
    latestMileage: vehicle.latestMileage == null ? '' : String(vehicle.latestMileage),
  }
}

/** 08 차량 추가와 같은 검사(registerFlow) + 값이 있던 연식·최근 주행거리는 비울 수 없음 */
export function validateVehicleEdit(form: VehicleEditForm, current: VehicleDetail, currentYear: number): VehicleEditErrors {
  const { mileage, ...rest } = validateVehicleFields({ ...form, mileage: form.latestMileage }, currentYear)
  const errors: VehicleEditErrors = { ...rest, latestMileage: mileage }
  if (current.modelYear != null && form.modelYear.trim() === '') errors.modelYear = CANNOT_CLEAR
  if (current.latestMileage != null && form.latestMileage.trim() === '') errors.latestMileage = CANNOT_CLEAR
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as VehicleEditErrors
}

/** 23 요청: 지금(current) 값과 다른 칸만 + current.version. 바뀐 칸이 없으면 null. 검사를 통과한 form만 넘긴다 */
export function toVehicleUpdate(form: VehicleEditForm, current: VehicleDetail): VehicleUpdateRequest | null {
  const changes: Omit<VehicleUpdateRequest, 'version'> = {}
  const plateNumber = normalizePlate(form.plateNumber)
  const model = form.model.trim()
  const modelYear = parseOptionalInt(form.modelYear)
  const latestMileage = parseOptionalInt(form.latestMileage)
  if (plateNumber !== current.plateNumber) changes.plateNumber = plateNumber
  if (model !== current.model) changes.model = model
  if (modelYear !== null && modelYear !== current.modelYear) changes.modelYear = modelYear
  if (latestMileage !== null && latestMileage !== current.latestMileage) changes.latestMileage = latestMileage
  return Object.keys(changes).length > 0 ? { version: current.version, ...changes } : null
}

// ---- 저장 한 번 (22·23 공통) ----

export type EditOutcome<E> =
  | { kind: 'saved' }
  /** 바꾼 칸이 없어 요청하지 않음 */
  | { kind: 'unchanged' }
  /** 400: 칸 아래 문구. message는 칸에 붙일 수 없는 오류가 있을 때만(화면 위 안내) */
  | { kind: 'invalid'; errors: E; message: string | null }
  /** 409 CONCURRENT_MODIFICATION: 화면이 07·09를 다시 불러온다. 입력값은 유지 */
  | { kind: 'conflict' }
  /** 그 밖(404·500·네트워크 등): 입력값 유지, 화면 위 오류 안내 + 사람이 누르는 다시 시도 */
  | { kind: 'failed'; error: ApiError }

/**
 * 22·23 저장 한 번. request가 null(바꾼 칸 없음)이면 부르지 않는다. 입력값은 바꾸지 않는다.
 * fields: 서버 fieldErrors.field 중 칸에 붙일 수 있는 이름 (08 22·23 요청 필드 이름 그대로)
 */
export async function submitEdit<B, F extends string>(
  request: B | null,
  save: (body: B) => Promise<unknown>,
  fields: readonly F[],
): Promise<EditOutcome<Partial<Record<F, string>>>> {
  if (request === null) return { kind: 'unchanged' }
  try {
    await save(request)
    return { kind: 'saved' }
  } catch (e) {
    const error = e instanceof ApiError ? e : new ApiError(0, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR)
    if (error.code === 'CONCURRENT_MODIFICATION') return { kind: 'conflict' }
    if (error.code === 'INVALID_INPUT') {
      const { errors, unmatched } = mapFieldErrors(error.fieldErrors, fields)
      const message = unmatched.length > 0 || !Object.values(errors).some(Boolean) ? error.message : null
      return { kind: 'invalid', errors, message }
    }
    return { kind: 'failed', error }
  }
}

function mapFieldErrors<F extends string>(fieldErrors: FieldError[], fields: readonly F[]) {
  const errors: Partial<Record<F, string>> = {}
  const unmatched: FieldError[] = []
  for (const fieldError of fieldErrors) {
    const field = fields.find((name) => name === fieldError.field)
    if (field && !errors[field]) errors[field] = fieldError.reason
    else if (!field) unmatched.push(fieldError)
  }
  return { errors, unmatched }
}

export const CUSTOMER_EDIT_FIELDS = ['name', 'phone', 'consent'] as const
export const VEHICLE_EDIT_FIELDS = ['plateNumber', 'model', 'modelYear', 'latestMileage'] as const
