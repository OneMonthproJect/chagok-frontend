import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, parseResponse } from '@/shared/api/client'
import { addVehicle, createCustomer, customerSearchQuery, getCustomer, getVehicle, searchCustomers } from './api'
import { mockAddVehicle, mockCreateCustomer, mockGetCustomer, mockGetVehicle, mockSearchCustomers } from './mocks'
import customersOk from './mocks/customers.json'
import customerDetailOk from './mocks/customer-detail.json'
import vehicleDetailOk from './mocks/vehicle-detail.json'
import type {
  CustomerCreateRequest,
  CustomerDetail,
  CustomerSearchResponse,
  VehicleDetail,
} from './types'

// 08 05~09: 실제 fetch 없이 확인한다 (fetch 대역, auth/api.test.ts와 같은 방식). Mock은 client의 같은 해석(parseResponse)을 거친다.

// fixture가 types.ts(08) 모양과 맞는지 컴파일 때(tsc) 확인한다
const FIXTURES: [CustomerSearchResponse, CustomerDetail, VehicleDetail] = [customersOk.data, customerDetailOk.data, vehicleDetailOk.data]

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const okBody = (data: unknown) => ({ success: true, data, error: null })

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    return e as ApiError
  }
  throw new Error('should have thrown')
}

/** Mock 응답을 client와 같은 방식으로 해석 */
function parse<T>(response: { status: number; body: unknown }): T {
  return parseResponse<T>(response.status, response.body)
}

const NEW_CUSTOMER: CustomerCreateRequest = {
  name: '정우성',
  phone: '010-0000-0005',
  consent: true,
  vehicle: { plateNumber: '90마0005', model: '아반떼', modelYear: 2019, mileage: null },
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('customerSearchQuery (05 쿼리)', () => {
  it('빈 검색어·정하지 않은 쪽은 빼서 서버 기본값을 쓴다', () => {
    expect(customerSearchQuery()).toBe('')
    expect(customerSearchQuery({ q: '   ' })).toBe('')
  })

  it('검색어는 앞뒤 공백만 빼고 넘긴다 (공백·하이픈 무시는 서버가)', () => {
    expect(customerSearchQuery({ q: ' 010-0000 ', page: 1, size: 20 })).toBe('?q=010-0000&page=1&size=20')
  })
})

describe('API 호출 (08 05~09)', () => {
  it('05 GET /api/customers 에 검색어·쪽을 붙이고 data를 돌려준다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, customersOk))
    const page = await searchCustomers({ q: '오세훈', page: 0 })
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/customers?q=${encodeURIComponent('오세훈')}&page=0`)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(page.totalElements).toBe(10)
  })

  it('06 POST /api/customers 에 08 요청 본문 그대로 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, okBody({ customerId: 12, vehicleId: 13 })))
    const result = await createCustomer(NEW_CUSTOMER)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/customers')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(NEW_CUSTOMER)
    expect(result).toEqual({ customerId: 12, vehicleId: 13 })
  })

  it('06 400 INVALID_INPUT은 fieldErrors를 담은 ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: '입력값을 확인해 주세요.', fieldErrors: [{ field: 'vehicle.model', reason: '필수 입력입니다.' }], details: null },
      }),
    )
    const error = await caught(createCustomer(NEW_CUSTOMER))
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.fieldErrors).toEqual([{ field: 'vehicle.model', reason: '필수 입력입니다.' }])
  })

  it('응답이 없으면 NETWORK_ERROR이고 다시 보내지 않는다 (POL-125)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await caught(createCustomer(NEW_CUSTOMER))
    expect(error.code).toBe(NETWORK_ERROR)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('07·08·09 경로', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, okBody({}))))
    await getCustomer(10)
    await addVehicle(10, NEW_CUSTOMER.vehicle)
    await getVehicle(4)
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'GET /api/customers/10',
      'POST /api/customers/10/vehicles',
      'GET /api/vehicles/4',
    ])
  })
})

describe('Mock (CONVENTIONS 7장, 07 7.2·7.4 시드)', () => {
  it('fixture는 08 0.2 공통 응답 모양', () => {
    for (const fixture of [customersOk, customerDetailOk, vehicleDetailOk]) {
      expect(fixture).toMatchObject({ success: true, error: null })
    }
    expect(FIXTURES).toHaveLength(3)
  })

  it('05 전체: A 정비소 고객 10명·차량 11대, 최근 등록순', () => {
    const page = parse<CustomerSearchResponse>(mockSearchCustomers())
    expect(page.totalElements).toBe(10)
    expect(page.items.flatMap((c) => c.vehicles)).toHaveLength(11)
    expect(page.items[0].name).toBe('오세훈')
    expect(page.items[0].vehicles.map((v) => v.plateNumber)).toEqual(['55차0010', '66카0011'])
  })

  it('05 검색: 이름·연락처·차량번호 일부, 공백·하이픈 무시', () => {
    expect(parse<CustomerSearchResponse>(mockSearchCustomers({ q: '12 가0001' })).items.map((c) => c.name)).toEqual(['김민수'])
    expect(parse<CustomerSearchResponse>(mockSearchCustomers({ q: '0100000 0009' })).items.map((c) => c.name)).toEqual(['장미래'])
    expect(parse<CustomerSearchResponse>(mockSearchCustomers({ q: '세훈' })).items.map((c) => c.customerId)).toEqual([10])
  })

  it('05 결과 없음: items [] · totalElements 0', () => {
    const page = parse<CustomerSearchResponse>(mockSearchCustomers({ q: '홍길동' }))
    expect(page.items).toEqual([])
    expect(page.totalElements).toBe(0)
    expect(page.totalPages).toBe(0)
  })

  it('05 쪽 나누기: size 50 초과는 50, page 음수는 400', () => {
    expect(parse<CustomerSearchResponse>(mockSearchCustomers({ size: 100 })).size).toBe(50)
    const second = parse<CustomerSearchResponse>(mockSearchCustomers({ page: 1, size: 4 }))
    expect(second.items.map((c) => c.customerId)).toEqual([6, 5, 4, 3])
    expect(second.totalPages).toBe(3)
    expect(() => parse(mockSearchCustomers({ page: -1 }))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('06 차종 누락은 400 + vehicle.model (D-58)', () => {
    const body = { ...NEW_CUSTOMER, vehicle: { ...NEW_CUSTOMER.vehicle, model: '' } }
    expect(() => parse(mockCreateCustomer(body))).toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT', fieldErrors: [{ field: 'vehicle.model', reason: '필수 입력입니다.' }] }),
    )
  })

  it('06 동의 false·연식·주행거리 비움은 저장된다', () => {
    const body = { ...NEW_CUSTOMER, consent: false, vehicle: { ...NEW_CUSTOMER.vehicle, modelYear: null, mileage: null } }
    expect(parse(mockCreateCustomer(body))).toEqual({ customerId: 12, vehicleId: 13 })
  })

  it('06 연식·주행거리 범위 밖은 400 (08 0.1)', async () => {
    const body = { ...NEW_CUSTOMER, vehicle: { ...NEW_CUSTOMER.vehicle, modelYear: 1979, mileage: 2_000_001 } }
    const error = await caught(Promise.resolve().then(() => parse(mockCreateCustomer(body))))
    expect(error.fieldErrors.map((f) => f.field)).toEqual(['vehicle.modelYear', 'vehicle.mileage'])
  })

  it('07 오세훈은 08 예시 그대로, 다른 A 고객은 07 7.2 값', () => {
    expect(parse(mockGetCustomer(10))).toEqual(customerDetailOk.data)
    const detail = parse<CustomerDetail>(mockGetCustomer(5))
    expect(detail.vehicles).toEqual([
      { vehicleId: 5, plateNumber: '90마0005', model: '아반떼', modelYear: 2019, latestMileage: null, dueCount: 0, soonCount: 0 },
    ])
  })

  it('09 최지은 차량은 08 예시 그대로, 다른 A 차량은 07 7.2 값', () => {
    expect(parse(mockGetVehicle(4))).toEqual(vehicleDetailOk.data)
    const vehicle = parse<VehicleDetail>(mockGetVehicle(11))
    expect(vehicle).toMatchObject({ plateNumber: '66카0011', model: 'K3', modelYear: null, latestMileage: null })
    expect(vehicle.customer.name).toBe('오세훈')
  })

  it('격리: B 정비소 고객 11·차량 12는 404 (07 7.4, X1·X2·X17)', () => {
    for (const response of [mockGetCustomer(11), mockGetVehicle(12), mockAddVehicle(11, NEW_CUSTOMER.vehicle)]) {
      expect(() => parse(response)).toThrowError(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }))
    }
  })

  it('08 차량 추가: 필드 이름에 vehicle. 접두가 없다', () => {
    expect(() => parse(mockAddVehicle(10, { ...NEW_CUSTOMER.vehicle, model: ' ' }))).toThrowError(
      expect.objectContaining({ fieldErrors: [{ field: 'model', reason: '필수 입력입니다.' }] }),
    )
    expect(parse(mockAddVehicle(10, NEW_CUSTOMER.vehicle))).toEqual({ customerId: 10, vehicleId: 13 })
  })
})
