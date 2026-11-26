import VehicleDetailPage from './VehicleDetailPage.jsx'
import { PATHS } from '@/app/paths'

// S-07 차량 상세 라우트 (app/routes.js가 모은다). 메뉴 항목은 없다 — S-06 차량 카드에서 들어온다.
const route = {
  path: PATHS.VEHICLE_DETAIL,
  element: <VehicleDetailPage />,
}

export default route
