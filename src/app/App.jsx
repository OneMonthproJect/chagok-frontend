import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from '@/app/RequireAuth.jsx'
import UnauthorizedRedirect from '@/app/UnauthorizedRedirect.jsx'
import loginRoute from '@/pages/S01/route.jsx'
import { PATHS } from '@/app/paths'

// 라우팅. 화면(pages)은 09의 S-xx와 1:1로 각 화면 이슈가 더한다.
// - PATHS.LOGIN: S-01 로그인 화면 (chagok-frontend#16). 라우트 수집 방식 정리는 앱 골격 이슈(#17).
// - RequireAuth 아래: 로그인이 필요한 화면(S-02 등)을 자식 Route로 둔다. 아직 없다(빈 화면을 만들지 않음).
// - 그 밖의 경로는 로그인 경로로 보낸다.
export default function App() {
  return (
    <BrowserRouter>
      <UnauthorizedRedirect />
      <Routes>
        <Route path={loginRoute.path} element={loginRoute.element} />
        <Route element={<RequireAuth />}>
          {/* 로그인이 필요한 화면을 여기에 (예: <Route path="/" element={<HomePage />} />) */}
        </Route>
        <Route path="*" element={<Navigate to={PATHS.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
