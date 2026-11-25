import { NavLink } from 'react-router-dom'
import ChagokLogo from '@/features/auth/components/ChagokLogo.jsx'
import AppHeader from '@/app/AppHeader.jsx'
import MenuIcon from '@/app/menuIcons.jsx'
import { PATHS } from '@/app/paths'

// 메뉴 (09 0장, 디자인 v3.0, chagok-frontend#17). 항목은 각 화면의 route.jsx 가 menu 로 선언한 것만(routes.js).
//   mode 'expanded' | 'collapsed' → 왼쪽 사이드바, 'top' → 위쪽 줄 + 탭
export default function AppMenu({ items, mode, onToggle }) {
  if (mode === 'top') {
    return (
      <header className="top-bar">
        <div className="top-bar__row">
          <Brand size={32} />
          <AppHeader variant="top" />
        </div>
        {items.length > 0 && (
          <nav className="top-tabs" aria-label="주 메뉴">
            {items.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === PATHS.HOME} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                <MenuIcon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
    )
  }

  const collapsed = mode === 'collapsed'
  return (
    <aside className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}>
      <Brand size={40} />
      <nav className="sidebar-nav" aria-label="주 메뉴">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === PATHS.HOME}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            aria-label={collapsed ? item.label : undefined}
            data-tip={item.label}
          >
            <MenuIcon name={item.icon} />
            <span className={item.icon ? undefined : 'sidebar-item__fallback'}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <AppHeader variant="sidebar" />
        <button
          type="button"
          className="sidebar-item sidebar-item--subtle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          data-tip="메뉴 펼치기"
          onClick={onToggle}
        >
          <MenuIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={18} />
          <span>메뉴 접기</span>
        </button>
      </div>
    </aside>
  )
}

function Brand({ size }) {
  return (
    <div className="sidebar-brand">
      <ChagokLogo size={size} />
      <span>차곡</span>
    </div>
  )
}
