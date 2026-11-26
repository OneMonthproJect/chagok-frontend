import { useCallback, useEffect, useRef, useState } from 'react'
import { getReservations } from './api'
import type { ReservationListItem } from './types'

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: ReservationListItem[] }
  | { kind: 'error'; error: unknown }

// 하루 예약 목록 (08 15, from = to = date). 날짜가 바뀌면 다시 부르고, 늦게 온 이전 날짜 응답은 버린다.
// 실패해도 자동으로 다시 부르지 않는다(05 POL-125). reload()로 사람이 다시 시도한다.
export function useDayReservations(date: string): { state: LoadState; reload: () => void } {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestRef.current
    setState({ kind: 'loading' })
    getReservations({ from: date, to: date })
      .then((data) => { if (requestRef.current === requestId) setState({ kind: 'ok', items: data.items }) })
      .catch((error) => { if (requestRef.current === requestId) setState({ kind: 'error', error }) })
  }, [date])

  useEffect(() => {
    const ref = requestRef
    load()
    return () => { ref.current++ } // 화면을 떠나거나 날짜가 바뀌면 늦은 응답 무시
  }, [load])

  return { state, reload: load }
}
