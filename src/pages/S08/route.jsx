import VisitRecordPage from './VisitRecordPage.jsx'
import { PATHS } from '@/app/paths'

// S-08 방문·정비 기록 라우트 (app/routes.js가 모은다). 메뉴 항목은 없다 —
// 예약 상세 패널의 방문 완료(S-02)·차량 상세(S-07)에서 `?vehicleId=`(·`?reservationId=`)로 들어온다. 쿼리가 없으면 화면에서 차량을 검색한다.
const route = {
  path: PATHS.VISIT_NEW,
  element: <VisitRecordPage />,
}

export default route
