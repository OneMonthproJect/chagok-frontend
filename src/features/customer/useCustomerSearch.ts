// 08 05 검색을 화면에서 쓰는 훅 (S-05 목록, VehiclePicker). 검색어 입력이 멈춘 뒤 0.3초에 부르고,
// 늦게 온 이전 응답은 버린다(마지막 요청의 결과만 보인다). 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125).

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { searchCustomers } from './api'
import { SEARCH_DELAY_MS } from './searchFlow'
import type { CustomerSearchResponse } from './types'

export interface CustomerSearchState {
  status: 'loading' | 'ready' | 'error'
  data: CustomerSearchResponse | null
  error: ApiError | null
  /** 지금 화면에 보이는 결과의 검색어 (입력 중인 값과 다를 수 있음) */
  query: string
  reload: () => void
}

/** 입력이 delay 동안 멈춘 뒤의 값 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useCustomerSearch(query: string, page = 0, size?: number): CustomerSearchState {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DELAY_MS)
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Omit<CustomerSearchState, 'reload'>>({
    status: 'loading',
    data: null,
    error: null,
    query: debouncedQuery,
  })

  useEffect(() => {
    let current = true
    setResult((prev) => ({ ...prev, status: 'loading', error: null }))
    searchCustomers({ q: debouncedQuery, page, size }).then(
      (data) => {
        if (current) setResult({ status: 'ready', data, error: null, query: debouncedQuery })
      },
      (error: ApiError) => {
        if (current) setResult({ status: 'error', data: null, error, query: debouncedQuery })
      },
    )
    return () => {
      current = false
    }
  }, [debouncedQuery, page, size, reloadKey])

  return { ...result, reload: () => setReloadKey((key) => key + 1) }
}
