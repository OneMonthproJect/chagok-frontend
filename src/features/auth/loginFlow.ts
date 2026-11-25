// S-01 로그인 화면의 판단 규칙 (09 S-01, D-68, 디자인 v3.0 S-01 상태 01~07). 화면 없이 테스트할 수 있게 순수 함수로 둔다.

import { DEFAULT_MESSAGES, NETWORK_ERROR } from '@/shared/api/client'

/** 로그인 실패 문구 하나 — 실패 이유를 나누지 않는다 (09 S-01) */
export const LOGIN_FAILED_MESSAGE = '아이디 또는 비밀번호를 확인해 주세요.'

/** 응답 없음 (디자인 S-01 상태 05). 자동으로 다시 보내지 않는다 (05 POL-125) */
export const LOGIN_NETWORK_MESSAGE = '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'

/** 빈 칸으로 로그인을 누르면 칸 아래에 (디자인 S-01 상태 02) */
export const EMPTY_LOGIN_ID_MESSAGE = '아이디를 입력해 주세요.'
export const EMPTY_PASSWORD_MESSAGE = '비밀번호를 입력해 주세요.'

/** 로그인 화면 위 안내 (디자인 S-01 상태 06·07, D-68) */
export const EXPIRED_MESSAGE = '로그인이 만료되었습니다. 다시 로그인해 주세요.'
export const LOGGED_OUT_MESSAGE = '로그아웃했습니다.'

/** 로그인 화면이 받는 router state: 로그인 가드·401 처리·로그아웃이 넘긴다 */
export interface LoginLocationState {
  from?: unknown
  reason?: unknown
}

export interface LoginNotice {
  kind: 'expired' | 'logout' | 'info'
  message: string
}

/**
 * 로그인 뒤 돌아갈 앱 안 경로. 없거나 쓸 수 없으면 null.
 * 앱 안 경로('/'로 시작, '//'로 시작하지 않음)만 받고, 로그인 화면 자신은 제외한다.
 */
export function returnPath(state: LoginLocationState | null | undefined, loginPath: string): string | null {
  const from = state?.from
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null
  const pathname = from.split(/[?#]/)[0]
  return pathname === loginPath ? null : from
}

export function isExpired(state: LoginLocationState | null | undefined): boolean {
  return state?.reason === 'expired'
}

/** 로그인 화면 위 안내: 401 만료 → 로그아웃 → (이미 로그인됨) 순으로 하나만 */
export function loginNotice(state: LoginLocationState | null | undefined, loggedIn: boolean): LoginNotice | null {
  if (state?.reason === 'expired') return { kind: 'expired', message: EXPIRED_MESSAGE }
  if (state?.reason === 'logout') return { kind: 'logout', message: LOGGED_OUT_MESSAGE }
  if (loggedIn) return { kind: 'info', message: '이미 로그인되어 있습니다.' }
  return null
}

/** 빈 칸 검사. 로그인 칸에는 신규 아이디·비밀번호 규칙을 적용하지 않는다 (08 01, 시연 1234) */
export function emptyFieldErrors(loginId: string, password: string): { loginId?: string; password?: string } {
  const errors: { loginId?: string; password?: string } = {}
  if (loginId.trim() === '') errors.loginId = EMPTY_LOGIN_ID_MESSAGE
  if (password === '') errors.password = EMPTY_PASSWORD_MESSAGE
  return errors
}

/**
 * 실패 문구. 아이디·비밀번호 문제(LOGIN_FAILED, 입력 검증 INVALID_INPUT)는 문구 하나로,
 * 응답 없음은 연결 확인 문구로, 그 밖의 서버 오류는 client가 정한 문구(05 POL-128)로 보인다.
 */
export function loginErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  if (code === 'LOGIN_FAILED' || code === 'INVALID_INPUT') return LOGIN_FAILED_MESSAGE
  if (code === NETWORK_ERROR) return LOGIN_NETWORK_MESSAGE
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message ? message : DEFAULT_MESSAGES.INTERNAL_ERROR
}
