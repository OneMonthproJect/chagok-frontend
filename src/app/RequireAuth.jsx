import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getToken } from '@/shared/lib/tokenStore'
import { PATHS } from '@/app/paths'

// 로그인 가드: 토큰이 없으면 로그인 화면으로. 로그인이 필요한 화면은 App.jsx에서 이 경로의 자식으로 둔다.
// 토큰이 만료·위조되었는지는 서버가 판단하고(401), client가 토큰을 지운 뒤 UnauthorizedRedirect가 로그인으로 보낸다.
export default function RequireAuth() {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
