import TargetsPage from './TargetsPage.jsx'
import { PATHS } from '@/app/paths'

// S-04 재점검 대상 라우트 (app/routes.js가 모은다). 메뉴 순서는 09 0장: 홈 · 재점검 대상 · 고객·차량.
const route = {
  path: PATHS.TARGETS,
  element: <TargetsPage />,
  menu: { label: '재점검 대상', order: 20, icon: 'targets' },
}

export default route
