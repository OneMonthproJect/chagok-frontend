import HomePage from './HomePage.jsx'
import { PATHS } from '@/app/paths'

// S-02 홈 라우트 (app/routes.js가 모은다). 메뉴 첫 항목 "홈".
const route = { path: PATHS.HOME, element: <HomePage />, menu: { label: '홈', order: 10, icon: 'home' } }

export default route
