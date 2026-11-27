// 08 38 정비 기록 수정 이력을 화면에서 쓰는 훅 (S-07 수정 이력 패널, #34). 열 때 한 번 부른다.
// 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125). 기록이 바뀌면 늦게 온 이전 응답은 버린다.

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getRecordRevisions } from './api'
import type { RecordRevision } from './types'

export type RecordRevisionsState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: RecordRevision[] }
  | { kind: 'error'; error: ApiError }

export function useRecordRevisions(recordId: number): { state: RecordRevisionsState; reload: () => void } {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<RecordRevisionsState>({ kind: 'loading' })

  useEffect(() => {
    let current = true
    setState({ kind: 'loading' })
    getRecordRevisions(recordId).then(
      (data) => {
        if (current) setState({ kind: 'ok', items: data.items })
      },
      (error: ApiError) => {
        if (current) setState({ kind: 'error', error })
      },
    )
    return () => {
      current = false
    }
  }, [recordId, reloadKey])

  return { state, reload: () => setReloadKey((key) => key + 1) }
}
