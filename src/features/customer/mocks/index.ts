// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 05~09·22·23의 사본이며 계약의 기준은 08이다.
// 값은 07 7.2 A 정비소 시드(고객 10명·차량 11대)와 08 JSON 예시. 실제 개인정보 없음.
// 로그인은 A 정비소 기준이고, A에 없는 id(B 정비소 고객 11·차량 12 포함, 07 7.4)는 404 NOT_FOUND(격리).
// 응답 함수는 상태를 쌓지 않는다(등록해도 목록에 더하지 않음 — 프론트에 데이터를 쌓지 않음).
// 그래서 07·09의 version은 늘 0이고, 22·23은 version 0이면 성공(+1을 돌려줌), 그 밖의 숫자면 409 CONCURRENT_MODIFICATION이다.
// 수정해도 다시 조회하면 시드 값으로 돌아온다(상태를 쌓지 않음).
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { FieldError, MockResponse } from '@/shared/api/client'
import { maskPhone } from '@/shared/lib/maskPhone'
import { MAX_MILEAGE, MIN_MODEL_YEAR, REGISTER_MESSAGES, modelYearRangeMessage } from '../registerFlow'
import type {
  CustomerCreateRequest,
  CustomerDetail,
  CustomerDetailVehicle,
  CustomerSearchItem,
  CustomerSearchParams,
  CustomerUpdateRequest,
  VehicleDetail,
  VehicleInput,
  VehicleUpdateRequest,
} from '../types'
import customersOk from './customers.json'
import customerDetailOk from './customer-detail.json'
import vehicleDetailOk from './vehicle-detail.json'

/** A 정비소 고객 (최근 등록순) */
const CUSTOMERS = customersOk.data.items as CustomerSearchItem[]

/**
 * 07 7.2 차량 표의 차종·연식·최근 주행거리와 기대 상태(도래·임박 항목 수).
 * dueCount·soonCount는 07 7.2 「기대」 칸을 옮긴 고정 값이다(화면·Mock이 계산하지 않음).
 */
const VEHICLE_SPECS: Record<number, Omit<CustomerDetailVehicle, 'vehicleId' | 'plateNumber'>> = {
  1: { model: '아반떼', modelYear: 2019, latestMileage: 40000, dueCount: 1, soonCount: 0 },
  2: { model: '쏘나타', modelYear: 2018, latestMileage: 60000, dueCount: 1, soonCount: 0 },
  3: { model: '그랜저', modelYear: 2017, latestMileage: 80000, dueCount: 0, soonCount: 1 },
  4: { model: 'K5', modelYear: 2020, latestMileage: 45000, dueCount: 0, soonCount: 0 },
  5: { model: '아반떼', modelYear: 2019, latestMileage: null, dueCount: 0, soonCount: 0 },
  6: { model: '투싼', modelYear: 2016, latestMileage: 70000, dueCount: 1, soonCount: 0 },
  7: { model: '쏘렌토', modelYear: 2018, latestMileage: 55000, dueCount: 0, soonCount: 0 },
  8: { model: '스포티지', modelYear: 2021, latestMileage: 30000, dueCount: 0, soonCount: 1 },
  9: { model: '아반떼', modelYear: 2015, latestMileage: 90000, dueCount: 1, soonCount: 0 },
  10: { model: '쏘나타', modelYear: 2018, latestMileage: 97000, dueCount: 0, soonCount: 1 },
  11: { model: 'K3', modelYear: null, latestMileage: null, dueCount: 0, soonCount: 0 },
}

/** 등록·차량 추가 응답에 쓰는 새 id (시드 다음 번호: 고객 11·차량 12는 B 정비소) */
const NEXT_CUSTOMER_ID = 12
const NEXT_VEHICLE_ID = 13

const DEFAULT_SIZE = 20
const MAX_SIZE = 50

function ok(data: unknown): MockResponse {
  return { status: 200, body: { success: true, data, error: null } }
}

function error(status: number, code: string, message: string, fieldErrors: FieldError[] = []): MockResponse {
  return { status, body: { success: false, data: null, error: { code, message, fieldErrors, details: null } } }
}

const invalid = (fieldErrors: FieldError[] = []) => error(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', fieldErrors)
const notFound = () => error(404, 'NOT_FOUND', '찾을 수 없습니다.')

/** 검색 비교용: 공백·하이픈 무시 (08 05) */
const searchKey = (text: string) => text.replace(/[\s-]/g, '')

/** 08 05 — 찾기는 실제 번호로, 응답의 phone은 가린 값(P0-나머지, 08 0.5) */
export function mockSearchCustomers(params: CustomerSearchParams = {}): MockResponse {
  // 쪽 나누기 오류는 서버(PageLimit)와 같은 fieldErrors
  const page = params.page ?? 0
  const requested = params.size ?? DEFAULT_SIZE
  if (!Number.isInteger(page)) return invalid([{ field: 'page', reason: '형식이 올바르지 않습니다.' }])
  if (!Number.isInteger(requested)) return invalid([{ field: 'size', reason: '형식이 올바르지 않습니다.' }])
  if (page < 0) return invalid([{ field: 'page', reason: '0 이상이어야 합니다.' }])
  if (requested <= 0) return invalid([{ field: 'size', reason: '1 이상이어야 합니다.' }])
  const size = Math.min(requested, MAX_SIZE)

  const keyword = searchKey(params.q ?? '')
  const matched = keyword
    ? CUSTOMERS.filter(
        (c) =>
          searchKey(c.name).includes(keyword) ||
          searchKey(c.phone).includes(keyword) ||
          c.vehicles.some((v) => searchKey(v.plateNumber).includes(keyword)),
      )
    : CUSTOMERS

  return ok({
    items: matched.slice(page * size, page * size + size).map((c) => ({ ...c, phone: maskPhone(c.phone) })),
    page,
    size,
    totalElements: matched.length,
    totalPages: Math.ceil(matched.length / size),
  })
}

/** 08 06 차량 칸 검사 (서버 검증 문구와 같게). prefix: 06은 `vehicle.`, 08은 없음 */
function vehicleFieldErrors(vehicle: Partial<VehicleInput> | null | undefined, prefix: string): FieldError[] {
  const M = REGISTER_MESSAGES
  const errors: FieldError[] = []
  const plate = (vehicle?.plateNumber ?? '').replace(/\s+/g, '')
  const model = (vehicle?.model ?? '').trim()
  if (!plate) errors.push({ field: `${prefix}plateNumber`, reason: M.REQUIRED })
  else if (plate.length > 20) errors.push({ field: `${prefix}plateNumber`, reason: M.PLATE_MAX })
  if (!model) errors.push({ field: `${prefix}model`, reason: M.REQUIRED })
  else if (model.length > 50) errors.push({ field: `${prefix}model`, reason: M.MODEL_MAX })

  const currentYear = new Date().getFullYear()
  const modelYear = vehicle?.modelYear
  if (modelYear != null && modelYear < MIN_MODEL_YEAR) errors.push({ field: `${prefix}modelYear`, reason: M.MODEL_YEAR_MIN })
  else if (modelYear != null && modelYear > currentYear + 1) {
    errors.push({ field: `${prefix}modelYear`, reason: modelYearRangeMessage(currentYear) })
  }
  const mileage = vehicle?.mileage
  if (mileage != null && mileage < 0) errors.push({ field: `${prefix}mileage`, reason: M.MILEAGE_MIN })
  else if (mileage != null && mileage > MAX_MILEAGE) errors.push({ field: `${prefix}mileage`, reason: M.MILEAGE_MAX })
  return errors
}

/** 08 06 — 차량번호 중복은 막지 않는다 */
export function mockCreateCustomer(body: CustomerCreateRequest): MockResponse {
  const M = REGISTER_MESSAGES
  const errors: FieldError[] = []
  const name = (body.name ?? '').trim()
  const phone = (body.phone ?? '').trim()
  if (!name) errors.push({ field: 'name', reason: M.REQUIRED })
  else if (name.length > 50) errors.push({ field: 'name', reason: M.NAME_MAX })
  if (!phone) errors.push({ field: 'phone', reason: M.REQUIRED })
  else if (!/^[0-9-]+$/.test(phone)) errors.push({ field: 'phone', reason: M.PHONE_PATTERN })
  else if (phone.length < 9 || phone.length > 20) errors.push({ field: 'phone', reason: M.PHONE_LENGTH })
  if (typeof body.consent !== 'boolean') errors.push({ field: 'consent', reason: M.REQUIRED })
  if (!body.vehicle) errors.push({ field: 'vehicle', reason: M.REQUIRED })
  else errors.push(...vehicleFieldErrors(body.vehicle, 'vehicle.'))
  if (errors.length > 0) return invalid(errors)

  return ok({ customerId: NEXT_CUSTOMER_ID, vehicleId: NEXT_VEHICLE_ID })
}

/** 08 07 */
export function mockGetCustomer(customerId: number): MockResponse {
  if (customerId === customerDetailOk.data.customerId) return { status: 200, body: customerDetailOk }
  const customer = CUSTOMERS.find((c) => c.customerId === customerId)
  if (!customer) return notFound()
  const detail: CustomerDetail = {
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    consent: customer.consent,
    version: 0,
    vehicles: customer.vehicles.map((v) => ({ vehicleId: v.vehicleId, plateNumber: v.plateNumber, ...VEHICLE_SPECS[v.vehicleId] })),
  }
  return ok(detail)
}

/** 08 08 — 서버처럼 본문 검증(400)이 먼저, 그다음 없는 고객·다른 정비소 고객이면 404 (X17) */
export function mockAddVehicle(customerId: number, body: VehicleInput): MockResponse {
  const errors = vehicleFieldErrors(body, '')
  if (errors.length > 0) return invalid(errors)
  if (!CUSTOMERS.some((c) => c.customerId === customerId)) return notFound()
  return ok({ customerId, vehicleId: NEXT_VEHICLE_ID })
}

/** 08 09 */
export function mockGetVehicle(vehicleId: number): MockResponse {
  if (vehicleId === vehicleDetailOk.data.vehicleId) return { status: 200, body: vehicleDetailOk }
  const owner = CUSTOMERS.find((c) => c.vehicles.some((v) => v.vehicleId === vehicleId))
  const vehicle = owner?.vehicles.find((v) => v.vehicleId === vehicleId)
  if (!owner || !vehicle) return notFound()
  const { model, modelYear, latestMileage } = VEHICLE_SPECS[vehicleId]
  const detail: VehicleDetail = {
    vehicleId,
    plateNumber: vehicle.plateNumber,
    model,
    modelYear,
    latestMileage,
    version: 0,
    customer: { customerId: owner.customerId, name: owner.name, phone: owner.phone, consent: owner.consent },
  }
  return ok(detail)
}

/** Mock의 07·09 version (상태를 쌓지 않아 늘 0) */
const MOCK_VERSION = 0
const CANNOT_CLEAR = '비울 수 없습니다.'
const concurrent = () => error(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.')

/**
 * 22·23 공통 version 검사(400). 누락은 version 칸 오류, 숫자가 아니면 본문을 읽을 수 없는 경우라 fieldErrors 없이(08 0.2).
 * 반환 null이면 통과.
 */
function versionError(version: unknown): MockResponse | null {
  if (version === undefined || version === null) return invalid([{ field: 'version', reason: REGISTER_MESSAGES.REQUIRED }])
  return typeof version === 'number' && Number.isInteger(version) ? null : invalid()
}

/**
 * 08 22 — 확인 순서(chagok-docs#153): ① 요청 본문 형식(version 누락·숫자 아님, 값 형식, 400) → ② 정비소 소유(없는 고객·다른 정비소 고객 404)
 * → ③ version 다르면 409. 백엔드(@Valid → getOwned → version)와 같다.
 */
export function mockUpdateCustomer(customerId: number, body: CustomerUpdateRequest): MockResponse {
  const M = REGISTER_MESSAGES
  const badVersion = versionError(body.version)
  if (badVersion) return badVersion
  const errors: FieldError[] = []
  const name = body.name?.trim()
  const phone = body.phone?.trim()
  if (name !== undefined && !name) errors.push({ field: 'name', reason: CANNOT_CLEAR })
  else if (name !== undefined && name.length > 50) errors.push({ field: 'name', reason: M.NAME_MAX })
  if (phone !== undefined && !/^[0-9-]*$/.test(phone)) errors.push({ field: 'phone', reason: M.PHONE_PATTERN })
  else if (phone !== undefined && (phone.length < 9 || phone.length > 20)) errors.push({ field: 'phone', reason: M.PHONE_LENGTH })
  if (errors.length > 0) return invalid(errors)

  const detail = mockGetCustomer(customerId)
  if (detail.status !== 200) return detail
  if (body.version !== MOCK_VERSION) return concurrent()
  const current = (detail.body as { data: CustomerDetail }).data
  const next = { name: name ?? current.name, phone: phone ?? current.phone, consent: body.consent ?? current.consent }
  const changed = next.name !== current.name || next.phone !== current.phone || next.consent !== current.consent
  return ok({ customerId, ...next, version: changed ? MOCK_VERSION + 1 : MOCK_VERSION })
}

/**
 * 08 23 — 22와 같은 순서. 단 modelYear 상한(현재 연도 + 1, 서버는 Clock이 필요해 서비스가 확인)은 ②와 ③ 사이의 400이다(chagok-docs#153).
 * 고객은 바꾸지 않는다.
 */
export function mockUpdateVehicle(vehicleId: number, body: VehicleUpdateRequest): MockResponse {
  const M = REGISTER_MESSAGES
  const badVersion = versionError(body.version)
  if (badVersion) return badVersion
  const errors: FieldError[] = []
  const plateNumber = body.plateNumber?.replace(/\s+/g, '')
  const model = body.model?.trim()
  if (plateNumber !== undefined && !plateNumber) errors.push({ field: 'plateNumber', reason: CANNOT_CLEAR })
  else if (plateNumber !== undefined && plateNumber.length > 20) errors.push({ field: 'plateNumber', reason: M.PLATE_MAX })
  if (model !== undefined && !model) errors.push({ field: 'model', reason: CANNOT_CLEAR })
  else if (model !== undefined && model.length > 50) errors.push({ field: 'model', reason: M.MODEL_MAX })
  if (body.modelYear != null && body.modelYear < MIN_MODEL_YEAR) errors.push({ field: 'modelYear', reason: M.MODEL_YEAR_MIN })
  const mileage = body.latestMileage
  if (mileage != null && mileage < 0) errors.push({ field: 'latestMileage', reason: M.MILEAGE_MIN })
  else if (mileage != null && mileage > MAX_MILEAGE) errors.push({ field: 'latestMileage', reason: M.MILEAGE_MAX })
  if (errors.length > 0) return invalid(errors)

  const detail = mockGetVehicle(vehicleId)
  if (detail.status !== 200) return detail
  const currentYear = new Date().getFullYear()
  if (body.modelYear != null && body.modelYear > currentYear + 1) {
    return invalid([{ field: 'modelYear', reason: modelYearRangeMessage(currentYear) }])
  }
  if (body.version !== MOCK_VERSION) return concurrent()
  const current = (detail.body as { data: VehicleDetail }).data
  const next = {
    plateNumber: plateNumber ?? current.plateNumber,
    model: model ?? current.model,
    modelYear: body.modelYear ?? current.modelYear,
    latestMileage: mileage ?? current.latestMileage,
  }
  const changed = (Object.keys(next) as (keyof typeof next)[]).some((key) => next[key] !== current[key])
  return ok({ vehicleId, ...next, version: changed ? MOCK_VERSION + 1 : MOCK_VERSION })
}
