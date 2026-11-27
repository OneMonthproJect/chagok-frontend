// 정비 기록·항목 상태의 표시 규칙·문구 (09 S-07·5장, 04 F-CUS-05·F-CYC-01, 08 10·11). 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// 상태(미확인/여유/임박/도래)·도래 근거·다음 정비일·다음 정비 km는 서버(08 10) 값 그대로 쓴다.
// 여기서 날짜·주행거리로 상태나 다음 정비일을 계산하지 않는다(CONVENTIONS 7장). 바꾸는 것은 글자 모양(날짜 점 표기·천 단위 쉼표)뿐이다.

import { itemNoteTag } from '@/shared/lib/noteTag'
import { CUSTOMER_STATEMENT_LABEL } from '@/shared/lib/recordDisplay'
import type { BaseRecord, ItemStatusItem, RecordType, Visit, VisitListResponse } from './types'

/** 08 0.4 정비 구분 글자 */
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  REPLACE: '교체',
  INSPECT: '점검',
  EXTERNAL: '외부',
  DECLINE: '거절',
}

/**
 * 외부 기록 표시 (09 S-07 「외부는 "고객 진술" 표시」, 08 0.4 출처 CUSTOMER_STATEMENT)·점검 결과 글자(F-MNT-03)·고객 진술 판정.
 * S-02 패널(reservation)과 같이 쓰므로 shared/lib/recordDisplay에 두고 여기서는 다시 내보낸다(이 feature 안의 import는 그대로).
 * 10 baseRecord에는 source가 없어 type EXTERNAL로 정한다(baseRecordText). 정비 이력(08 11)은 isCustomerStatement.
 */
export { CUSTOMER_STATEMENT_LABEL, INSPECT_RESULT_LABELS, isCustomerStatement } from '@/shared/lib/recordDisplay'

/** 빈 상태 (09 5장 S-07 이력 없음) + 이어지는 버튼 */
export const NO_HISTORY_MESSAGE = '정비 이력이 없습니다.'
/** S-07 머리 버튼·이력 없음 버튼 (09 S-07·5장) → S-08 */
export const RECORD_VISIT_LABEL = '방문 기록'

/** 점검 주기 영역 설명 (04 F-CYC-01 기준 기록, T12·T13) */
export const ITEM_STATUS_NOTE = '마지막 교체·외부 기록이 기준입니다. 점검·거절 기록은 기준이 아닙니다.'

/** 점검 주기 표 열 (09 S-07: 항목 · 상태 · 기준 기록(날짜·km·구분) · 다음 정비일 · 다음 정비 km) */
export const ITEM_STATUS_COLUMNS = {
  BASE: '기준 기록',
  NEXT_DATE: '다음 정비일',
  NEXT_KM: '다음 정비 km',
} as const

/** 도래 근거 표시 (04 F-CUS-05 출력 「근거」, 08 10 dueReason). 근거가 된 칸 값 뒤에 붙인다 */
export const DUE_REASON_SUFFIX = ' (도래 근거)'

export const SHOW_MORE_LABEL = '더 보기'
export const MORE_FAILED_MESSAGE = '이력을 더 불러오지 못했습니다.'

/** "2026-09-24" → "2026.09.24" (글자만 바꾼다, 시간대 변환 없음) */
export function dateText(date: string): string {
  return date.replaceAll('-', '.')
}

/** 45000 → "45,000 km", 비었으면 null */
export function kmText(mileage: number | null): string | null {
  return mileage == null ? null : `${mileage.toLocaleString('ko-KR')} km`
}

/** 기준 기록 "2026.09.24 · 45,000 km · 교체" (km가 없으면 빼고, 외부는 "외부(고객 진술)"). 없으면 null(미확인) */
export function baseRecordText(baseRecord: BaseRecord | null): string | null {
  if (!baseRecord) return null
  const type = baseRecord.type === 'EXTERNAL' ? `${RECORD_TYPE_LABELS.EXTERNAL}(${CUSTOMER_STATEMENT_LABEL})` : RECORD_TYPE_LABELS[baseRecord.type]
  return [dateText(baseRecord.date), kmText(baseRecord.mileage), type].filter(Boolean).join(' · ')
}

/** shared/ui/ItemStatusList의 한 줄 모양 (API 타입을 모르는 공통 UI에 넘긴다) */
export interface ItemStatusRow {
  id: number
  name: string
  status: ItemStatusItem['status']
  tag?: string
  details: { label: string; value: string | null }[]
}

/** 08 10 items[] → ItemStatusList variant="table"·"preview" 줄. 순서는 받은 순서(sortOrder) 그대로 */
export function itemStatusTableRows(items: ItemStatusItem[]): ItemStatusRow[] {
  return items.map((item) => {
    const nextDate = item.nextDueDate == null ? null : dateText(item.nextDueDate)
    const nextKm = kmText(item.nextDueMileage)
    return {
      id: item.itemId,
      name: item.name,
      status: item.status,
      tag: itemNoteTag(item),
      details: [
        { label: ITEM_STATUS_COLUMNS.BASE, value: baseRecordText(item.baseRecord) },
        { label: ITEM_STATUS_COLUMNS.NEXT_DATE, value: nextDate && item.dueReason === 'DATE' ? nextDate + DUE_REASON_SUFFIX : nextDate },
        { label: ITEM_STATUS_COLUMNS.NEXT_KM, value: nextKm && item.dueReason === 'KM' ? nextKm + DUE_REASON_SUFFIX : nextKm },
      ],
    }
  })
}

/** 정비 이력 머리 아래 (디자인 v3.0 S-07). 방문 수는 서버 totalElements(방문 묶음 수) 그대로 */
export function visitCountText(totalElements: number): string {
  return `방문 단위 · 최신순 · 방문 ${totalElements}회`
}

/** 방문 줄 보조 글: "45,000 km · 김정비" (주행거리가 비었으면 "—") */
export function visitMetaText(visit: Pick<Visit, 'mileage' | 'staffName'>): string {
  return `${kmText(visit.mileage) ?? '—'} · ${visit.staffName}`
}

/** 마지막으로 받은 쪽 뒤에 더 있는지 (서버 totalPages 기준) */
export function hasMoreVisits(last: Pick<VisitListResponse, 'page' | 'totalPages'> | null): boolean {
  return last != null && last.page + 1 < last.totalPages
}

/**
 * 더 보기로 받은 쪽을 앞 목록 뒤에 붙인다. 그사이 새 방문이 저장돼 쪽 경계가 밀리면 같은 visitKey가 다시 올 수 있어 한 번만 둔다.
 * LIMIT: 밀려서 빠지는 방문은 없다(최신순이라 새 방문은 맨 앞에 생기고 뒤로만 밀린다) / 다시 불러오기 하면 처음부터 다시 받는다.
 */
export function appendVisits(current: Visit[], next: Visit[]): Visit[] {
  const seen = new Set(current.map((visit) => visit.visitKey))
  return [...current, ...next.filter((visit) => !seen.has(visit.visitKey))]
}

/**
 * S-08 저장 전 미리보기 문구 (09 S-08 3번, 04 F-VIS-01, 05 POL-04, 디자인 v3.0 S-08 미리보기 카드).
 * "확인이 필요한 항목"으로 쓰고 진단 표현을 쓰지 않는다.
 */
export const PREVIEW_MESSAGES = {
  CHIP: '저장 전 미리보기 — 기록되지 않음',
  TITLE: '확인이 필요한 항목',
  STATE_LOADING: '불러오는 중',
  STATE_FAILED: '불러오지 못함',
  STATE_READY: '최신',
  FAILED: '미리보기를 불러오지 못했습니다.',
  NO_EFFECT: '기록 저장에는 영향이 없습니다.',
} as const

/**
 * 미리보기 판정 기준 한 줄 (디자인 v3.0). 기준일·주행거리는 서버 응답(08 10 asOf·inputMileage) 그대로 보인다.
 * "판정 기준일 오늘(2026.11.24) · 날짜 + 입력한 주행거리 55,000 km 기준. 방문일은 미리보기 기준을 바꾸지 않습니다."
 */
export function previewBasisText(data: { asOf: string; inputMileage: number | null }): string {
  const basis =
    data.inputMileage == null ? '날짜 기준만 — 주행거리를 넣으면 거리 기준도 봅니다' : `날짜 + 입력한 주행거리 ${kmText(data.inputMileage)} 기준`
  return `판정 기준일 오늘(${dateText(data.asOf)}) · ${basis}. 방문일은 미리보기 기준을 바꾸지 않습니다.`
}
