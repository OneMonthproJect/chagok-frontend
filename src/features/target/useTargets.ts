import { useCallback, useEffect, useRef, useState } from 'react'
import { getTargets } from './api'
import type { TargetListResponse } from './types'

export type TargetsState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: TargetListResponse }
  | { kind: 'error'; error: unknown }

// 재점검 대상 목록 (08 14). 실패해도 자동으로 다시 부르지 않는다(05 POL-125) — reload()는 사람이 누를 때.
// 화면을 떠난 뒤 늦게 온 응답은 버린다.
export function useTargets(): { state: TargetsState; reload: () => void } {
  const [state, setState] = useState<TargetsState>({ kind: 'loading' })
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestRef.current
    setState({ kind: 'loading' })
    getTargets()
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
