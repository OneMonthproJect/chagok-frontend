// features/auth의 API 호출 (08 01·03). 요청은 shared/api/client를 거친다(fetch 직접 호출 없음).
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import { clearToken, setToken } from '@/shared/lib/tokenStore'
import type { LoginRequest, LoginResponse, Me, StaffRole } from './types'

/** 화면에 보이는 역할 이름 (06·09 0장 머리 영역) */
export const ROLE_LABEL: Record<StaffRole, string> = { OWNER: '사장', MECHANIC: '정비사' }

/** 로그아웃은 화면에서 토큰을 지우는 것뿐이다 (05 POL-12, 서버 호출 없음) */
export function logout(): void {
  clearToken()
}

/** 08 01. 성공하면 토큰을 저장하고 응답을 돌려준다. 실패는 ApiError(LOGIN_FAILED 등) */
export async function login(body: LoginRequest): Promise<LoginResponse> {
  const data = await request<LoginResponse>('POST', '/api/auth/login', {
    body,
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockLogin(body)) : undefined,
  })
  setToken(data.accessToken)
  return data
}

/** 08 03. 로그인한 계정·정비소 (공통 머리 등에서 사용) */
export function getMe(): Promise<Me> {
  return request<Me>('GET', '/api/me', {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockMe()) : undefined,
  })
}
