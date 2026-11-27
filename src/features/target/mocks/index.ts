// 개발용 Mock (CONVENTIONS 7장 「Mock」). 08 14의 사본이며 계약의 기준은 08이다.
// 값은 07 7.2·7.5 시드의 대상 6대(targets.json). 날짜는 오늘(서울) 기준으로 계산한다 — 서버 판정을 흉내 내는 것이 아니라
// 시드의 기준 기록일 + 주기를 그대로 옮긴 값이다(화면은 status를 받은 그대로 보인다).
// 다른 feature의 Mock(예약)과 데이터를 나누지 않으므로, Mock으로 예약을 등록해도 이 목록의 "예약 있음"은 바뀌지 않는다.
// phone은 목록 응답이라 08 0.5대로 가린 값이다(P0-나머지, #106).

import type { MockResponse } from '@/shared/api/client'
import { maskPhone } from '@/shared/lib/maskPhone'
import type { Target } from '../types'
import fixture from './targets.json'

function todaySeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** 달·일을 더한다 (월말 없는 시드만 쓰므로 단순 계산, 07 7장 "월말·윤년은 시드에 쓰지 않는다") */
function shift(date: string, months: number, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + months, d + days)).toISOString().slice(0, 10)
}

/** 08 14 */
export function mockGetTargets(): MockResponse {
  const today = todaySeoul()
  const items: Target[] = fixture.items.map((t) => ({
    customerId: t.customerId,
    customerName: t.customerName,
    phone: maskPhone(t.phone),
    vehicleId: t.vehicleId,
    plateNumber: t.plateNumber,
    targetItems: t.targetItems.map((i) => {
      const baseDate = shift(today, i.baseMonths, i.baseDays)
      const seedNote = 'note' in i ? (i.note as { kind: string; months: number; days: number; memo: string | null }) : null
      const note = seedNote ? { date: shift(today, seedNote.months, seedNote.days), memo: seedNote.memo } : null
      return {
        itemId: i.itemId,
        name: i.name,
        status: i.status as 'DUE' | 'SOON',
        nextDueDate: shift(baseDate, i.cycleMonths, 0),
        baseDate,
        lastDecline: seedNote?.kind === 'DECLINE' ? note : null,
        lastCaution: seedNote?.kind === 'CAUTION' ? note : null,
      }
    }),
    activeReservation: t.activeReservation
      ? { reservationId: t.activeReservation.reservationId, reservedAt: `${shift(today, 0, t.activeReservation.dayOffset)}T${t.activeReservation.time}` }
      : null,
  }))
  return { status: 200, body: { success: true, data: { asOf: today, items }, error: null } }
}

/** 빈 목록 (테스트·화면 확인용) */
export function mockGetNoTargets(): MockResponse {
  return { status: 200, body: { success: true, data: { asOf: todaySeoul(), items: [] }, error: null } }
}
