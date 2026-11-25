// 401로 로그인 화면에 보낼 때 넘기는 router state (D-68). UnauthorizedRedirect가 쓰고, 화면 없이 테스트한다.

export interface CurrentLocation {
  pathname: string
  search?: string
}

/** reason은 항상 'expired'. from은 401이 난 화면(쿼리 포함). 로그인 화면에서 난 401이면 from을 넘기지 않는다 */
export function unauthorizedState(location: CurrentLocation, loginPath: string): { reason: 'expired'; from?: string } {
  if (location.pathname === loginPath) return { reason: 'expired' }
  return { reason: 'expired', from: location.pathname + (location.search ?? '') }
}
