import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import RequireAuth from '@/app/RequireAuth.jsx'
import UnauthorizedRedirect from '@/app/UnauthorizedRedirect.jsx'
import AppLayout from '@/app/AppLayout.jsx'
import NotFoundPage from '@/app/NotFoundPage.jsx'
import { appRoutes, publicRoutes } from '@/app/routes'

// 라우팅 (chagok-frontend#17, FRONTEND_STRUCTURE 2장·11-1).
// - data router(createBrowserRouter): 이탈 확인(useBlocker)·스크롤 복원을 쓸 수 있게 골랐다 (설계 Q3). 둘 다 09에 없어 지금은 쓰지 않는다.
// - 화면은 pages/Sxx/route.jsx 를 routes.js가 모은다. 화면 이슈는 이 파일을 고치지 않는다.
//
//   Root (UnauthorizedRedirect: 401 → /login, from·reason)
//   ├─ 공개 라우트 (S-01)
//   └─ RequireAuth (토큰 없으면 /login, from)
//      └─ AppLayout (사이드바·위쪽 탭 + Outlet)
//         ├─ 화면 라우트 (S-02 …)
//         └─ *  NotFoundPage (로그인한 상태의 없는 주소)

function Root() {
  return (
    <>
      <UnauthorizedRedirect />
      <Outlet />
    </>
  )
}

const toRoute = ({ path, element }) => ({ path, element })

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      ...publicRoutes.map(toRoute),
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [...appRoutes.map(toRoute), { path: '*', element: <NotFoundPage /> }],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
