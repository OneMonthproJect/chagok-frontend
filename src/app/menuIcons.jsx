// 메뉴 아이콘 (디자인 v3.0 사이드바·위쪽 탭의 선 아이콘). route.jsx 의 menu.icon 이름으로 고른다.
const PATHS_BY_ICON = {
  home: ['m3 10 9-7 9 7', 'M5 9v11h14V9M9 20v-6h6v6'],
  targets: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h11', 'M8.8 19a3 3 0 0 0 4.4 0M16 13l2 2 4-5'],
  customers: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5M21 12H9'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
}

export default function MenuIcon({ name, size = 20 }) {
  const paths = PATHS_BY_ICON[name]
  if (!paths) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
      {name === 'customers' && <circle cx="9" cy="7" r="4" />}
    </svg>
  )
}
