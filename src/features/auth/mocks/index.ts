// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 01·03의 사본이며 계약의 기준은 08이다.
// 값은 07 7.1 시드 계정(비밀번호 1234 — 시연용 가상 계정)과 08 JSON 예시. 실제 개인정보 없음.
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { MockResponse } from '@/shared/api/client'
import type { LoginRequest, Me } from '../types'
import loginOk from './login.json'
import meOk from './me.json'

// 07 7.1 사장·정비사 계정 (A 정비소 2명, B 정비소 1명)
const ACCOUNTS: Record<string, Me> = {
  owner_a: { staffId: 1, name: '박사장', role: 'OWNER', shopId: 1, shopName: '차곡카센터' },
  mech_a: { staffId: 2, name: '김정비', role: 'MECHANIC', shopId: 1, shopName: '차곡카센터' },
  owner_b: { staffId: 3, name: '최사장', role: 'OWNER', shopId: 2, shopName: '바른카센터' },
}
const DEMO_PASSWORD = '1234'

// 마지막으로 로그인한 Mock 계정 (메모리에만, 브라우저 저장소에 두지 않음)
let current: Me = meOk.data as Me

function error(status: number, code: string, message: string, fieldErrors: unknown[] = []): MockResponse {
  return { status, body: { success: false, data: null, error: { code, message, fieldErrors, details: null } } }
}

/** 08 01 */
export function mockLogin(body: LoginRequest): MockResponse {
  const fieldErrors = []
  if (!body.loginId) fieldErrors.push({ field: 'loginId', reason: '필수 값입니다.' })
  if (!body.password) fieldErrors.push({ field: 'password', reason: '필수 값입니다.' })
  if (fieldErrors.length > 0) return error(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', fieldErrors)

  const staff = ACCOUNTS[body.loginId]
  if (!staff || body.password !== DEMO_PASSWORD) {
    // 아이디 없음·비밀번호 틀림은 같은 응답 (08 0.3)
    return error(401, 'LOGIN_FAILED', '아이디 또는 비밀번호를 확인해 주세요.')
  }
  current = staff
  return { status: 200, body: { ...loginOk, data: { ...loginOk.data, staff } } }
}

/** 08 03 */
export function mockMe(): MockResponse {
  return { status: 200, body: { ...meOk, data: current } }
}
