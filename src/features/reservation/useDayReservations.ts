import { useCallback, useEffect, useRef, useState } from 'react'
import { getReservations } from './api'
import type { ReservationListItem } from './types'

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: ReservationListItem[] }
  | { kind: 'error'; error: unknown }

// 기간 예약 목록 (08 15). 기간이 바뀌면 다시 부르고, 늦게 온 이전 기간 응답은 버린다.
// 실패해도 자동으로 다시 부르지 않는다(05 POL-125). reload()로 사람이 다시 시도한다.
// enabled가 false면 부르지 않는다(S-02에서 지금 보이지 않는 보기, #36). 다시 true가 되면 그때 부른다.
// assigneeId가 있으면 그 담당의 예약만 부른다(15 assigneeId, S-02 주 보기 "내 담당만" — 화면 필터일 뿐 데이터 권한이 아님, #36·docs#146).
export function usePeriodReservations(
  from: string,
  to: string,
  enabled = true,
  assigneeId?: number,
): { state: LoadState; reload: () => void } {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const requestRef = useRef(0)

  const load = useCallback(() => {
    if (!enabled) return
    const requestId = ++requestRef.current
    setState({ kind: 'loading' })
    getReservations(assigneeId === undefined ? { from, to } : { from, to, assigneeId })
      .then((data) => { if (requestRef.current === requestId) setState({ kind: 'ok', items: data.items }) })
      .catch((error) => { if (requestRef.current === requestId) setState({ kind: 'error', error }) })
  }, [from, to, enabled, assigneeId])

  useEffect(() => {
    const ref = requestRef
    load()
    return () => { ref.current++ } // 화면을 떠나거나 기간이 바뀌면 늦은 응답 무시
  }, [load])

  return { state, reload: load }
}

/** 하루 예약 목록 (08 15, from = to = date) */
export function useDayReservations(date: string, enabled = true): { state: LoadState; reload: () => void } {
  return usePeriodReservations(date, date, enabled)
}
