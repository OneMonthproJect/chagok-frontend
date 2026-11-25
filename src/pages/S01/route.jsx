import LoginPage from './LoginPage.jsx'
import { PATHS } from '@/app/paths'

// S-01 라우트 (app/routes.js가 모은다). 로그인 화면은 로그인 없이 열리고 AppLayout(메뉴) 밖이다.
const route = { path: PATHS.LOGIN, element: <LoginPage />, public: true }

export default route
