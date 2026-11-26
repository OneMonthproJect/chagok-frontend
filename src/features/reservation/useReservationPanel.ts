// 예약 상세 패널 데이터 (08 17 조회 · 18 방문 완료). S-02가 ?reservation= 값으로 부른다.
// - 다른 예약으로 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다. 404(없는 예약·다른 정비소 예약, X3)는 'notFound'.
// - 방문 완료는 패널이 읽은 version을 함께 보낸다(M1 결정 B). 409(INVALID_STATUS_TRANSITION·CONCURRENT_MODIFICATION)면
//   패널을 다시 불러 최신 상태를 보이고 'conflict'를 돌려준다 — 화면은 S-08로 이동하지 않는다(08 18 「화면 처리」).
// - 어떤 실패도 자동으로 다시 보내거나 다시 부르지 않는다(05 POL-104·125). 다시 시도는 사람이 버튼으로 한다.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { completeReservation, getReservationPanel } from './api'
import { reloadsOnConflict } from './panelFlow'
import type { ReservationCompleted, ReservationPanel } from './types'

export type PanelStatus = 'loading' | 'ready' | 'notFound' | 'error'

/** 패널 안 행동(방문 완료)의 실패 안내. warn = 409 뒤 다시 불러옴, error = 그 밖(500·네트워크 등) */
export interface PanelActionNotice {
  tone: 'warn' | 'error'
  error: ApiError
}

export type CompleteResult =
  | { kind: 'completed'; data: ReservationCompleted }
  | { kind: 'conflict' }
  | { kind: 'failed' }
  | { kind: 'stale' } // 요청 중 다른 예약으로 바뀜(결과를 쓰지 않음)

export interface ReservationPanelState {
  status: PanelStatus
  data: ReservationPanel | null
  error: ApiError | null
  notice: PanelActionNotice | null
  /** 사람이 누르는 다시 불러오기(조회 실패 안내의 버튼). 행동 안내도 지운다 */
  reload: () => void
  /** [방문 완료]. Promise가 끝날 때까지 버튼이 잠긴다(Button, POL-120) */
  complete: () => Promise<CompleteResult>
}

interface LoadResult {
  status: PanelStatus
  data: ReservationPanel | null
  error: ApiError | null
}

/** reservationId가 null(쿼리가 양의 정수가 아님)이면 부르지 않고 'notFound' */
export function useReservationPanel(reservationId: number | null): ReservationPanelState {
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<PanelActionNotice | null>(null)
  const [result, setResult] = useState<LoadResult>({
    status: reservationId == null ? 'notFound' : 'loading',
    data: null,
    error: null,
  })
  const idRef = useRef(reservationId)
  idRef.current = reservationId
  // 18 요청 중에 패널을 닫거나 화면을 떠나면 결과를 쓰지 않는다(S-08로 끌려가지 않게)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // 다른 예약으로 바뀌면 이전 예약의 안내를 지운다
  const [noticeFor, setNoticeFor] = useState(reservationId)
  if (noticeFor !== reservationId) {
    setNoticeFor(reservationId)
    setNotice(null)
  }

  useEffect(() => {
    if (reservationId == null) {
      setResult({ status: 'notFound', data: null, error: null })
      return
    }
    let current = true
    // 같은 예약을 다시 부를 때는 이전 값을 흐리게 둔 채 기다린다(자리 이동 없음). 다른 예약이면 비운다
    setResult((prev) => ({
      status: 'loading',
      data: prev.data?.reservation.reservationId === reservationId ? prev.data : null,
      error: null,
    }))
    getReservationPanel(reservationId).then(
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
  }, [reservationId, reloadKey])

  const reload = useCallback(() => {
    setNotice(null)
    setReloadKey((key) => key + 1)
  }, [])

  const data = result.status === 'ready' ? result.data : null
  const complete = useCallback(async (): Promise<CompleteResult> => {
    if (!data) return { kind: 'stale' }
    const id = data.reservation.reservationId
    setNotice(null)
    try {
      const completed = await completeReservation(id, { version: data.reservation.version })
      return aliveRef.current && idRef.current === id ? { kind: 'completed', data: completed } : { kind: 'stale' }
    } catch (e) {
      const error = e as ApiError
      if (!aliveRef.current || idRef.current !== id) return { kind: 'stale' }
      if (reloadsOnConflict(error.code)) {
        setNotice({ tone: 'warn', error })
        setReloadKey((key) => key + 1) // 최신 상태·version을 다시 읽는다(18을 다시 보내지는 않음)
        return { kind: 'conflict' }
      }
      setNotice({ tone: 'error', error })
      return { kind: 'failed' }
    }
  }, [data])

  return { ...result, notice, reload, complete }
}
