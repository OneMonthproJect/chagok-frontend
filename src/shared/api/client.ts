// 모든 HTTP 요청은 이 파일에서만 보낸다 (CONVENTIONS 7장). 화면은 features/*/api.ts를 거친다.
// 응답 해석: 08 0.2 공통 응답 { success, data, error }. 오류 처리: 05 POL-120~129, 08 0.2 표.
// - 성공이면 data를 돌려주고, 실패면 ApiError를 던진다. 화면은 ApiError.code로 갈라 처리한다.
// - 401 AUTH_REQUIRED: 토큰을 지우고 onUnauthorized 구독자(app의 로그인 가드)에게 알린다. 라우터는 모른다.
// - 자동으로 다시 보내지 않는다 (POL-125). 재시도는 사람이 한다.
// - 응답 없음·시간 초과(REQUEST_TIMEOUT_MS)·본문 읽기 실패는 ApiError{status 0, NETWORK_ERROR} (POL-125, #14).
// - 일시 문자열("2026-11-24T10:00:00")은 바꾸지 않고 그대로 넘긴다 (08 0.1).
// - Mock(CONVENTIONS 7장 「Mock」): 판정은 isMockEnabled 한 곳. 실제 응답과 Mock 응답이 같은 해석(parseResponse)을 거친다.
//   Mock 응답은 호출하는 features/*/api.ts가 넘긴다(shared는 features를 import하지 않음).

import { clearToken, getToken } from '@/shared/lib/tokenStore'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/** 08 0.2 error.fieldErrors 한 줄 */
export interface FieldError {
  field: string
  reason: string
}

/** 08 0.2 공통 응답 */
export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    fieldErrors: FieldError[]
    details: Record<string, unknown> | null
  } | null
}

/** 08 0.3 코드 + 네트워크 오류(응답 없음, POL-125) */
export type ErrorCode = string
export const NETWORK_ERROR = 'NETWORK_ERROR'

/** 응답 본문에 message가 없을 때만 쓰는 기본 문구 (05 POL-121~129) */
export const DEFAULT_MESSAGES: Record<string, string> = {
  INVALID_INPUT: '입력값을 확인해 주세요.',
  AUTH_REQUIRED: '로그인이 필요합니다. 다시 로그인해 주세요.',
  FORBIDDEN: '권한이 없습니다.',
  NOT_FOUND: '찾을 수 없습니다.',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다. 입력한 내용은 그대로 있습니다.',
  [NETWORK_ERROR]: '서버에 연결하지 못했습니다. 저장됐는지 목록에서 확인한 뒤 다시 시도해 주세요.',
}

/** 본문이 08 모양이 아닐 때 HTTP 상태로 정하는 코드 */
const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'INVALID_INPUT',
  401: 'AUTH_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
}

export class ApiError extends Error {
  readonly status: number // 응답 없음(네트워크 오류)은 0
  readonly code: ErrorCode
  readonly fieldErrors: FieldError[] // INVALID_INPUT일 때만 채워짐, 그 밖에는 []
  readonly details: Record<string, unknown> | null // 예: RESERVATION_ACTIVE_EXISTS의 { reservationId }

  constructor(status: number, code: ErrorCode, message: string, fieldErrors: FieldError[] = [], details: Record<string, unknown> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

// ---- 401 알림 (app의 로그인 가드가 구독) ----
type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** 401 AUTH_REQUIRED가 오면 부른다. 반환값을 부르면 구독을 끊는다. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

// ---- Mock 판정 (한 곳) ----
interface MockEnv {
  DEV: boolean
  VITE_USE_MOCK?: string
}

/** 판정 규칙: 개발 서버에서 VITE_USE_MOCK=true일 때만 켜진다. 운영 빌드(vite build)는 DEV가 false라 항상 꺼진다. */
export function isMockEnabled(env: MockEnv): boolean {
  return env.DEV === true && env.VITE_USE_MOCK === 'true'
}

/**
 * 이 앱에서 Mock을 쓰는지. `import.meta.env.DEV`는 빌드 때 상수로 바뀌므로 운영 빌드에서는 false로 고정된다.
 * features/<도메인>/api.ts는 `mock: MOCK_ENABLED ? () => import('./mocks').then(...) : undefined`처럼 써서
 * 운영 번들에 mocks/가 들어가지 않게 한다.
 */
export const MOCK_ENABLED: boolean = isMockEnabled({
  DEV: import.meta.env.DEV,
  VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK,
})

/** features/<도메인>/api.ts가 넘기는 Mock 응답: HTTP 상태와 08 0.2 본문 */
export interface MockResponse {
  status: number
  body: unknown
}

export interface RequestOptions {
  body?: unknown
  /** 개발용 Mock 응답. MOCK_ENABLED일 때만 쓰인다 (CONVENTIONS 7장) */
  mock?: () => MockResponse | Promise<MockResponse>
}

interface RequestConfig {
  /** 테스트에서만 바꾼다. 기본은 MOCK_ENABLED */
  mockEnabled?: boolean
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/** 응답 하나를 해석한다. 실제 응답과 Mock 응답이 모두 이 함수를 거친다. */
export function parseResponse<T>(status: number, body: unknown): T {
  const envelope = isEnvelope(body) ? body : null

  if (status >= 200 && status < 300 && envelope?.success === true) {
    return envelope.data as T
  }

  const error = envelope?.error ?? null
  const code: ErrorCode = error?.code ?? CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR'
  const message = error?.message || DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.INTERNAL_ERROR
  const fieldErrors = Array.isArray(error?.fieldErrors) ? error.fieldErrors : []
  const details = error?.details ?? null

  // 토큰 없음·만료·위조만 로그인 화면으로. LOGIN_FAILED(401)는 로그인 화면이 직접 보여 준다 (08 0.3)
  if (status === 401 && code === 'AUTH_REQUIRED') {
    clearToken()
    unauthorizedListeners.forEach((listener) => listener())
  }

  throw new ApiError(status, code, message, fieldErrors, details)
}

/**
 * 08 API 하나를 부른다. 성공이면 data, 실패면 ApiError.
 * 예: request<Customer>('GET', '/api/customers/1', { mock: () => mockCustomer(1) })
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  config: RequestConfig = {},
): Promise<T> {
  const mockEnabled = config.mockEnabled ?? MOCK_ENABLED
  if (options.mock && mockEnabled) {
    const { status, body } = await options.mock()
    return parseResponse<T>(status, body)
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const { status, body } = await send(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return parseResponse<T>(status, body)
}

/** 서버 확인용 (`/actuator/health`는 08 공통 응답이 아니라 { status }만 준다). 인증 없이 부른다. */
export async function getServerHealth(): Promise<string> {
  const { status, body } = await send(`${BASE_URL}/actuator/health`, { headers: { Accept: 'application/json' } })
  return (body as { status?: string } | null)?.status ?? `HTTP ${status}`
}

/**
 * 요청 하나의 시간 초과(밀리초). 응답 본문을 다 읽을 때까지를 센다.
 * ❓ 문서(05·08)에 정해진 값이 없어 15초를 제안값으로 둔다 — chagok-frontend#14 PR에서 확인.
 */
export const REQUEST_TIMEOUT_MS = 15_000

/**
 * fetch 한 번 + 본문 읽기. 응답 없음·시간 초과·본문 읽기 실패는 모두 ApiError{0, NETWORK_ERROR}로 끝낸다 (POL-125).
 * 서버가 받았는지 알 수 없으므로 다시 보내지 않는다. 저장됐는지는 사람이 목록·이력에서 확인한다.
 */
async function send(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return { status: response.status, body: await readJson(response) }
  } catch {
    throw new ApiError(0, NETWORK_ERROR, DEFAULT_MESSAGES[NETWORK_ERROR])
  } finally {
    clearTimeout(timer)
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null // JSON이 아닌 응답(프록시 오류 페이지 등): 상태 코드로만 판단
  }
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && 'success' in body
}
