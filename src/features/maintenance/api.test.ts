import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, parseResponse } from '@/shared/api/client'
import { getItemStatus, getItems, getVisits, itemStatusQuery, saveVisit, visitListQuery } from './api'
import { mockGetItemStatus, mockGetItems, mockGetVisits, mockSaveVisit, type ItemStatusPreviewFixture } from './mocks'
import itemStatusPreviewFixture from './mocks/item-status-preview.json'
import itemStatusFixture from './mocks/item-status.json'
import itemsOk from './mocks/items.json'
import visitsFixture from './mocks/visits.json'
import type { ItemStatusResponse, ServiceItem, Visit, VisitListResponse, VisitSaveRequest, VisitSaveResponse } from './types'

// 08 10~13: 실제 fetch 없이 확인한다 (fetch 대역, customer/api.test.ts와 같은 방식). Mock은 client의 같은 해석(parseResponse)을 거친다.

// fixture가 types.ts(08) 모양과 맞는지 컴파일 때(tsc) 확인한다
const FIXTURES: [Record<string, ItemStatusResponse>, Record<string, Visit[]>, ServiceItem[], ItemStatusPreviewFixture] = [
  itemStatusFixture as Record<string, ItemStatusResponse>,
  visitsFixture as Record<string, Visit[]>,
  itemsOk.data as ServiceItem[],
  itemStatusPreviewFixture as ItemStatusPreviewFixture,
]

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

function parseError(response: { status: number; body: unknown }): ApiError {
  try {
    parse(response)
  } catch (e) {
    return e as ApiError
  }
  throw new Error('should have failed')
}

/** 08 12 P0-핵심 요청 예시 */
const SAVE: VisitSaveRequest = {
  visitDate: '2026-11-24',
  mileage: 55000,
  records: [
    { itemId: 1, type: 'REPLACE', memo: null },
    { itemId: 5, type: 'INSPECT', memo: '앞 타이어 마모 확인' },
  ],
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('쿼리 문자열 (08 10·11)', () => {
  it('10: mileage가 없으면 빼서 날짜 기준만', () => {
    expect(itemStatusQuery()).toBe('')
    expect(itemStatusQuery(null)).toBe('')
    expect(itemStatusQuery(0)).toBe('?mileage=0')
    expect(itemStatusQuery(55000)).toBe('?mileage=55000')
  })

  it('11: 정하지 않은 쪽은 빼서 서버 기본값(page 0·size 20)', () => {
    expect(visitListQuery()).toBe('')
    expect(visitListQuery({ page: 1, size: 20 })).toBe('?page=1&size=20')
  })
})

describe('API 호출 (08 10~13)', () => {
  it('10 GET /api/vehicles/{id}/item-status 는 data를 그대로 돌려준다', async () => {
    const data = FIXTURES[0]['4']
    fetchMock.mockResolvedValue(jsonResponse(200, okBody(data)))
    await expect(getItemStatus(4)).resolves.toEqual(data)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/4/item-status')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')

    fetchMock.mockResolvedValue(jsonResponse(200, okBody({ ...data, inputMileage: 55000 })))
    await getItemStatus(4, 55000)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/vehicles/4/item-status?mileage=55000')
  })

  it('11 GET /api/vehicles/{id}/visits 에 쪽을 붙인다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, okBody({ items: [], page: 1, size: 20, totalElements: 3, totalPages: 1 })))
    await getVisits(10, { page: 1, size: 20 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/10/visits?page=1&size=20')
  })

  it('12 POST /api/vehicles/{id}/visits 에 08 요청 본문 그대로 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, okBody({ vehicleId: 4, visitKey: 'k', savedCount: 2 })))
    await expect(saveVisit(4, SAVE)).resolves.toEqual({ vehicleId: 4, visitKey: 'k', savedCount: 2 })
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/vehicles/4/visits')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(SAVE)
  })

  it('13 GET /api/items 는 배열 data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, itemsOk))
    await expect(getItems()).resolves.toEqual(itemsOk.data)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/items')
  })

  it('404 NOT_FOUND는 ApiError (남의 차량, X2·X6)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { success: false, data: null, error: { code: 'NOT_FOUND', message: '찾을 수 없습니다.', fieldErrors: [], details: null } }),
    )
    const error = await caught(getVisits(12))
    expect(error.code).toBe('NOT_FOUND')
    expect(error.status).toBe(404)
  })

  it('12 응답이 없으면 NETWORK_ERROR이고 다시 보내지 않는다 (POL-125)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await caught(saveVisit(4, SAVE))
    expect(error.code).toBe(NETWORK_ERROR)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('Mock (CONVENTIONS 7장, 07 7.2·7.4 시드)', () => {
  it('10 차량 4는 08 예시와 같은 기준 기록이고, 6개 항목 전부 sortOrder 순', () => {
    const data = parse<ItemStatusResponse>(mockGetItemStatus(4))
    expect(data.asOf).toBe('2026-11-24')
    expect(data.inputMileage).toBeNull()
    expect(data.items.map((i) => i.code)).toEqual(['ENGINE_OIL', 'AIR_CLEANER', 'AC_FILTER', 'BRAKE_PAD', 'TIRE', 'BATTERY'])
    expect(data.items[0]).toMatchObject({
      status: 'AHEAD',
      baseRecord: { date: '2026-09-24', mileage: 45000, type: 'REPLACE' },
      nextDueDate: '2027-03-24',
      nextDueMileage: 55000,
    })
    expect(data.items[1]).toEqual({
      itemId: 2, code: 'AIR_CLEANER', name: '에어클리너',
      status: 'UNKNOWN', dueReason: null, baseRecord: null, nextDueDate: null, nextDueMileage: null,
      lastDecline: null, lastCaution: null,
    })
  })

  it('10 꼬리표는 07 7.2 시드 기대 그대로: 11바0006 엔진오일 지난 방문 거절, 33아0008 타이어 지난 점검 주의 (F-CYC-02, 주의 메모는 시드에 없어 08 12 예시 문구)', () => {
    const tagged = Object.keys(FIXTURES[0]).flatMap((id) =>
      parse<ItemStatusResponse>(mockGetItemStatus(Number(id)))
        .items.filter((i) => i.lastDecline || i.lastCaution)
        .map((i) => ({ vehicleId: Number(id), itemId: i.itemId, lastDecline: i.lastDecline, lastCaution: i.lastCaution })),
    )
    expect(tagged).toEqual([
      { vehicleId: 6, itemId: 1, lastDecline: { date: '2026-10-24', memo: null }, lastCaution: null },
      { vehicleId: 8, itemId: 5, lastDecline: null, lastCaution: { date: '2026-09-24', memo: '앞 타이어 마모' } },
    ])
    // 꼬리표는 상태를 바꾸지 않는다: 11바0006 엔진오일은 기준(교체 D-8M) 그대로 도래, 33아0008 타이어는 임박
    expect(parse<ItemStatusResponse>(mockGetItemStatus(8)).items[4]).toMatchObject({ status: 'SOON' })
  })

  it('10 시드 차량 전체에 미확인·여유·임박·도래가 골고루 있다 (07 7.2 기대)', () => {
    const statuses = new Set(
      Object.keys(FIXTURES[0]).flatMap((id) => parse<ItemStatusResponse>(mockGetItemStatus(Number(id))).items.map((i) => i.status)),
    )
    expect([...statuses].sort()).toEqual(['AHEAD', 'DUE', 'SOON', 'UNKNOWN'])
    // 07 7.2: 11바0006 엔진오일 도래(날짜) · 56다0003 브레이크패드 임박 · 22사0007 에어컨필터 외부 기록 기준 여유
    expect(parse<ItemStatusResponse>(mockGetItemStatus(6)).items[0]).toMatchObject({ status: 'DUE', dueReason: 'DATE' })
    expect(parse<ItemStatusResponse>(mockGetItemStatus(3)).items[3]).toMatchObject({ status: 'SOON', dueReason: null })
    expect(parse<ItemStatusResponse>(mockGetItemStatus(7)).items[2]).toMatchObject({ status: 'AHEAD', baseRecord: { type: 'EXTERNAL' } })
  })

  it('10 mileage는 요청 값 그대로, 범위 밖은 400 + mileage', () => {
    expect(parse<ItemStatusResponse>(mockGetItemStatus(4, 55000)).inputMileage).toBe(55000)
    const error = parseError(mockGetItemStatus(4, -1))
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.fieldErrors.map((f) => f.field)).toEqual(['mileage'])
    expect(parseError(mockGetItemStatus(4, 2_000_001)).code).toBe('INVALID_INPUT')
    expect(parseError(mockGetItemStatus(4, 1.5)).fieldErrors).toEqual([{ field: 'mileage', reason: '형식이 올바르지 않습니다.' }])
    expect(parseError(mockGetItemStatus(12, -1)).code).toBe('INVALID_INPUT') // 서버처럼 mileage 검사가 404보다 먼저
  })

  it('10 저장 전 미리보기: 차량 4 · 55,000은 08 10 JSON 예시 그대로 — 엔진오일 km 도래(T8), 나머지는 날짜 기준과 같다', () => {
    const data = parse<ItemStatusResponse>(mockGetItemStatus(4, 55000))
    const dateOnly = parse<ItemStatusResponse>(mockGetItemStatus(4))
    expect(data.inputMileage).toBe(55000)
    expect(data.items[0]).toEqual({
      itemId: 1, code: 'ENGINE_OIL', name: '엔진오일',
      status: 'DUE', dueReason: 'KM',
      baseRecord: { date: '2026-09-24', mileage: 45000, type: 'REPLACE' },
      nextDueDate: '2027-03-24', nextDueMileage: 55000,
      lastDecline: null, lastCaution: null,
    })
    expect(data.items.slice(1)).toEqual(dateOnly.items.slice(1))
    // LIMIT: Mock은 km 판정을 하지 않는다 — 예시에 없는 값은 날짜 기준 그대로
    expect(parse<ItemStatusResponse>(mockGetItemStatus(4, 60000)).items[0]).toMatchObject({ status: 'AHEAD', dueReason: null })
    expect(parseError(mockGetItemStatus(12, 55000)).code).toBe('NOT_FOUND') // X6
  })

  it('11 차량 10은 08 예시처럼 최신 방문이 먼저, 방문 3회', () => {
    const data = parse<VisitListResponse>(mockGetVisits(10))
    expect(data).toMatchObject({ page: 0, size: 20, totalElements: 3, totalPages: 1 })
    expect(data.items[0]).toEqual({
      visitKey: '5eed0000-0000-4000-8000-000000000015',
      visitDate: '2026-10-24',
      mileage: null,
      staffName: '김정비',
      // 08 11 예시 + P0-나머지 source·inspectResult (#29). version·edited·staff는 #34가 더한다
      records: [
        { recordId: 16, itemId: 1, itemName: '엔진오일', type: 'REPLACE', date: '2026-10-24', memo: null, source: 'SHOP', inspectResult: null },
      ],
    })
    expect(data.items.map((v) => v.visitDate)).toEqual(['2026-10-24', '2026-08-24', '2023-12-14'])
  })

  it('11 시드처럼 기록 담당은 모두 김정비(mech_a), 메모는 33아0008의 점검 주의 하나만 (07 7.2, 메모 문구는 08 12 예시)', () => {
    const all = Object.keys(FIXTURES[1]).flatMap((id) => parse<VisitListResponse>(mockGetVisits(Number(id))).items)
    expect(new Set(all.map((v) => v.staffName))).toEqual(new Set(['김정비']))
    const records = all.flatMap((v) => v.records)
    expect(records.filter((r) => r.memo !== null).map((r) => r.recordId)).toEqual([11])
  })

  it('11 출처는 외부만 고객 진술, 점검 결과는 점검 기록에만 (08 0.4, 07 3.7)', () => {
    const records = Object.keys(FIXTURES[1]).flatMap((id) => parse<VisitListResponse>(mockGetVisits(Number(id))).items.flatMap((v) => v.records))
    expect(records.every((r) => (r.type === 'EXTERNAL') === (r.source === 'CUSTOMER_STATEMENT'))).toBe(true)
    expect(records.every((r) => r.inspectResult === null || r.type === 'INSPECT')).toBe(true)
    expect(records.find((r) => r.recordId === 11)).toMatchObject({ type: 'INSPECT', inspectResult: 'CAUTION', memo: '앞 타이어 마모' })
  })

  it('11 기록이 없는 차량은 items [] (90마0005)', () => {
    expect(parse<VisitListResponse>(mockGetVisits(5))).toEqual({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
  })

  it('11 쪽 나누기: size만큼 자르고, 쪽 오류는 404보다 먼저 400', () => {
    const first = parse<VisitListResponse>(mockGetVisits(10, { page: 0, size: 2 }))
    const second = parse<VisitListResponse>(mockGetVisits(10, { page: 1, size: 2 }))
    expect(first.items).toHaveLength(2)
    expect(first.totalPages).toBe(2)
    expect(second.items.map((v) => v.visitDate)).toEqual(['2023-12-14'])
    expect(parse<VisitListResponse>(mockGetVisits(10, { size: 100 })).size).toBe(50)
    expect(parseError(mockGetVisits(12, { page: -1 })).code).toBe('INVALID_INPUT')
  })

  it('격리: B 정비소 차량 12·없는 차량은 10·11·12 모두 404 (07 7.4, X2·X5·X6)', () => {
    expect(parseError(mockGetItemStatus(12)).code).toBe('NOT_FOUND')
    expect(parseError(mockGetVisits(12)).code).toBe('NOT_FOUND')
    expect(parseError(mockSaveVisit(12, SAVE)).code).toBe('NOT_FOUND')
    expect(parseError(mockGetItemStatus(999)).status).toBe(404)
  })

  it('12 저장: 08 응답 모양, savedCount는 기록 수', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    expect(parse<VisitSaveResponse>(mockSaveVisit(4, SAVE))).toEqual({
      vehicleId: 4,
      visitKey: '3f1c2b9e-0000-4000-8000-000000000012',
      savedCount: 2,
    })
  })

  it('12 형식 오류(400)는 404보다 먼저: 기록 0개 · 방문일 없음', () => {
    const error = parseError(mockSaveVisit(12, { visitDate: '', records: [] }))
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.fieldErrors.map((f) => f.field)).toEqual(['visitDate', 'records'])
  })

  it('12 P0-나머지: 08 12 P0-나머지 예시(외부·거절·점검 결과·담당 지정)를 받는다', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const remaining: VisitSaveRequest = {
      visitDate: '2026-11-24',
      mileage: 55000,
      records: [
        { itemId: 1, type: 'REPLACE', memo: null },
        { itemId: 4, type: 'DECLINE', memo: '다음 방문 때 하기로 함' },
        { itemId: 3, type: 'EXTERNAL', externalDate: '2026-10-01', externalMileage: null, memo: '다른 곳에서 교체했다고 함' },
        { itemId: 5, type: 'INSPECT', inspectResult: 'CAUTION', memo: '앞 타이어 마모' },
      ],
    }
    expect(parse<VisitSaveResponse>(mockSaveVisit(4, remaining)).savedCount).toBe(4)
    expect(parse<VisitSaveResponse>(mockSaveVisit(4, { ...remaining, mechanicId: 2 })).savedCount).toBe(4) // #62
  })

  it('12 외부 정비일: 없으면 필수, 미래 불가 / 외부 주행거리 범위 (F-MNT-02, 08 12)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const external = (over: Partial<VisitSaveRequest['records'][number]>): VisitSaveRequest => ({
      visitDate: '2026-11-24',
      records: [{ itemId: 3, type: 'EXTERNAL', memo: null, ...over }],
    })
    expect(parseError(mockSaveVisit(4, external({}))).fieldErrors).toEqual([{ field: 'records[0].externalDate', reason: '필수 입력입니다.' }])
    expect(parseError(mockSaveVisit(4, external({ externalDate: '2026-11-25' }))).fieldErrors[0].field).toBe('records[0].externalDate')
    expect(parseError(mockSaveVisit(4, external({ externalDate: '2026-10-01', externalMileage: 2_000_001 }))).fieldErrors[0].field).toBe(
      'records[0].externalMileage',
    )
    expect(parse<VisitSaveResponse>(mockSaveVisit(4, external({ externalDate: '2026-11-24', externalMileage: 0 }))).savedCount).toBe(1)
  })

  it('12 방문일 미래 · 같은 항목 중복 · 쓰지 않는 항목은 400', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    expect(parseError(mockSaveVisit(4, { ...SAVE, visitDate: '2026-11-25' })).fieldErrors[0].field).toBe('visitDate')
    const duplicate = { ...SAVE, records: [SAVE.records[0], { itemId: 1, type: 'INSPECT' as const, memo: null }] }
    expect(parseError(mockSaveVisit(4, duplicate)).fieldErrors).toEqual([{ field: 'records[1].itemId', reason: '같은 항목을 두 번 넣을 수 없습니다.' }])
    expect(parseError(mockSaveVisit(4, { ...SAVE, records: [{ itemId: 99, type: 'REPLACE', memo: null }] })).fieldErrors[0].field).toBe(
      'records[].itemId',
    )
  })

  it('12 차량에 비어 있는 연식·주행거리는 필수 (D-58, 66카0011)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const error = parseError(mockSaveVisit(11, { ...SAVE, mileage: null }))
    expect(error.fieldErrors.map((f) => f.field)).toEqual(['vehicle.modelYear', 'mileage'])
    expect(parse<VisitSaveResponse>(mockSaveVisit(11, { ...SAVE, vehicle: { modelYear: 2020 } })).savedCount).toBe(2)
  })

  it('12 D-58은 교체·점검이 있을 때만: 거절·외부만이면 66카0011도 연식·주행거리 없이 저장 (08 12)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'))
    const body: VisitSaveRequest = {
      visitDate: '2026-11-24',
      mileage: null,
      records: [
        { itemId: 1, type: 'DECLINE', memo: null },
        { itemId: 3, type: 'EXTERNAL', externalDate: '2026-10-01', externalMileage: null, memo: null },
      ],
    }
    expect(parse<VisitSaveResponse>(mockSaveVisit(11, body)).savedCount).toBe(2)
  })

  it('13 항목 6개는 08 예시 그대로', () => {
    const items = parse<ServiceItem[]>(mockGetItems())
    expect(items).toHaveLength(6)
    expect(items[5]).toEqual({ itemId: 6, code: 'BATTERY', name: '배터리', cycleMonths: 36, cycleKm: 60000, active: true, sortOrder: 6 })
  })
})
