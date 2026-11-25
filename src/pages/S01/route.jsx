import LoginPage from './LoginPage.jsx'
import { PATHS } from '@/app/paths'

// S-01 라우트 정의. 로그인 화면은 공통 머리·메뉴(AppLayout) 밖이고 메뉴 항목이 없다.
// 앱 골격 이슈(chagok-frontend#17)가 라우트 수집 형식 { path, element, menu? }에 맞춰 App.jsx에서 모은다.
const route = { path: PATHS.LOGIN, element: <LoginPage /> }

export default route
