import { useNavigate } from 'react-router-dom'
import { ROLE_LABEL, logout } from '@/features/auth/api'
import { useMe } from '@/features/auth/useMe'
import { PATHS } from '@/app/paths'
import MenuIcon from '@/app/menuIcons.jsx'

// 공통 머리 (09 0장): 정비소명·이름·역할(API 03) + 로그아웃 (chagok-frontend#17).
// 디자인 v3.0은 머리 줄이 따로 없고, 넓은 화면은 사이드바 아래쪽, 좁은 화면은 위쪽 줄 오른쪽에 둔다(variant).
// 로그아웃 = 토큰 삭제 후 로그인 화면, "로그아웃했습니다." 안내 (05 POL-12, 디자인 S-01 상태 07).
// TODO(S-08 #23): 작성 중인 기록이 있으면 로그아웃 전에 이탈 확인.
export default function AppHeader({ variant = 'sidebar' }) {
  const navigate = useNavigate()
  const { me } = useMe()

  const role = me ? ROLE_LABEL[me.role] ?? me.role : ''
  const summary = me ? `${me.shopName} · ${me.name} ${role}` : ''

  function handleLogout() {
    logout()
    navigate(PATHS.LOGIN, { replace: true, state: { reason: 'logout' } })
  }

  if (variant === 'top') {
    return (
      <div className="top-bar__account">
        {me && <span>{summary}</span>}
        <button type="button" className="app-logout" onClick={handleLogout}>
          <MenuIcon name="logout" size={16} />
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="sidebar-account" data-tip={summary || undefined}>
        <i aria-hidden="true">{me ? me.name.slice(0, 1) : ''}</i>
        <div>
          <b>{me ? me.shopName : ' '}</b>
          <small>{me ? `${me.name} · ${role}` : ' '}</small>
        </div>
      </div>
      <button type="button" className="sidebar-item sidebar-item--subtle" aria-label="로그아웃" data-tip="로그아웃" onClick={handleLogout}>
        <MenuIcon name="logout" size={18} />
        <span>로그아웃</span>
      </button>
    </>
  )
}
