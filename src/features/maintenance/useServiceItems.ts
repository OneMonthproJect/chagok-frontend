// 08 13 정비 항목을 화면에서 쓰는 훅 (S-08 항목 기록). 화면에 들어올 때 한 번 부른다.
// 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125).

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getItems } from './api'
import type { ServiceItem } from './types'

export interface ServiceItemsState {
  status: 'loading' | 'ready' | 'error'
  data: ServiceItem[] | null
  error: ApiError | null
  reload: () => void
}

export function useServiceItems(): ServiceItemsState {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Omit<ServiceItemsState, 'reload'>>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let current = true
    setResult((prev) => ({ status: 'loading', data: prev.data, error: null }))
    getItems().then(
      (data) => {
        if (current) setResult({ status: 'ready', data, error: null })
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
