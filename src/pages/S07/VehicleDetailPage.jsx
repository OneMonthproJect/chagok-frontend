import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PATHS, customerPath } from '@/app/paths'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'
import VehicleCustomerHeader from '@/features/customer/components/VehicleCustomerHeader.jsx'
import {
  GO_HOME_LABEL,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  listSearchFrom,
  parseVehicleId,
} from '@/features/customer/detailFlow'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL } from '@/features/customer/searchFlow'
import { useVehicleDetail } from '@/features/customer/useVehicleDetail'
import VisitHistory from '@/features/maintenance/components/VisitHistory.jsx'
import { ITEM_STATUS_NOTE, itemStatusTableRows } from '@/features/maintenance/maintenanceFlow'
import { useItemStatus } from '@/features/maintenance/useItemStatus'
import { useVisitHistory } from '@/features/maintenance/useVisitHistory'
import './VehicleDetailPage.css'

// S-07 차량 상세 (09 S-07·5장, F-CUS-05, 08 09·10·11, 디자인 v3.0 S-07-vehicle-detail).
// - 주소 `/vehicles/:vehicleId` → 09(차량·고객, features/customer) · 10(항목 상태, 주행거리 없이 날짜 기준) · 11(방문 이력) 을 함께 부른다.
//   두 feature는 이 화면에서만 합친다(CONVENTIONS 7장). 양의 정수가 아니면 부르지 않고 찾을 수 없음.
// - 상태(미확인/여유/임박/도래)·도래 근거·다음 정비일·다음 km는 서버 값 그대로(재계산 없음). 표는 shared/ui ItemStatusList(table).
// - 404(없는 차량·다른 정비소 차량, X2·X6)는 셋 중 하나라도 404면 "찾을 수 없습니다." + "홈으로"(09 5장, 있는지 드러내지 않음).
//   그 밖의 실패는 영역마다 "불러오지 못했습니다." + 사람이 누르는 "다시 불러오기"(POL-125).
// - 위쪽 "고객·차량"은 S-05로, 고객명은 S-06으로. S-05에서 이어 왔으면 그때의 검색어·쪽(`listSearch`)을 넘긴다.
// - 아직 연결하지 않는 것(연결 안 된 버튼 금지, 09 0장):
//   [방문 기록 → S-08]·이력 없음의 "방문 기록", [예약 → M-02] — S-08(#23)·M-02(#25) 머지 뒤 #22 후속 PR이 이 화면에 붙인다(#23·#25 범위에는 S-07이 없음).
//   [수정](#32)·기록 수정(#34)은 그 이슈가, [비활성화]·약식 도면은 P1.

export default function VehicleDetailPage() {
  const { vehicleId: rawId } = useParams()
  const location = useLocation()
  const vehicleId = parseVehicleId(rawId)
  const vehicle = useVehicleDetail(vehicleId)
  const itemStatus = useItemStatus(vehicleId)
  const history = useVisitHistory(vehicleId)
  const listSearch = listSearchFrom(location.state)

  return (
    <div className="s07">
      <header className="s07__header">
        <Link className="s07__back" to={`${PATHS.CUSTOMERS}${listSearch}`}>
          <span aria-hidden="true">‹</span> 고객·차량
        </Link>
        <h1 className="s07__title">차량 상세</h1>
      </header>
      <VehicleDetailBody vehicle={vehicle} itemStatus={itemStatus} history={history} listSearch={listSearch} />
    </div>
  )
}

function VehicleDetailBody({ vehicle, itemStatus, history, listSearch }) {
  const navigate = useNavigate()

  if ([vehicle.status, itemStatus.status, history.status].includes('notFound')) {
    return (
      <section className="s07__card">
        <EmptyState
          title={NOT_FOUND_TITLE}
          description={NOT_FOUND_DESCRIPTION}
          action={{ label: GO_HOME_LABEL, onClick: () => navigate(PATHS.HOME) }}
        />
      </section>
    )
  }

  if (vehicle.status === 'error') {
    return (
      <section className="s07__card s07__card--padded">
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={vehicle.error} onRetry={vehicle.reload} retryLabel={RELOAD_LABEL} />
      </section>
    )
  }

  if (!vehicle.data) {
    return (
      <div className="s07__skeleton" role="status" aria-label="불러오는 중">
        <span className="s07__skeleton-block s07__skeleton-block--header" />
        <span className="s07__skeleton-block s07__skeleton-block--body" />
      </div>
    )
  }

  const customer = vehicle.data.customer
  return (
    <div className="s07__body">
      <section className={`s07__card s07__card--padded${vehicle.status === 'loading' ? ' s07__card--refreshing' : ''}`}>
        <VehicleCustomerHeader
          vehicle={vehicle.data}
          customerLink={{ to: customerPath(customer.customerId), state: { listSearch } }}
        />
      </section>
      <div className="s07__columns">
        <section className="s07__card" aria-labelledby="s07-item-status-title">
          <header className="s07__section-header">
            <h2 id="s07-item-status-title" className="s07__section-title">
              점검 주기
            </h2>
            <p className="s07__section-meta">{ITEM_STATUS_NOTE}</p>
          </header>
          <ItemStatusSection itemStatus={itemStatus} />
        </section>
        <section className="s07__card">
          <VisitHistorySection history={history} />
        </section>
      </div>
    </div>
  )
}

function ItemStatusSection({ itemStatus }) {
  const { status, data, error, reload } = itemStatus
  if (status === 'error') {
    return (
      <div className="s07__section-body">
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />
      </div>
    )
  }
  if (!data) {
    return <span className="s07__section-loading" role="status" aria-label="불러오는 중" />
  }
  return <ItemStatusList variant="table" items={itemStatusTableRows(data.items)} loading={status === 'loading'} />
}

function VisitHistorySection({ history }) {
  const { status, visits, last, error, reload, hasMore, loadingMore, moreError, loadMore } = history
  if (status === 'error') {
    return (
      <div className="s07__section-body">
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />
      </div>
    )
  }
  if (status === 'loading' || !last) {
    return <span className="s07__section-loading" role="status" aria-label="불러오는 중" />
  }
  return (
    <VisitHistory
      visits={visits}
      totalElements={last.totalElements}
      hasMore={hasMore}
      loadingMore={loadingMore}
      moreError={moreError}
      onLoadMore={loadMore}
    />
  )
}
