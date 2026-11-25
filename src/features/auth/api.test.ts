import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, onUnauthorized, parseResponse } from '@/shared/api/client'
import { getToken, setToken } from '@/shared/lib/tokenStore'
import { getMe, login } from './api'
import {
  EXPIRED_MESSAGE, LOGIN_FAILED_MESSAGE, LOGIN_NETWORK_MESSAGE,
  emptyFieldErrors, isExpired, loginErrorMessage, loginNotice, returnPath,
} from './loginFlow'
import { mockLogin, mockMe } from './mocks'
import loginOk from './mocks/login.json'
import meOk from './mocks/me.json'

// S-01 로그인 (08 01·03, 09 S-01, D-68): 실제 fetch 없이 확인한다 (fetch·localStorage 대역, client.test.ts와 같은 방식)

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

function errorBody(code: string, message: string) {
  return { success: false, data: null, error: { code, message, fieldErrors: [], details: null } }
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

describe('login (08 01)', () => {
  it('성공하면 토큰을 저장하고 08 응답 그대로 돌려준다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, loginOk))
    const res = await login({ loginId: 'owner_a', password: '1234' })

    expect(res).toEqual(loginOk.data)
    expect(getToken()).toBe(loginOk.data.accessToken)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ loginId: 'owner_a', password: '1234' })
  })

  it('LOGIN_FAILED(401)는 토큰을 저장하지 않고, 로그인 화면으로 보내는 401 알림도 하지 않는다', async () => {
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)
    fetchMock.mockResolvedValue(jsonResponse(401, errorBody('LOGIN_FAILED', '아이디 또는 비밀번호를 확인해 주세요.')))

    const error = await caught(login({ loginId: 'owner_a', password: 'wrong' }))
    unsubscribe()

    expect(error.code).toBe('LOGIN_FAILED')
    expect(getToken()).toBeNull()
    expect(listener).not.toHaveBeenCalled()
  })

  it('응답이 없으면 NETWORK_ERROR, 토큰 없음', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await caught(login({ loginId: 'owner_a', password: '1234' }))
    expect(error.code).toBe(NETWORK_ERROR)
    expect(getToken()).toBeNull()
  })
})

describe('getMe (08 03)', () => {
  it('토큰을 붙여 부르고 08 응답 data를 돌려준다', async () => {
    setToken('token-abc')
    fetchMock.mockResolvedValue(jsonResponse(200, meOk))
    expect(await getMe()).toEqual(meOk.data)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/me')
    expect(init.headers.Authorization).toBe('Bearer token-abc')
  })

  it('401 AUTH_REQUIRED면 토큰을 지우고 로그인 화면으로 보내도록 알린다', async () => {
    setToken('expired-token')
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)
    fetchMock.mockResolvedValue(jsonResponse(401, errorBody('AUTH_REQUIRED', '로그인이 필요합니다.')))

    await caught(getMe())
    unsubscribe()

    expect(getToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('loginFlow (09 S-01)', () => {
  it('실패 문구: 아이디·비밀번호 문제는 하나로, 응답 없음은 연결 확인 문구, 그 밖은 서버 문구', () => {
    expect(loginErrorMessage(new ApiError(401, 'LOGIN_FAILED', '서버 문구'))).toBe(LOGIN_FAILED_MESSAGE)
    expect(loginErrorMessage(new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.'))).toBe(LOGIN_FAILED_MESSAGE)
    expect(loginErrorMessage(new ApiError(0, NETWORK_ERROR, '서버에 연결하지 못했습니다.'))).toBe(LOGIN_NETWORK_MESSAGE)
    expect(loginErrorMessage(new ApiError(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.'))).toBe('일시적인 오류가 발생했습니다.')
    expect(loginErrorMessage(null)).toContain('일시적인 오류')
  })

  it('빈 칸: 칸별 문구, 로그인 칸에는 신규 아이디·비밀번호 규칙을 적용하지 않는다(1234 허용)', () => {
    expect(emptyFieldErrors('', '')).toEqual({ loginId: '아이디를 입력해 주세요.', password: '비밀번호를 입력해 주세요.' })
    expect(emptyFieldErrors('  ', '1234')).toEqual({ loginId: '아이디를 입력해 주세요.' })
    expect(emptyFieldErrors('owner_a', '1234')).toEqual({})
  })

  it('안내: 만료 → 로그아웃 → 이미 로그인됨 순으로 하나', () => {
    expect(loginNotice({ reason: 'expired' }, false)).toEqual({ kind: 'expired', message: EXPIRED_MESSAGE })
    expect(loginNotice({ reason: 'logout' }, false)?.message).toBe('로그아웃했습니다.')
    expect(loginNotice({}, true)?.kind).toBe('info')
    expect(loginNotice(null, false)).toBeNull()
  })

  it('돌아갈 경로: 앱 안 경로만, 로그인 화면 자신과 외부 주소는 제외', () => {
    expect(returnPath({ from: '/customers/3?tab=car' }, '/login')).toBe('/customers/3?tab=car')
    expect(returnPath({ from: '/login' }, '/login')).toBeNull()
    expect(returnPath({ from: '/login?x=1' }, '/login')).toBeNull()
    expect(returnPath({ from: '//evil.example' }, '/login')).toBeNull()
    expect(returnPath({ from: 'https://evil.example' }, '/login')).toBeNull()
    expect(returnPath({}, '/login')).toBeNull()
    expect(returnPath(null, '/login')).toBeNull()
  })

  it('401로 이동해 왔으면(reason=expired) 다시 로그인 안내', () => {
    expect(isExpired({ reason: 'expired' })).toBe(true)
    expect(isExpired({})).toBe(false)
    expect(EXPIRED_MESSAGE).toContain('다시 로그인해 주세요.')
  })
})

describe('mocks (CONVENTIONS 7장 Mock) — client의 같은 해석을 거친다', () => {
  it('시드 계정 + 1234는 성공, 그 계정으로 03도 돌려준다', () => {
    const res = parseResponse<{ staff: { name: string; shopName: string } }>(
      ...Object.values(mockLogin({ loginId: 'mech_a', password: '1234' })) as [number, unknown],
    )
    expect(res.staff).toMatchObject({ name: '김정비', shopName: '차곡카센터' })
    const me = mockMe()
    expect(parseResponse<{ name: string }>(me.status, me.body).name).toBe('김정비')
  })

  it('없는 아이디·틀린 비밀번호는 같은 LOGIN_FAILED, 빈 칸은 INVALID_INPUT', () => {
    const wrongPassword = mockLogin({ loginId: 'owner_a', password: 'x' })
    const unknownId = mockLogin({ loginId: 'nobody', password: '1234' })
    expect(wrongPassword).toEqual(unknownId)
    expect(wrongPassword.status).toBe(401)
    expect((wrongPassword.body as { error: { code: string } }).error.code).toBe('LOGIN_FAILED')
    expect((mockLogin({ loginId: '', password: '' }).body as { error: { code: string } }).error.code).toBe('INVALID_INPUT')
  })
})
