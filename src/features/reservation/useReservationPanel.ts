// 예약 상세 패널 데이터 (08 17 조회 · 18 방문 완료 · 20 취소 · 21 노쇼 · 39 방문 접수 · 40 정정). S-02가 ?reservation= 값으로 부른다.
// - 다른 예약으로 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다. 404(없는 예약·다른 정비소 예약, X3)는 'notFound'.
// - 방문 완료는 패널이 읽은 version을 함께 보낸다(M1 결정 B). 409(INVALID_STATUS_TRANSITION·CONCURRENT_MODIFICATION)면
//   패널을 다시 불러 최신 상태를 보이고 'conflict'를 돌려준다 — 화면은 S-08로 이동하지 않는다(08 18 「화면 처리」).
// - 취소·노쇼(#31)도 같은 규칙이다(08 20·21 「화면 처리는 18과 같다」). 성공하면 패널을 다시 불러 바뀐 상태를 보이고 안내를 띄운다.
// - 방문 접수·정정(#33)도 같은 규칙이다(09 S-02: 접수·완료·취소·노쇼·정정은 version을 보내고 409면 패널 다시 조회).
//   입력 칸이 있는 대화상자(접수 입력·정정)에서 보낼 때는 409 밖의 실패(400·403·500)를 패널이 아니라 대화상자가 보이도록
//   { inline: true }로 부른다 — 대화상자가 열린 채 입력값을 지킨다(05 POL-121). 접수 뒤 S-08로 이동하지 않는다(#33 결정).
// - 어떤 실패도 자동으로 다시 보내거나 다시 부르지 않는다(05 POL-104·125). 다시 시도는 사람이 버튼으로 한다.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiError } from '@/shared/api/client'
import { cancelReservation, completeReservation, correctReservation, getReservationPanel, markNoShow, startReservation } from './api'
import { CONFIRM_TEXT, CORRECT_TEXT, START_TEXT, reloadsOnConflict } from './panelFlow'
import type { ConfirmAction } from './panelFlow'
import type {
  ReservationCompleted,
  ReservationCorrectRequest,
  ReservationPanel,
  ReservationStartRequest,
  ReservationStatusChanged,
} from './types'

export type PanelStatus = 'loading' | 'ready' | 'notFound' | 'error'

/**
 * 패널 안 행동의 안내. warn = 409 뒤 다시 불러옴, error = 그 밖(500·네트워크 등), info = 취소·노쇼 성공(message).
 */
export type PanelActionNotice =
  | { tone: 'warn' | 'error'; error: ApiError }
  | { tone: 'info'; message: string }

export type CompleteResult =
  | { kind: 'completed'; data: ReservationCompleted }
  | { kind: 'conflict' }
  | { kind: 'failed' }
  | { kind: 'stale' } // 요청 중 다른 예약으로 바뀜(결과를 쓰지 않음)

export type StatusChangeResult =
  | { kind: 'changed'; data: ReservationStatusChanged }
  | { kind: 'conflict' }
  | { kind: 'failed' }
  | { kind: 'stale' }

/** 39 방문 접수·40 정정 결과. failed에는 오류를 실어 대화상자가 보이게 한다(inline일 때) */
export type PanelChangeResult =
  | { kind: 'changed' }
  | { kind: 'conflict' }
  | { kind: 'failed'; error: ApiError }
  | { kind: 'stale' }

/** inline: 409 밖의 실패를 패널 안내로 띄우지 않고 결과로만 돌려준다(대화상자가 보임) */
export interface SendOptions {
  inline?: boolean
}

export interface ReservationPanelState {
  status: PanelStatus
  data: ReservationPanel | null
  error: ApiError | null
  notice: PanelActionNotice | null
  /** 사람이 누르는 다시 불러오기(조회 실패 안내의 버튼). 행동 안내도 지운다 */
  reload: () => void
  /** [방문 완료]. Promise가 끝날 때까지 버튼이 잠긴다(Button, POL-120) */
  complete: () => Promise<CompleteResult>
  /** [취소]·[노쇼] (확인 대화상자에서 확인한 뒤). 성공·409 모두 패널을 다시 읽는다 */
  changeStatus: (action: ConfirmAction) => Promise<StatusChangeResult>
  /** [방문 접수] (08 39). body의 version은 패널이 읽은 값으로 바꿔 보낸다. 성공·409 모두 패널을 다시 읽는다 */
  start: (body: Omit<ReservationStartRequest, 'version'>, options?: SendOptions) => Promise<PanelChangeResult>
  /** [정정] (08 40). 성공·409 모두 패널을 다시 읽는다 */
  correct: (body: Omit<ReservationCorrectRequest, 'version'>, options?: SendOptions) => Promise<PanelChangeResult>
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
  /**
   * 패널이 읽은 version으로 상태 변경 요청을 보낸다(18·20·21 공통). 409면 다시 읽고 'conflict', 그 밖 실패는 'failed'.
   * 요청 중 패널을 닫거나 다른 예약으로 바뀌면 결과를 쓰지 않는다('stale').
   */
  const send = useCallback(
    async <T,>(
      call: (id: number, version: number) => Promise<T>,
      options: SendOptions = {},
    ): Promise<{ kind: 'ok'; data: T; live: boolean } | { kind: 'conflict' | 'stale' } | { kind: 'failed'; error: ApiError }> => {
      if (!data) return { kind: 'stale' }
      const id = data.reservation.reservationId
      setNotice(null)
      try {
        const done = await call(id, data.reservation.version)
        return { kind: 'ok', data: done, live: aliveRef.current && idRef.current === id } // 요청은 성공 — live가 아니면 패널만 건드리지 않는다
      } catch (e) {
        const error = e as ApiError
        if (!aliveRef.current || idRef.current !== id) return { kind: 'stale' }
        if (reloadsOnConflict(error.code)) {
          setNotice({ tone: 'warn', error })
          setReloadKey((key) => key + 1) // 최신 상태·version을 다시 읽는다(요청을 다시 보내지는 않음)
          return { kind: 'conflict' }
        }
        if (!options.inline) setNotice({ tone: 'error', error })
        return { kind: 'failed', error }
      }
    },
    [data],
  )

  const complete = useCallback(async (): Promise<CompleteResult> => {
    const result = await send((id, version) => completeReservation(id, { version }))
    if (result.kind === 'ok') return result.live ? { kind: 'completed', data: result.data } : { kind: 'stale' }
    return result
  }, [send])

  const changeStatus = useCallback(
    async (action: ConfirmAction): Promise<StatusChangeResult> => {
      const call = action === 'cancel' ? cancelReservation : markNoShow
      const result = await send((id, version) => call(id, { version }))
      if (result.kind !== 'ok') return result
      if (result.live) {
        setNotice({ tone: 'info', message: CONFIRM_TEXT[action].done })
        setReloadKey((key) => key + 1) // 바뀐 상태·version을 다시 읽는다
      }
      return { kind: 'changed', data: result.data }
    },
    [send],
  )

  /** 39·40 공통: 성공하면 안내를 띄우고 패널을 다시 읽는다 */
  const change = useCallback(
    async (call: (id: number, version: number) => Promise<unknown>, done: string, options?: SendOptions): Promise<PanelChangeResult> => {
      const result = await send(call, options)
      if (result.kind !== 'ok') return result
      if (result.live) {
        setNotice({ tone: 'info', message: done })
        setReloadKey((key) => key + 1)
      }
      return { kind: 'changed' }
    },
    [send],
  )

  const start = useCallback(
    (body: Omit<ReservationStartRequest, 'version'>, options?: SendOptions) =>
      change((id, version) => startReservation(id, { ...body, version }), START_TEXT.done, options),
    [change],
  )

  const correct = useCallback(
    (body: Omit<ReservationCorrectRequest, 'version'>, options?: SendOptions) =>
      change((id, version) => correctReservation(id, { ...body, version }), CORRECT_TEXT.done, options),
    [change],
  )

  return { ...result, notice, reload, complete, changeStatus, start, correct }
}
