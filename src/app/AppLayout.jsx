import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppMenu from '@/app/AppMenu.jsx'
import { menu } from '@/app/routes'
import { menuMode } from '@/app/menuMode'
import './AppLayout.css'

// 로그인한 화면의 틀: 메뉴 + 본문 Outlet (09 0장, FRONTEND_STRUCTURE 2장·7장, chagok-frontend#17).
// 사이드바 접힘 선택은 화면 상태에만 둔다(새로 고치면 폭 기준으로 다시 정함, 브라우저 저장소 안 씀).
// 토스트 자리(ToastHost)는 공통 Toast(#18)가 생긴 뒤 더한다.
export default function AppLayout() {
  const width = useViewportWidth()
  const [userExpanded, setUserExpanded] = useState(null)
  const mode = menuMode(width, userExpanded)

  return (
    <div className="app-shell">
      <AppMenu items={menu} mode={mode} onToggle={() => setUserExpanded(mode !== 'expanded')} />
      <main className={`app-main app-main--${mode}`}>
        <Outlet />
      </main>
    </div>
  )
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}
