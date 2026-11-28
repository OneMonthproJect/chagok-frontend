// 메뉴 아이콘 (사이드바·위쪽 탭의 선 아이콘). route.jsx 의 menu.icon 이름으로 고른다.
// UI·UX 통합 개선 18절(#110): 메뉴 뜻이 보이는 Lucide 계열 모양으로 바꿨다(라이브러리는 설치하지 않고 경로만 둔다).
//   home = LayoutDashboard · targets(재점검 대상) = ClipboardCheck · customers(고객·차량) = CarFront · logout = LogOut.
//   크기·선 굵기(1.7)·색(currentColor — 기본 보조 글자색, 활성 메뉴는 흰색)은 이전과 같다.
const SHAPES_BY_ICON = {
  home: [
    ['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1 }],
    ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1 }],
    ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1 }],
    ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1 }],
  ],
  targets: [
    ['rect', { x: 8, y: 2, width: 8, height: 4, rx: 1 }],
    ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }],
    ['path', { d: 'm9 14 2 2 4-4' }],
  ],
  customers: [
    ['path', { d: 'm21 8-2 2-1.5-3.7A2 2 0 0 0 15.65 5H8.4a2 2 0 0 0-1.9 1.26L5 10 3 8' }],
    ['path', { d: 'M7 14h.01M17 14h.01' }],
    ['rect', { x: 3, y: 10, width: 18, height: 8, rx: 2 }],
    ['path', { d: 'M5 18v2M19 18v2' }],
  ],
  logout: [['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }], ['path', { d: 'm16 17 5-5-5-5M21 12H9' }]],
  // 정비소(Lucide Store 단순화) — 홈 머리의 정비소명 앞 (#110 4절)
  shop: [
    ['path', { d: 'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7M2 7h20' }],
    ['path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4M2 7v3a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V7' }],
  ],
  chevronRight: [['path', { d: 'm9 18 6-6-6-6' }]],
  chevronLeft: [['path', { d: 'm15 18-6-6 6-6' }]],
}

export default function MenuIcon({ name, size = 20 }) {
  const shapes = SHAPES_BY_ICON[name]
  if (!shapes) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes.map(([Tag, props], i) => <Tag key={i} {...props} />)}
    </svg>
  )
}
