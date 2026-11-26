import CustomerListPage from './CustomerListPage.jsx'
import { PATHS } from '@/app/paths'

// S-05 고객·차량 목록 라우트 (app/routes.js가 모은다). 메뉴 순서는 09 0장: 홈 · 재점검 대상 · 고객·차량.
const route = {
  path: PATHS.CUSTOMERS,
  element: <CustomerListPage />,
  menu: { label: '고객·차량', order: 30, icon: 'customers' },
}

export default route
