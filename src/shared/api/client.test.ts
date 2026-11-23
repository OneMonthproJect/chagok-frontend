import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, isMockEnabled, onUnauthorized, parseResponse, request } from '@/shared/api/client'
import { getToken, setToken } from '@/shared/lib/tokenStore'

// 08 0.2 공통 응답과 05 POL-120~129 처리를 실제 fetch 없이 확인한다 (fetch·localStorage 대역)

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function errorBody(code: string, message: string, fieldErrors: unknown[] = [], details: unknown = null) {
  return { success: false, data: null, error: { code, message, fieldErrors, details } }
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    return e as ApiError
  }
  throw new Error('should have thrown')
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request — 성공', () => {
  it('success면 data를 그대로 돌려주고, 일시 문자열을 바꾸지 않는다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { reservedAt: '2026-11-24T10:00:00', date: '2026-11-24' }, error: null }))
    const data = await request<{ reservedAt: string; date: string }>('GET', '/api/home')
    expect(data).toEqual({ reservedAt: '2026-11-24T10:00:00', date: '2026-11-24' })
  })

  it('토큰이 있으면 Authorization: Bearer를 붙이고, 본문은 JSON으로 보낸다', async () => {
    setToken('token-abc')
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { customerId: 5 }, error: null }))
    await request('POST', '/api/customers', { body: { name: '정우성' } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/customers')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-abc')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: '정우성' })
  })

  it('토큰이 없으면 Authorization을 붙이지 않는다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: null, error: null }))
    await request('GET', '/api/me')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })
})

describe('request — 오류 (05 POL-121~129, 08 0.2)', () => {
  it('400 INVALID_INPUT: fieldErrors를 전달한다 (POL-121)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, errorBody('INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'reservedAt', reason: '30분 단위로 입력해 주세요.' }])))
    const e = await caught(request('POST', '/api/reservations', { body: {} }))
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(400)
    expect(e.code).toBe('INVALID_INPUT')
    expect(e.fieldErrors).toEqual([{ field: 'reservedAt', reason: '30분 단위로 입력해 주세요.' }])
  })

  it('401 AUTH_REQUIRED: 토큰을 지우고 로그인 이동 신호를 보낸다 (POL-126)', async () => {
    setToken('expired-token')
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)
    fetchMock.mockResolvedValue(jsonResponse(401, errorBody('AUTH_REQUIRED', '로그인이 필요합니다.')))
    const e = await caught(request('GET', '/api/home'))
    unsubscribe()
    expect(e.code).toBe('AUTH_REQUIRED')
    expect(getToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('401 LOGIN_FAILED: 토큰·이동 신호를 건드리지 않고 화면에 넘긴다 (08 0.3)', async () => {
    setToken('keep')
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)
    fetchMock.mockResolvedValue(jsonResponse(401, errorBody('LOGIN_FAILED', '아이디 또는 비밀번호를 확인해 주세요.')))
    const e = await caught(request('POST', '/api/auth/login', { body: {} }))
    unsubscribe()
    expect(e.code).toBe('LOGIN_FAILED')
    expect(getToken()).toBe('keep')
    expect(listener).not.toHaveBeenCalled()
  })

  it('403 FORBIDDEN: 권한 안내로 전달 (POL-127)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, errorBody('FORBIDDEN', '권한이 없습니다.')))
    const e = await caught(request('GET', '/api/customers'))
    expect([e.status, e.code, e.message]).toEqual([403, 'FORBIDDEN', '권한이 없습니다.'])
  })

  it('404 NOT_FOUND: 찾을 수 없음으로 전달 (POL-128)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, errorBody('NOT_FOUND', '찾을 수 없습니다.')))
    const e = await caught(request('GET', '/api/customers/11'))
    expect([e.status, e.code]).toEqual([404, 'NOT_FOUND'])
  })

  it('409: 코드와 details(reservationId)를 그대로 전달 (POL-123)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, errorBody('RESERVATION_ACTIVE_EXISTS', '이미 예약이 있습니다.', [], { reservationId: 3 })))
    const e = await caught(request('POST', '/api/reservations', { body: {} }))
    expect(e.code).toBe('RESERVATION_ACTIVE_EXISTS')
    expect(e.details).toEqual({ reservationId: 3 })
    expect(e.fieldErrors).toEqual([])
  })

  it('500 INTERNAL_ERROR: 공통 오류로 전달 (POL-129)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, errorBody('INTERNAL_ERROR', '일시적인 오류가 발생했습니다.')))
    const e = await caught(request('POST', '/api/vehicles/1/visits', { body: {} }))
    expect([e.status, e.code]).toEqual([500, 'INTERNAL_ERROR'])
  })

  it('JSON이 아닌 오류 응답(프록시 502 등)은 상태로 판단하고 기본 문구를 쓴다', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))
    const e = await caught(request('GET', '/api/home'))
    expect([e.status, e.code]).toEqual([502, 'INTERNAL_ERROR'])
    expect(e.message.length).toBeGreaterThan(0)
  })

  it('네트워크 오류: NETWORK_ERROR(status 0)로 구분하고 다시 보내지 않는다 (POL-125)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const e = await caught(request('POST', '/api/reservations', { body: {} }))
    expect([e.status, e.code]).toEqual([0, NETWORK_ERROR])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('오류 응답에도 다시 보내지 않는다 (fetch 1회)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, errorBody('INTERNAL_ERROR', '오류')))
    await caught(request('POST', '/api/reservations', { body: {} }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('Mock 전환 (CONVENTIONS 7장 「Mock」)', () => {
  it('판정: 개발 모드 + VITE_USE_MOCK=true일 때만 켜진다', () => {
    expect(isMockEnabled({ DEV: true, VITE_USE_MOCK: 'true' })).toBe(true)
    expect(isMockEnabled({ DEV: false, VITE_USE_MOCK: 'true' })).toBe(false) // 운영 빌드
    expect(isMockEnabled({ DEV: true, VITE_USE_MOCK: 'false' })).toBe(false)
    expect(isMockEnabled({ DEV: true })).toBe(false)
  })

  it('켜지면 fetch 대신 Mock 응답을 같은 해석으로 처리한다 (오류도 같은 ApiError)', async () => {
    const mock = () => ({ status: 404, body: errorBody('NOT_FOUND', '찾을 수 없습니다.') })
    const e = await caught(request('GET', '/api/customers/11', { mock }, { mockEnabled: true }))
    expect(e.code).toBe('NOT_FOUND')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('꺼져 있으면 mock이 있어도 실제 fetch를 쓴다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: 1, error: null }))
    const mock = vi.fn(() => ({ status: 200, body: { success: true, data: 2, error: null } }))
    const data = await request<number>('GET', '/api/x', { mock }, { mockEnabled: false })
    expect(data).toBe(1)
    expect(mock).not.toHaveBeenCalled()
  })

  it('테스트 환경(vitest)의 기본 판정은 VITE_USE_MOCK이 없으므로 꺼져 있다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: 'real', error: null }))
    const data = await request<string>('GET', '/api/x', { mock: () => ({ status: 200, body: { success: true, data: 'mock', error: null } }) })
    expect(data).toBe('real')
  })
})

describe('parseResponse', () => {
  it('2xx라도 success가 true가 아니면 오류로 본다', () => {
    expect(() => parseResponse(200, { success: false, data: null, error: { code: 'CONFLICT', message: '중복', fieldErrors: [], details: null } }))
      .toThrowError(ApiError)
  })
})
