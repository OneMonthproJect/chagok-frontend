// 08 07 고객 상세를 화면에서 쓰는 훅 (S-06). 다른 고객으로 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다.
// 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125).
// 404 NOT_FOUND(없는 고객·다른 정비소 고객, X1)는 조회 실패와 나눠 'notFound'로 돌려준다.

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getCustomer } from './api'
import type { CustomerDetail } from './types'

export interface CustomerDetailState {
  status: 'loading' | 'ready' | 'notFound' | 'error'
  data: CustomerDetail | null
  error: ApiError | null
  reload: () => void
}

/** customerId가 null(주소가 양의 정수가 아님)이면 부르지 않고 'notFound' */
export function useCustomerDetail(customerId: number | null): CustomerDetailState {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Omit<CustomerDetailState, 'reload'>>({
    status: customerId == null ? 'notFound' : 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    if (customerId == null) {
      setResult({ status: 'notFound', data: null, error: null })
      return
    }
    let current = true
    // 다른 고객으로 바뀌면 이전 고객을 보이지 않는다(다시 불러오기면 이전 값을 지우지 않고 불러오는 중으로)
    setResult((prev) => ({
      status: 'loading',
      data: prev.data?.customerId === customerId ? prev.data : null,
      error: null,
    }))
    getCustomer(customerId).then(
      (data) => {
        if (current) setResult({ status: 'ready', data, error: null })
      },
      (error: ApiError) => {
        if (!current) return
        if (error.code === 'NOT_FOUND') setResult({ status: 'notFound', data: null, error })
        // 다시 불러오기 실패면 이전 data를 남겨 화면(수정 입력)이 사라지지 않게 한다
        else setResult((prev) => ({ status: 'error', data: prev.data?.customerId === customerId ? prev.data : null, error }))
      },
    )
    return () => {
      current = false
    }
  }, [customerId, reloadKey])

  return { ...result, reload: () => setReloadKey((key) => key + 1) }
}
