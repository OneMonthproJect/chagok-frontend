import { useEffect, useState } from 'react'
import { getMe } from './api'
import type { Me } from './types'

// 08 03 GET /api/me — 공통 머리(정비소명·이름·역할)가 쓴다 (chagok-frontend#17).
// 실패해도 화면은 계속 쓸 수 있다: 401이면 client가 로그인 화면으로 보내고, 그 밖의 오류는 머리에 이름만 비어 보인다.
export function useMe(): { me: Me | null; error: unknown } {
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let alive = true
    getMe()
      .then((data) => { if (alive) setMe(data) })
      .catch((e) => { if (alive) setError(e) })
    return () => { alive = false }
  }, [])

  return { me, error }
}
