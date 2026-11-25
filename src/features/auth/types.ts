// 08 01 POST /api/auth/login · 03 GET /api/me — 필드 이름·타입은 08 표·JSON 예시와 글자까지 같게 둔다.
// P1 계정 상태 필드(passwordChangeRequired·termsAgreementRequired·termsVersion)는 P1 이슈가 더한다.

/** 08 03 role (사장·정비사). 서비스 관리자(02, "ADMIN")는 이 응답에 오지 않는다 */
export type StaffRole = 'OWNER' | 'MECHANIC'

/** 08 01 요청 */
export interface LoginRequest {
  loginId: string
  password: string
}

/** 08 03 응답 data, 01 응답의 staff */
export interface Me {
  staffId: number
  name: string
  role: StaffRole
  shopId: number
  shopName: string
}

/** 08 01 응답 data */
export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  staff: Me
}
