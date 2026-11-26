// 08 11 방문 단위 정비 이력을 화면에서 쓰는 훅 (S-07). 첫 쪽은 서버 기본값(page 0·size 20)으로 받고,
// "더 보기"는 다음 쪽을 받아 뒤에 붙인다(09 S-07 「더 보기(쪽 나누기)」). 차량이 바뀌면 처음부터 다시 받고, 늦게 온 이전 응답은 버린다.
// 실패해도 자동으로 다시 부르지 않는다 — reload·loadMore는 사람이 누를 때만(POL-125).
// 첫 쪽의 404 NOT_FOUND(없는 차량·다른 정비소 차량, X2)는 'notFound', 그 밖의 실패는 'error'.
// 더 보기 실패는 받은 이력을 그대로 둔 채 moreError로 알린다(화면이 그 자리에서 다시 누르게 함).

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getVisits } from './api'
import { appendVisits, hasMoreVisits } from './maintenanceFlow'
import type { Visit, VisitListResponse } from './types'

export interface VisitHistoryState {
  status: 'loading' | 'ready' | 'notFound' | 'error'
  visits: Visit[]
  /** 마지막으로 받은 쪽 (page·size·totalElements·totalPages) */
  last: VisitListResponse | null
  error: ApiError | null
  hasMore: boolean
  loadingMore: boolean
  moreError: ApiError | null
  reload: () => void
  loadMore: () => void
}

type Result = Omit<VisitHistoryState, 'hasMore' | 'reload' | 'loadMore'>

const EMPTY: Result = { status: 'loading', visits: [], last: null, error: null, loadingMore: false, moreError: null }

/** vehicleId가 null(주소가 양의 정수가 아님)이면 부르지 않고 'notFound' */
export function useVisitHistory(vehicleId: number | null): VisitHistoryState {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Result>(vehicleId == null ? { ...EMPTY, status: 'notFound' } : EMPTY)
  // 지금 보이는 목록의 세대. 차량이 바뀌거나 다시 불러오면 바뀌어, 그 전에 보낸 더 보기 응답을 버린다.
  const generation = useRef(0)

  useEffect(() => {
    generation.current += 1
    const mine = generation.current
    if (vehicleId == null) {
      setResult({ ...EMPTY, status: 'notFound' })
      return
    }
    setResult(EMPTY)
    getVisits(vehicleId).then(
      (data) => {
        if (generation.current === mine) setResult({ ...EMPTY, status: 'ready', visits: data.items, last: data })
      },
      (error: ApiError) => {
        if (generation.current !== mine) return
        setResult({ ...EMPTY, status: error.code === 'NOT_FOUND' ? 'notFound' : 'error', error })
      },
    )
  }, [vehicleId, reloadKey])

  const { last, loadingMore } = result
  const loadMore = useCallback(() => {
    if (vehicleId == null || !hasMoreVisits(last) || loadingMore || !last) return
    const mine = generation.current
    setResult((prev) => ({ ...prev, loadingMore: true, moreError: null }))
    getVisits(vehicleId, { page: last.page + 1, size: last.size }).then(
      (data) => {
        if (generation.current !== mine) return
        setResult((prev) => ({ ...prev, visits: appendVisits(prev.visits, data.items), last: data, loadingMore: false }))
      },
      (error: ApiError) => {
        if (generation.current !== mine) return
        setResult((prev) => ({ ...prev, loadingMore: false, moreError: error }))
      },
    )
  }, [vehicleId, last, loadingMore])

  return {
    ...result,
    hasMore: result.status === 'ready' && hasMoreVisits(result.last),
    reload: () => setReloadKey((key) => key + 1),
    loadMore,
  }
}
