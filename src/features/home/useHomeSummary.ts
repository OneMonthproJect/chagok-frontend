import { useCallback, useEffect, useRef, useState } from 'react'
import { getHome } from './api'
import type { HomeSummary } from './types'

export type HomeSummaryState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HomeSummary }
  | { kind: 'error'; error: unknown }

// 홈 요약 숫자 (08 04). 실패해도 자동으로 다시 부르지 않는다(05 POL-125) — reload()는 사람이 누르거나 예약이 바뀐 뒤 화면이 부른다.
// 다시 부르는 동안 이전 숫자를 그대로 둔다(숫자가 깜박이지 않게). 화면을 떠난 뒤 늦게 온 응답은 버린다.
export function useHomeSummary(): { state: HomeSummaryState; reload: () => void } {
  const [state, setState] = useState<HomeSummaryState>({ kind: 'loading' })
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestRef.current
    getHome()
      .then((data) => { if (requestRef.current === requestId) setState({ kind: 'ok', data }) })
      .catch((error) => { if (requestRef.current === requestId) setState({ kind: 'error', error }) })
  }, [])

  useEffect(() => {
    const ref = requestRef
    load()
    return () => { ref.current++ }
  }, [load])

  return { state, reload: load }
}
