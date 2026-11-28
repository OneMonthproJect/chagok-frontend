// 정비·점검 항목 → 아이콘 키 (#110 20절). 화면(ItemIcon)과 테스트가 같은 규칙을 쓴다.
// 08 0.4 항목 code를 먼저 보고, code가 없는 응답은 기본 항목 이름으로 고른다
// (6개 항목 이름은 정비소마다 같고 바꾸는 API가 없다 — 08 27은 주기·켜기만, 새 항목 추가는 P2). 모르면 공구.

export type ItemIconKey = 'oil' | 'air' | 'ac' | 'brake' | 'tire' | 'battery' | 'tool'

const KEY_BY_CODE: Record<string, ItemIconKey> = {
  ENGINE_OIL: 'oil',
  AIR_CLEANER: 'air',
  AC_FILTER: 'ac',
  BRAKE_PAD: 'brake',
  TIRE: 'tire',
  BATTERY: 'battery',
}

/** 기본 항목 이름(08 13 예시·07 기본 기준표) → code */
const CODE_BY_NAME: Record<string, string> = {
  엔진오일: 'ENGINE_OIL',
  에어클리너: 'AIR_CLEANER',
  에어컨필터: 'AC_FILTER',
  브레이크패드: 'BRAKE_PAD',
  '타이어 상태 점검': 'TIRE',
  배터리: 'BATTERY',
}

export const ITEM_ICON_FALLBACK: ItemIconKey = 'tool'

export function itemIconKey({ code, name }: { code?: string | null; name?: string | null } = {}): ItemIconKey {
  const byCode = code ? KEY_BY_CODE[code] : undefined
  if (byCode) return byCode
  const byName = name ? KEY_BY_CODE[CODE_BY_NAME[name.trim()]] : undefined
  return byName ?? ITEM_ICON_FALLBACK
}
