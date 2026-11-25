import CustomerDetailPage from './CustomerDetailPage.jsx'
import { PATHS } from '@/app/paths'

// S-06 고객 상세 라우트 (app/routes.js가 모은다). 메뉴 항목은 없다 — S-05 줄에서 들어오고, 메뉴는 "고객·차량"이 켜진다.
const route = {
  path: PATHS.CUSTOMER_DETAIL,
  element: <CustomerDetailPage />,
}

export default route
