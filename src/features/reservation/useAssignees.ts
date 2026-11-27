// 08 36 담당 후보를 화면에서 쓰는 훅 (S-08 담당 선택 #62, M-02 담당 선택 #37). 화면에 들어올 때 한 번 부른다.
// 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125).

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getAssignees } from './api'
import type { AssigneeCandidate } from './types'

export interface AssigneesState {
  status: 'loading' | 'ready' | 'error'
  data: AssigneeCandidate[] | null
  error: ApiError | null
  reload: () => void
}

export function useAssignees(): AssigneesState {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Omit<AssigneesState, 'reload'>>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let current = true
    setResult((prev) => ({ status: 'loading', data: prev.data, error: null }))
    getAssignees().then(
      (data) => {
        if (current) setResult({ status: 'ready', data: data.items, error: null })
      },
      (error: ApiError) => {
        if (current) setResult({ status: 'error', data: null, error })
      },
    )
    return () => {
      current = false
    }
  }, [reloadKey])

  return { ...result, reload: () => setReloadKey((key) => key + 1) }
}
