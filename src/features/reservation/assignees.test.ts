import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, parseResponse } from '@/shared/api/client'
import { getAssignees } from './api'
import { mockGetAssignees } from './mocks/assignees'
import assigneesOk from './mocks/assignees.json'
import type { AssigneeListResponse } from './types'

// 08 36 GET /api/staff/assignees (P0-나머지, #62): 호출 경로·응답 모양, Mock = 08 7.1 36 JSON 예시.
// 실제 fetch 없이 확인한다(fetch 대역). Mock은 client와 같은 해석(parseResponse)을 거친다.

// fixture가 types.ts(08) 모양과 맞는지 컴파일 때(tsc) 확인한다
const FIXTURE: AssigneeListResponse = assigneesOk.data as AssigneeListResponse

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('API 36 담당 후보', () => {
  it('GET /api/staff/assignees (쿼리 없음), data 그대로', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, assigneesOk))
    await expect(getAssignees()).resolves.toEqual(FIXTURE)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/staff/assignees')
    expect(init.method ?? 'GET').toBe('GET')
  })

  it('실패는 ApiError로 던지고 다시 부르지 않는다 (POL-125)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(500, { success: false, data: null, error: { code: 'INTERNAL_ERROR', message: '일시적인 오류가 발생했습니다.', fieldErrors: [], details: null } }),
    )
    const error = await getAssignees().catch((e: ApiError) => e)
    expect((error as ApiError).code).toBe('INTERNAL_ERROR')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Mock은 08 36 예시 그대로: staffId 오름차순, 사장·정비사, colorIndex', () => {
    const response = mockGetAssignees()
    expect(response.status).toBe(200)
    expect(parseResponse<AssigneeListResponse>(response.status, response.body)).toEqual({
      items: [
        { staffId: 1, name: '박사장', role: 'OWNER', colorIndex: 0 },
        { staffId: 2, name: '김정비', role: 'MECHANIC', colorIndex: 1 },
      ],
    })
  })
})
