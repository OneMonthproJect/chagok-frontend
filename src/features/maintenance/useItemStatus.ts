// 08 10 항목 상태를 화면에서 쓰는 훅 (S-07: 주행거리 없이 날짜 기준). 차량이 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다.
// 실패해도 자동으로 다시 부르지 않는다 — reload는 사람이 누를 때만(POL-125).
// 404 NOT_FOUND(없는 차량·다른 정비소 차량, X6)는 조회 실패와 나눠 'notFound'로 돌려준다.
// S-08 저장 전 미리보기(mileage 포함, 입력 멈춘 뒤 0.5초)는 #35가 따로 만든다.

import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getItemStatus } from './api'
import type { ItemStatusResponse } from './types'

export interface ItemStatusState {
  status: 'loading' | 'ready' | 'notFound' | 'error'
  data: ItemStatusResponse | null
  error: ApiError | null
  reload: () => void
}

/** vehicleId가 null(주소가 양의 정수가 아님)이면 부르지 않고 'notFound' */
export function useItemStatus(vehicleId: number | null): ItemStatusState {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Omit<ItemStatusState, 'reload'>>({
    status: vehicleId == null ? 'notFound' : 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    if (vehicleId == null) {
      setResult({ status: 'notFound', data: null, error: null })
      return
    }
    let current = true
    // 다른 차량으로 바뀌면 이전 차량을 보이지 않는다(다시 불러오기면 이전 값을 흐리게 둔 채 불러오는 중으로)
    setResult((prev) => ({
      status: 'loading',
      data: prev.data?.vehicleId === vehicleId ? prev.data : null,
      error: null,
    }))
    getItemStatus(vehicleId).then(
      (data) => {
        if (current) setResult({ status: 'ready', data, error: null })
      },
      (error: ApiError) => {
        if (!current) return
        setResult({ status: error.code === 'NOT_FOUND' ? 'notFound' : 'error', data: null, error })
      },
    )
    return () => {
      current = false
    }
  }, [vehicleId, reloadKey])

  return { ...result, reload: () => setReloadKey((key) => key + 1) }
}
