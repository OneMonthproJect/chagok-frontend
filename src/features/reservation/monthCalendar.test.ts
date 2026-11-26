import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MONTH_GRID_DAYS, addDays, formatMonthLabel, monthGrid, monthStart, shiftMonth, todaySeoul, weekdayIndex } from './dates'
import { mockCreateReservation, mockGetReservationSummary, mockGetReservations, resetReservationMocks } from './mocks'
import type { ReservationDaySummary, ReservationListItem } from './types'

// S-02 월 캘린더 (04 F-RSV-05, 08 15·42, chagok-frontend#30): 달력 칸·조회 기간(서울 날짜 문자열), 42 Mock, 15 담당(assignee)

describe('monthGrid — 6주 × 7일, 일요일 시작, 날짜 문자열로만 계산', () => {
  it.each([
    ['2026-11-24', '2026-11-01', '2026-12-12'], // 1일이 일요일
    ['2026-02-10', '2026-02-01', '2026-03-14'], // 28일 2월
    ['2026-08-31', '2026-07-26', '2026-09-05'], // 1일이 토요일 — 6주가 모두 필요한 달
    ['2027-01-01', '2026-12-27', '2027-02-06'], // 해 넘김
    ['2026-12-31', '2026-11-29', '2027-01-09'], // 월말
  ])('%s → %s ~ %s', (date, from, to) => {
    const grid = monthGrid(date)
    expect(grid.from).toBe(from)
    expect(grid.to).toBe(to)
    expect(grid.days).toHaveLength(MONTH_GRID_DAYS)
    expect(grid.days[0]).toBe(from)
    expect(grid.days[41]).toBe(to)
    expect(weekdayIndex(grid.from)).toBe(0)
    // 15·42 최대 조회 기간 42일(from·to 포함)을 넘지 않는다
    expect(addDays(grid.from, MONTH_GRID_DAYS - 1)).toBe(grid.to)
    // 그 달의 모든 날이 칸에 있다
    expect(grid.days).toContain(monthStart(date))
    expect(grid.month).toBe(date.slice(0, 7))
  })

  it('같은 달의 어느 날짜든 같은 기간 (같은 달 안에서 날짜를 바꿔도 42를 다시 부르지 않는다)', () => {
    expect(monthGrid('2026-11-01')).toEqual(monthGrid('2026-11-30'))
  })

  it('달 이동은 해를 넘기고, 결과는 그 달 1일', () => {
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-01')
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-03-31', -1)).toBe('2026-02-01') // 2월 31일로 넘치지 않는다
    expect(shiftMonth('2026-11-24', 0)).toBe('2026-11-01')
    expect(formatMonthLabel('2027-01-05')).toBe('2027년 1월')
  })
})

describe('브라우저 시간대가 달라도 같은 칸 (08 0.1, #30 시간대 확인)', () => {
  // vi.stubEnv는 process.env.TZ도 바꾼다(Node는 실행 중 TZ 변경을 바로 반영). afterEach에서 원래대로
  afterEach(() => { vi.unstubAllEnvs() })

  it.each(['UTC', 'America/Los_Angeles', 'Asia/Seoul'])('TZ=%s', (tz) => {
    vi.stubEnv('TZ', tz)
    expect(new Date(Date.UTC(2026, 10, 30, 15, 30)).getDate()).toBe(tz === 'Asia/Seoul' ? 1 : 30) // 시간대가 실제로 바뀌었는지
    // 서울 2026-12-01 00:30 (UTC 11-30 15:30) — 서울은 이미 12월
    const instant = new Date(Date.UTC(2026, 10, 30, 15, 30))
    const today = todaySeoul(instant)
    expect(today).toBe('2026-12-01')
    expect(monthGrid(today).from).toBe('2026-11-29')
    expect(monthGrid(today).to).toBe('2027-01-09')
    expect(weekdayIndex('2026-12-01')).toBe(2) // 화요일
  })
})

describe('Mock 42 (08 7.1 JSON 예시 모양) · 15 assignee', () => {
  beforeEach(() => resetReservationMocks())

  const summary = (from: string, to: string) =>
    (mockGetReservationSummary({ from, to }).body as { data: { from: string; to: string; items: ReservationDaySummary[] } }).data

  it('07 7.3 시드: 어제 1·오늘 2·D+2 1, 예약이 없는 날은 넣지 않는다', () => {
    const today = todaySeoul()
    const data = summary(addDays(today, -1), addDays(today, 2))
    expect([data.from, data.to]).toEqual([addDays(today, -1), addDays(today, 2)]) // 요청 기간 그대로
    const days = data.items
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]))
    expect(byDate[today]).toEqual({ date: today, total: 2, reserved: 2, inProgress: 0, completed: 0, canceled: 0, noShow: 0 })
    expect(byDate[addDays(today, -1)].total).toBe(1)
    expect(byDate[addDays(today, 2)].total).toBe(1)
    expect(byDate[addDays(today, 1)]).toBeUndefined()
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort())
  })

  it('42일까지 받고 43일이면 400(to), from > to는 400(from), 누락은 그 파라미터 (08 7.1 42)', () => {
    const field = (from: string, to: string) => {
      const res = mockGetReservationSummary({ from, to })
      return [res.status, (res.body as { error: { fieldErrors: { field: string }[] } | null }).error?.fieldErrors[0]?.field]
    }
    expect(mockGetReservationSummary({ from: '2026-11-01', to: '2026-12-12' }).status).toBe(200)
    expect(field('2026-11-01', '2026-12-13')).toEqual([400, 'to'])
    expect(field('2026-11-02', '2026-11-01')).toEqual([400, 'from'])
    expect(field('', '2026-11-01')).toEqual([400, 'from'])
    expect(field('2026-11-01', '')).toEqual([400, 'to'])
  })

  it('15 목록에 07 7.3 담당(이름·colorIndex), 담당 없이 등록하면 Mock 기본 담당', () => {
    const today = todaySeoul()
    const items = (mockGetReservations({ from: today, to: today }).body as { data: { items: ReservationListItem[] } }).data.items
    expect(items.map((r) => r.assignee)).toEqual([
      { staffId: 2, name: '김정비', colorIndex: 1 }, // 78라0004 10:00 mech_a
      { staffId: 1, name: '박사장', colorIndex: 0 }, // 22사0007 14:30 owner_a
    ])

    const day = addDays(today, 5)
    expect(mockCreateReservation({ vehicleId: 1, reservedAt: `${day}T09:00:00`, assigneeId: 2 }).status).toBe(200)
    const created = (mockGetReservations({ from: day, to: day }).body as { data: { items: ReservationListItem[] } }).data.items
    expect(created[0].assignee).toEqual({ staffId: 2, name: '김정비', colorIndex: 1 })
  })
})
