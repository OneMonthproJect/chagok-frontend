// 로그인 토큰을 두는 유일한 곳. 화면·client는 이 함수들만 쓴다.
// 저장 위치는 localStorage로 확정(D-68, chagok-docs#79): 새로 고침·다른 탭에서도 로그인이 유지된다. 바꿀 때는 이 파일 안에서만.
// 로그아웃은 화면에서 토큰을 지우는 것뿐이다 (05 POL-12, 서버 강제 로그아웃은 P2).

const KEY = 'chagok.accessToken'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // 저장소를 막아 둔 브라우저: 로그인 상태를 유지하지 못할 뿐 앱은 동작한다
  }
}

export function getToken(): string | null {
  return storage()?.getItem(KEY) ?? null
}

export function setToken(token: string): void {
  storage()?.setItem(KEY, token)
}

export function clearToken(): void {
  storage()?.removeItem(KEY)
}
