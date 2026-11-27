import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDays, formatWeekLabel, todaySeoul, weekRange, weekdayIndex } from './dates'
import { mockGetReservations, resetReservationMocks } from './mocks'
import type { ReservationListItem } from './types'
import { WEEK_SLOTS, hasItems, placeWeek } from './weekCalendar'

// S-02 주 캘린더 (04 F-RSV-05 「주 보기」, 09 S-02, D-63 B08, chagok-frontend#36):
// 주 범위(월요일 시작, 달·해 넘김), 30분 칸 배치와 08:00 전·20:00 이후 영역 경계, 15 조회 기간

describe('weekRange — 월요일 시작 7일, 날짜 문자열로만 계산', () => {
  it.each([
    ['2026-11-24', '2026-11-23', '2026-11-29'], // 화요일 → 그 주 월~일
    ['2026-11-23', '2026-11-23', '2026-11-29'], // 월요일 자신
    ['2026-11-29', '2026-11-23', '2026-11-29'], // 일요일은 앞 주의 끝
    ['2026-12-02', '2026-11-30', '2026-12-06'], // 달 넘김
    ['2027-01-01', '2026-12-28', '2027-01-03'], // 해 넘김
    ['2028-03-01', '2028-02-28', '2028-03-05'], // 윤년 2월 29일 포함
  ])('%s → %s ~ %s', (date, from, to) => {
    const week = weekRange(date)
    expect([week.from, week.to]).toEqual([from, to])
    expect(week.days).toHaveLength(7)
    expect(weekdayIndex(week.from)).toBe(1) // 월요일
    expect(week.days).toContain(date)
    expect(addDays(week.from, 6)).toBe(week.to)
  })

  it('같은 주의 어느 날짜든 같은 기간 (같은 주 안에서 날짜를 바꿔도 15를 다시 부르지 않는다)', () => {
    expect(weekRange('2026-11-23')).toEqual(weekRange('2026-11-29'))
  })

  it('머리 글자: 같은 달 · 달 넘김 · 해 넘김', () => {
    expect(formatWeekLabel('2026-11-23', '2026-11-29')).toBe('2026년 11월 23일 ~ 29일')
    expect(formatWeekLabel('2026-11-30', '2026-12-06')).toBe('2026년 11월 30일 ~ 12월 6일')
    expect(formatWeekLabel('2026-12-28', '2027-01-03')).toBe('2026년 12월 28일 ~ 2027년 1월 3일')
  })
})

describe('브라우저 시간대가 달라도 같은 주 (08 0.1)', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it.each(['UTC', 'America/Los_Angeles', 'Asia/Seoul'])('TZ=%s', (tz) => {
    vi.stubEnv('TZ', tz)
    // 서울 2026-11-30(월) 00:30 = UTC 11-29 15:30 — 서울은 이미 새 주
    const today = todaySeoul(new Date(Date.UTC(2026, 10, 29, 15, 30)))
    expect(today).toBe('2026-11-30')
    expect(weekRange(today).from).toBe('2026-11-30')
  })
})

const item = (id: number, reservedAt: string, extra: Partial<ReservationListItem> = {}): ReservationListItem => ({
  reservationId: id, reservedAt, status: 'RESERVED', needsAction: false, version: 0,
  vehicleId: id, plateNumber: `12가${id}`, customerId: id, customerName: `고객${id}`, phone: '010-****-0000', purposeSummary: null,
  ...extra,
})

describe('placeWeek — 30분 칸, 08:00 전은 위·20:00 이후는 아래 (D-63 B08)', () => {
  const { days } = weekRange('2026-11-24')

  it('시작 칸은 08:00 ~ 19:30, 24칸', () => {
    expect(WEEK_SLOTS).toHaveLength(24)
    expect(WEEK_SLOTS[0]).toBe('08:00')
    expect(WEEK_SLOTS[1]).toBe('08:30')
    expect(WEEK_SLOTS.at(-1)).toBe('19:30')
  })

  it('경계: 07:30 → 위, 08:00 → 첫 칸, 19:30 → 마지막 칸, 20:00 → 아래', () => {
    const p = placeWeek([
      item(1, '2026-11-23T07:30:00'),
      item(2, '2026-11-23T08:00:00'),
      item(3, '2026-11-24T19:30:00'),
      item(4, '2026-11-24T20:00:00'),
      item(5, '2026-11-29T23:30:00'), // 일요일 밤 — 주의 마지막 날 아래 영역
      item(6, '2026-11-23T00:00:00'), // 자정
    ], days)
    expect(p.before['2026-11-23'].map((r) => r.reservationId)).toEqual([1, 6])
    expect(p.slots['08:00']['2026-11-23'].map((r) => r.reservationId)).toEqual([2])
    expect(p.slots['19:30']['2026-11-24'].map((r) => r.reservationId)).toEqual([3])
    expect(p.after['2026-11-24'].map((r) => r.reservationId)).toEqual([4])
    expect(p.after['2026-11-29'].map((r) => r.reservationId)).toEqual([5])
    expect(hasItems(p.before)).toBe(true)
    expect(hasItems(p.after)).toBe(true)
  })

  it('같은 칸 여러 건(다른 담당)은 받은 순서 그대로 쌓고, 취소·노쇼도 놓는다(15는 취소·노쇼 포함)', () => {
    const p = placeWeek([
      item(1, '2026-11-25T10:00:00', { assignee: { staffId: 1, name: '박사장', colorIndex: 0 } }),
      item(2, '2026-11-25T10:00:00', { assignee: { staffId: 2, name: '김정비', colorIndex: 1 } }),
      item(3, '2026-11-25T10:30:00', { status: 'CANCELED' }),
    ], days)
    expect(p.slots['10:00']['2026-11-25'].map((r) => r.reservationId)).toEqual([1, 2])
    expect(p.slots['10:30']['2026-11-25'].map((r) => r.reservationId)).toEqual([3])
  })

  it('주 밖 날짜는 버리고, 예약이 없으면 위·아래 영역도 없다', () => {
    const p = placeWeek([item(1, '2026-11-22T10:00:00'), item(2, '2026-11-30T10:00:00')], days)
    expect(p.slots).toEqual({})
    expect(hasItems(p.before)).toBe(false)
    expect(hasItems(p.after)).toBe(false)
  })

  it(':00·:30이 아닌 분이 와도 칸을 잃지 않는다(내림)', () => {
    const p = placeWeek([item(1, '2026-11-26T09:15:00'), item(2, '2026-11-26T09:45:00')], days)
    expect(p.slots['09:00']['2026-11-26'].map((r) => r.reservationId)).toEqual([1])
    expect(p.slots['09:30']['2026-11-26'].map((r) => r.reservationId)).toEqual([2])
  })
})

describe('Mock 15 — 주 기간(7일) 조회', () => {
  it('오늘이 속한 주를 부르면 07 7.3 시드의 오늘 예약 2건이 들어 있다', () => {
    resetReservationMocks()
    const today = todaySeoul()
    const { from, to } = weekRange(today)
    const res = mockGetReservations({ from, to })
    expect(res.status).toBe(200)
    const data = (res.body as { data: { from: string; to: string; items: ReservationListItem[] } }).data
    expect([data.from, data.to]).toEqual([from, to])
    expect(data.items.filter((r) => r.reservedAt.startsWith(today))).toHaveLength(2)
    expect(data.items.every((r) => r.reservedAt.slice(0, 10) >= from && r.reservedAt.slice(0, 10) <= to)).toBe(true)
  })
})

// "내 담당만"(04 F-RSV-05, 09 S-02 「보기 옵션」, docs#146 (c)안) — 08 15 assigneeId
describe('Mock 15 — assigneeId (내 담당만)', () => {
  // 07 7.3 시드: 1(오늘 10:00)·3(+2일) 김정비(2), 2(오늘 14:30)·4(-1일) 박사장(1)
  const ids = (query: { from: string; to: string; assigneeId?: number }) => {
    const res = mockGetReservations(query)
    expect(res.status).toBe(200)
    return (res.body as { data: { items: ReservationListItem[] } }).data.items
  }
  const today = todaySeoul()
  const period = { from: addDays(today, -1), to: addDays(today, 2) }

  it('없으면 정비소 전체, 있으면 그 담당 예약만', () => {
    resetReservationMocks()
    expect(ids(period).map((r) => r.reservationId)).toEqual([4, 1, 2, 3])
    const mine = ids({ ...period, assigneeId: 2 })
    expect(mine.map((r) => r.reservationId)).toEqual([1, 3])
    expect(mine.every((r) => r.assignee?.staffId === 2)).toBe(true)
    expect(ids({ ...period, assigneeId: 1 }).map((r) => r.reservationId)).toEqual([4, 2])
  })

  it('없는 id·다른 정비소 직원 id는 오류가 아니라 200 + 빈 items (08 15)', () => {
    resetReservationMocks()
    expect(ids({ ...period, assigneeId: 99 })).toEqual([])
  })
})
