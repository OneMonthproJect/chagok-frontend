// 항목 꼬리표 문구 (04 F-CYC-02, 09 0장 보조 표시 「지난 방문 거절」·「지난 점검 주의」).
// 08 10·14·17의 lastDecline·lastCaution `{ date, memo }`를 받는다. S-07·S-08(maintenance)·S-04(target)·S-02 패널(reservation)이
// 같은 문구를 쓰므로 여기 한 곳에 둔다(feature끼리 import하지 않음, CONVENTIONS 7장). API 타입은 모르고 모양만 받는다.
// 붙일지·사라질지는 서버가 정한다(값이 null이면 없음). 상태(StatusBadge)는 바꾸지 않는다.

export interface NoteValue {
  date: string // YYYY-MM-DD
  memo: string | null
}

export interface ItemNotes {
  lastDecline?: NoteValue | null
  lastCaution?: NoteValue | null
}

/**
 * "지난 방문 거절(2026.10.24)" · "지난 점검 주의(2026.09.24, 앞 타이어 마모)". 메모가 없으면 날짜만.
 * 두 조건은 "그 항목의 가장 최근 기록"이라 함께 오지 않지만(08 10), 둘 다 오면 거절 · 주의 순으로 잇는다. 없으면 undefined.
 */
export function itemNoteTag(item: ItemNotes): string | undefined {
  const tags: string[] = []
  if (item.lastDecline) tags.push(`지난 방문 거절(${item.lastDecline.date.replaceAll('-', '.')})`)
  if (item.lastCaution) {
    const detail = [item.lastCaution.date.replaceAll('-', '.'), item.lastCaution.memo].filter(Boolean).join(', ')
    tags.push(`지난 점검 주의(${detail})`)
  }
  return tags.length > 0 ? tags.join(' · ') : undefined
}

