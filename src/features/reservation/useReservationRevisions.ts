// 예약 변경 이력 (08 41, F-RSV-06·10, #33). 패널의 [이력 보기] 대화상자를 열 때만 부른다.
// 404(다른 정비소 예약, X14)·실패는 'error'로 두고, 다시 시도는 사람이 버튼으로 한다(자동 재요청 없음, POL-125).

import { useCallback, useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { getReservationRevisions } from './api'
import type { ReservationRevision } from './types'

export type RevisionsState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: ReservationRevision[] }
  | { kind: 'error'; error: ApiError }

export function useReservationRevisions(reservationId: number): { state: RevisionsState; reload: () => void } {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<RevisionsState>({ kind: 'loading' })

  useEffect(() => {
    let current = true
    setState({ kind: 'loading' })
    getReservationRevisions(reservationId).then(
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
  }, [reservationId, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  return { state, reload }
}
