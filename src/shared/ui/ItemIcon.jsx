import { itemIconKey } from '@/shared/lib/itemIconKey'
import './ItemIcon.css'

// 정비·점검 항목 아이콘 (UI·UX 통합 개선 20절, chagok-frontend#110). 항목 이름 왼쪽에 작은 선 아이콘을 둔다.
// - 항목은 08 0.4 code(ENGINE_OIL 등)로 고른다. code가 없는 응답(11 records·14 targetItems·17 itemStatuses 등)은
//   기본 항목 이름으로 고른다 — 6개 항목 이름은 정비소마다 같고 바꾸는 API가 없다(08 27은 주기·켜기만, 새 항목은 P2).
// - 모르는 항목은 공구 아이콘. 고르는 규칙은 shared/lib/itemIconKey 한 곳. 아이콘만으로 뜻을 전하지 않는다 — 이름을 항상 함께 쓰고 아이콘은 aria-hidden.
// - 상태·정렬·선택 동작과 무관하다(표시만).
// 사용: <ItemIcon code="ENGINE_OIL" /> · <ItemIcon name={record.itemName} />

// Lucide 계열 선 아이콘 모양(24 격자). 라이브러리는 설치하지 않는다
const SHAPES = {
  // 오일 방울
  oil: [['path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' }]],
  // 흡기(바람)
  air: [['path', { d: 'M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2' }]],
  // 냉방(눈송이)
  ac: [['path', { d: 'M2 12h20M12 2v20m8-6-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4' }]],
  // 브레이크 디스크 + 패드
  brake: [
    ['circle', { cx: 12, cy: 12, r: 8 }],
    ['circle', { cx: 12, cy: 12, r: 2.5 }],
    ['path', { d: 'M17.5 3.5a10 10 0 0 1 3 3.5' }],
  ],
  // 타이어(바퀴 + 트레드)
  tire: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['circle', { cx: 12, cy: 12, r: 4 }],
    ['path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4' }],
  ],
  // 자동차 배터리(단자 두 개, +·−)
  battery: [
    ['rect', { x: 3, y: 7, width: 18, height: 13, rx: 2 }],
    ['path', { d: 'M7 7V5h3v2M14 7V5h3v2M6.5 13.5h3M14.5 13.5h3M16 12v3' }],
  ],
  // 정비 공구(렌치) — 기타·모르는 항목
  tool: [['path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }]],
}

export default function ItemIcon({ code, name, size = 16 }) {
  const key = itemIconKey({ code, name })
  return (
    <svg
      className="item-icon"
      data-icon={key}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[key].map(([Tag, props], i) => <Tag key={i} {...props} />)}
    </svg>
  )
}

/** 이름 앞에 아이콘을 붙인 묶음(줄바꿈 없이). 이름 글자는 그대로 읽힌다 */
export function ItemLabel({ code, name, className }) {
  return (
    <span className={`item-label${className ? ` ${className}` : ''}`}>
      <ItemIcon code={code} name={name} />
      {name}
    </span>
  )
}
