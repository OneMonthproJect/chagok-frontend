// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 04의 사본이며 계약의 기준은 08이다.
// 값은 07 7.5 기대값 그대로(오늘 예약 3건(진행중 1건 포함)·오늘 연락할 고객 5명). 날짜만 오늘(서울)로 바꾼다.
// 다른 feature의 Mock(예약)과 데이터를 나누지 않으므로, Mock으로 예약을 등록해도 이 숫자는 바뀌지 않는다.

import type { MockResponse } from '@/shared/api/client'
import type { HomeReservation, HomeSummary } from '../types'
import fixture from './home.json'

function todaySeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** 08 04 */
export function mockGetHome(): MockResponse {
  const date = todaySeoul()
  const data: HomeSummary = {
    date,
    todayReservationCount: fixture.todayReservationCount,
    todayContactCount: fixture.todayContactCount,
    todayReservations: fixture.todayReservations.map(({ time, ...r }) => ({
      ...r,
      reservedAt: `${date}T${time}`,
      status: r.status as HomeReservation['status'],
    })),
  }
  return { status: 200, body: { success: true, data, error: null } }
}
