// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 05~09의 사본이며 계약의 기준은 08이다.
// 값은 07 7.2 A 정비소 시드(고객 10명·차량 11대)와 08 JSON 예시. 실제 개인정보 없음.
// 로그인은 A 정비소 기준이고, A에 없는 id(B 정비소 고객 11·차량 12 포함, 07 7.4)는 404 NOT_FOUND(격리).
// 응답 함수는 상태를 쌓지 않는다(등록해도 목록에 더하지 않음 — 프론트에 데이터를 쌓지 않음).
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { FieldError, MockResponse } from '@/shared/api/client'
import { MAX_MILEAGE, MIN_MODEL_YEAR, REGISTER_MESSAGES, modelYearRangeMessage } from '../registerFlow'
import type {
  CustomerCreateRequest,
  CustomerDetail,
  CustomerDetailVehicle,
  CustomerSearchItem,
  CustomerSearchParams,
  VehicleDetail,
  VehicleInput,
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

/** 08 05 */
export function mockSearchCustomers(params: CustomerSearchParams = {}): MockResponse {
  const page = params.page ?? 0
  const requested = params.size ?? DEFAULT_SIZE
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(requested) || requested <= 0) return invalid()
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
    items: matched.slice(page * size, page * size + size),
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
  if (modelYear != null && (modelYear < MIN_MODEL_YEAR || modelYear > currentYear + 1)) {
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
    vehicles: customer.vehicles.map((v) => ({ vehicleId: v.vehicleId, plateNumber: v.plateNumber, ...VEHICLE_SPECS[v.vehicleId] })),
  }
  return ok(detail)
}

/** 08 08 — 없는 고객·다른 정비소 고객이면 404 (X17) */
export function mockAddVehicle(customerId: number, body: VehicleInput): MockResponse {
  if (!CUSTOMERS.some((c) => c.customerId === customerId)) return notFound()
  const errors = vehicleFieldErrors(body, '')
  if (errors.length > 0) return invalid(errors)
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
    customer: { customerId: owner.customerId, name: owner.name, phone: owner.phone, consent: owner.consent },
  }
  return ok(detail)
}
