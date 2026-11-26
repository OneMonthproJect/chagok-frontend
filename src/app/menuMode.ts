// 메뉴 모양 (FRONTEND_STRUCTURE 7장, 디자인 v3.0 RWD):
//   ≥ 1440        왼쪽 216px 펼침
//   1024 – 1439   자동 접힘 76px (사용자가 펼치거나 접으면 그 선택을 유지)
//   < 1024        위쪽 탭 48px
// 화면 없이 테스트하도록 순수 함수로 둔다.

export type MenuMode = 'expanded' | 'collapsed' | 'top'

export const BP_TOP_TABS = 1024
export const BP_AUTO_EXPAND = 1440

/** userExpanded: 사용자가 버튼으로 고른 값(null = 고른 적 없음 → 폭으로 정함) */
export function menuMode(width: number, userExpanded: boolean | null): MenuMode {
  if (width < BP_TOP_TABS) return 'top'
  if (userExpanded !== null) return userExpanded ? 'expanded' : 'collapsed'
  return width >= BP_AUTO_EXPAND ? 'expanded' : 'collapsed'
}
