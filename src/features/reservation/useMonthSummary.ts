import { useCallback, useEffect, useRef, useState } from 'react'
import { getReservationSummary } from './api'
import { monthGrid } from './dates'
import type { ReservationDaySummary } from './types'

export type MonthSummaryState =
  | { kind: 'loading' }
  | { kind: 'ok'; byDate: Record<string, ReservationDaySummary> }
  | { kind: 'error'; error: unknown }

// 월 캘린더의 날짜별 건수 (08 42, F-RSV-05). 조회 기간은 그 달 달력 42칸(monthGrid)이라 같은 달 안에서 날짜를 바꾸면 다시 부르지 않는다.
// 늦게 온 이전 달 응답은 버린다. 실패해도 자동으로 다시 부르지 않는다(05 POL-125). reload()로 사람이 다시 시도한다.
// 응답에 없는 날은 화면이 빈 칸으로 그린다(byDate에 없음).
export function useMonthSummary(date: string): { state: MonthSummaryState; reload: () => void } {
  const { from, to } = monthGrid(date)
  const [state, setState] = useState<MonthSummaryState>({ kind: 'loading' })
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestRef.current
    setState({ kind: 'loading' })
    getReservationSummary({ from, to })
      .then(({ items }) => {
        if (requestRef.current !== requestId) return
        const byDate: Record<string, ReservationDaySummary> = {}
        for (const day of items) byDate[day.date] = day
        setState({ kind: 'ok', byDate })
      })
      .catch((error) => { if (requestRef.current === requestId) setState({ kind: 'error', error }) })
  }, [from, to])

  useEffect(() => {
    const ref = requestRef
    load()
    return () => { ref.current++ } // 화면을 떠나거나 달이 바뀌면 늦은 응답 무시
  }, [load])

  return { state, reload: load }
}
