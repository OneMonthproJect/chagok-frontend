// M-02 예약 등록·변경의 판단 규칙 (09 M-02, 08 16·19, 04 R1·R2·R14·R19·R24, chagok-frontend#25·#37). 화면 없이 테스트하도록 순수 함수.
// 담당 정비사 칸을 열고 닫는 판단(재배정 가능 구간·사유 필요)은 assigneeRules.ts에 있고, 여기서는 값 검사와 요청 조립만 한다.

import { ASSIGNEE_MESSAGES, REASSIGN_REASON_MAX } from './assigneeRules'
import type { Assignee, ReservationCreateRequest, ReservationUpdateRequest } from './types'

export const MEMO_MAX = 200

/** 시각 버튼 (디자인 Modal-Create: 08:00~19:30, 30분 단위) */
export const MAIN_SLOTS: string[] = Array.from({ length: 24 }, (_, i) => slot(8 * 60 + i * 30))
/** "그 밖 시각" 선택지: 하루의 나머지 30분 단위 */
export const OTHER_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => slot(i * 30)).filter((t) => !MAIN_SLOTS.includes(t))

function slot(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export interface FormVehicle {
  vehicleId: number
  plateNumber: string
  customerName?: string
}

export interface ReservationFormValues {
  vehicle: FormVehicle | null
  date: string // YYYY-MM-DD
  time: string // HH:mm
  itemIds: number[]
  other: boolean
  memo: string
  /** 담당 정비사 staffId (08 16·19 assigneeId, #37). 등록에서 null이면 화면이 기본값(로그인 계정)을 채운다 */
  assigneeId: number | null
  /** 당일 사장 재배정 사유 (08 19 reassignReason) */
  reassignReason: string
}

export type FormErrors = Partial<Record<'vehicle' | 'date' | 'time' | 'purpose' | 'memo' | 'assignee' | 'reassignReason', string>>

/** 변경 모드가 읽어 온 예약 (17 패널의 reservation + 차량·고객 일부) */
export interface EditTarget {
  reservationId: number
  version: number
  reservedAt: string
  purpose: { items: { itemId: number; name: string }[]; other: boolean; memo: string | null }
  vehicle: FormVehicle
  /** 08 17 reservation.assignee (P0-나머지). 없으면 담당을 모르는 것으로 보고 칸을 비워 둔다 */
  assignee?: Assignee | null
}

export function emptyForm(date: string, vehicle: FormVehicle | null = null): ReservationFormValues {
  return { vehicle, date, time: '', itemIds: [], other: false, memo: '', assigneeId: null, reassignReason: '' }
}

export function formFromReservation(target: EditTarget): ReservationFormValues {
  return {
    vehicle: target.vehicle,
    date: target.reservedAt.slice(0, 10),
    time: target.reservedAt.slice(11, 16),
    itemIds: target.purpose.items.map((i) => i.itemId),
    other: target.purpose.other,
    memo: target.purpose.memo ?? '',
    assigneeId: target.assignee?.staffId ?? null,
    reassignReason: '',
  }
}

/** 오늘이면 지금 시각까지는 고를 수 없다 (R2: 날짜 ≥ 오늘, 오늘은 지난 시각이 아니어야 의미가 있음) */
export function isPastSlot(date: string, time: string, today: string, nowTime: string): boolean {
  if (date < today) return true
  return date === today && time <= nowTime
}

/**
 * 보내기 전 검사 (서버도 같은 규칙으로 다시 막는다: R1·R2·R19, 16·19).
 * reasonRequired: 당일 사장 재배정이라 사유가 필수인지 (assigneeRules.needsReassignReason)
 * originalReservedAt: 변경 모드에서 변경 전 예약 일시. 일시를 그대로 두면 날짜(≥ 오늘)·지난 시각 검사를 하지 않는다 —
 * 19는 reservedAt을 보낼 때만 날짜 규칙을 적용하므로 "처리 필요" 예약의 목적·메모·담당 변경은 막지 않는다 (08 19, #71).
 */
export function validateForm(
  values: ReservationFormValues,
  today: string,
  nowTime: string,
  mode: 'create' | 'edit',
  { reasonRequired = false, originalReservedAt }: { reasonRequired?: boolean; originalReservedAt?: string } = {},
): FormErrors {
  const errors: FormErrors = {}
  const keepsReservedAt = mode === 'edit' && originalReservedAt != null
    && values.date === originalReservedAt.slice(0, 10) && values.time === originalReservedAt.slice(11, 16)
  if (mode === 'create' && !values.vehicle) errors.vehicle = '차량을 골라 주세요.'
  if (mode === 'create' && values.assigneeId == null) errors.assignee = ASSIGNEE_MESSAGES.REQUIRED
  if (!values.date) errors.date = '날짜를 골라 주세요.'
  else if (!keepsReservedAt && values.date < today) errors.date = '오늘 이후 날짜만 예약할 수 있습니다.'
  if (!values.time) errors.time = '시각을 골라 주세요.'
  else if (!/^\d{2}:(00|30)$/.test(values.time)) errors.time = '시각은 30분 단위로 골라 주세요.'
  else if (!keepsReservedAt && values.date && !errors.date && isPastSlot(values.date, values.time, today, nowTime)) errors.time = '지난 시각은 고를 수 없습니다.'
  if (values.memo.length > MEMO_MAX) errors.memo = `메모는 ${MEMO_MAX}자까지 입력할 수 있습니다.`
  if (reasonRequired) {
    const reason = values.reassignReason.trim()
    if (reason === '') errors.reassignReason = ASSIGNEE_MESSAGES.REASON_REQUIRED
    else if (reason.length > REASSIGN_REASON_MAX) errors.reassignReason = `사유는 ${REASSIGN_REASON_MAX}자까지 입력할 수 있습니다.`
  }
  return errors
}

const reservedAt = (v: ReservationFormValues) => `${v.date}T${v.time}:00`
const sameIds = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i])

/** 16 요청 (P0-나머지: assigneeId 필수, R19·D-51). validateForm을 통과한 값만 넘긴다 */
export function createRequest(values: ReservationFormValues): ReservationCreateRequest {
  const memo = values.memo.trim()
  return {
    vehicleId: values.vehicle!.vehicleId,
    reservedAt: reservedAt(values),
    assigneeId: values.assigneeId!,
    purpose: { itemIds: values.itemIds, other: values.other, memo: memo === '' ? null : memo },
  }
}

/**
 * 19 요청: version + 바뀐 칸만 (19는 보낸 필드만 바꾼다). 바뀐 게 없으면 null(저장 버튼 비활성, R14).
 * 예약 목적은 하나라도 바뀌면 itemIds·other·memo를 함께 보낸다. 메모를 지우면 "" (19: ""이면 비움).
 * 담당은 지금 담당과 다를 때만 assigneeId를 보낸다(같은 값은 재배정이 아님, 08 19). 사유는 reasonRequired(당일 사장)일 때만.
 */
export function updateRequest(
  original: EditTarget,
  values: ReservationFormValues,
  { reasonRequired = false }: { reasonRequired?: boolean } = {},
): ReservationUpdateRequest | null {
  const before = formFromReservation(original)
  const body: ReservationUpdateRequest = { version: original.version }
  if (reservedAt(values) !== reservedAt(before)) body.reservedAt = reservedAt(values)
  const memo = values.memo.trim()
  if (!sameIds(values.itemIds, before.itemIds) || values.other !== before.other || memo !== before.memo.trim()) {
    body.purpose = { itemIds: values.itemIds, other: values.other, memo }
  }
  if (values.assigneeId != null && values.assigneeId !== (original.assignee?.staffId ?? null)) {
    body.assigneeId = values.assigneeId
    if (reasonRequired) body.reassignReason = values.reassignReason.trim()
  }
  return body.reservedAt === undefined && body.purpose === undefined && body.assigneeId === undefined ? null : body
}

/** 서버 400 fieldErrors의 필드 이름 → 칸 */
export function fieldOf(serverField: string): keyof FormErrors | null {
  if (serverField === 'vehicleId') return 'vehicle'
  if (serverField === 'reservedAt') return 'time'
  if (serverField === 'assigneeId') return 'assignee'
  if (serverField === 'reassignReason') return 'reassignReason'
  if (serverField.startsWith('purpose.memo')) return 'memo'
  if (serverField.startsWith('purpose')) return 'purpose'
  return null
}
