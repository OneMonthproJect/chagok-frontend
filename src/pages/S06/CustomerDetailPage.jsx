import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PATHS, vehiclePath } from '@/app/paths'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import CustomerInfoCard from '@/features/customer/components/CustomerInfoCard.jsx'
import CustomerVehicleList from '@/features/customer/components/CustomerVehicleList.jsx'
import {
  GO_HOME_LABEL,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  listSearchFrom,
  parseCustomerId,
} from '@/features/customer/detailFlow'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL } from '@/features/customer/searchFlow'
import { useCustomerDetail } from '@/features/customer/useCustomerDetail'
import './CustomerDetailPage.css'

// S-06 고객 상세 (09 S-06·5장, F-CUS-04, 08 07, 디자인 v3.0 Customer-Detail-*).
// - 주소 `/customers/:customerId` → 07. 양의 정수가 아니면 부르지 않고 찾을 수 없음.
// - 404(없는 고객·다른 정비소 고객, X1)는 "찾을 수 없습니다." + "홈으로", 그 밖의 실패는 "불러오지 못했습니다." + 사람이 누르는
//   "다시 불러오기"(09 5장, POL-125). 디자인 v3.0의 "고객 정보를 불러오지 못했습니다."와 다르면 09가 우선(design README).
// - 위쪽 "고객·차량"은 S-05로. S-05 줄에서 왔으면 그때의 검색어·쪽(`?q=&page=`)으로 돌아간다.
// - 차량 카드를 누르면 S-07(#22). S-05에서 가져온 검색(`listSearch`)을 넘겨 S-07의 "고객·차량"도 같은 목록으로 돌아가게 한다.
// - 이 화면에 아직 없는 것: 차량 추가(#21), 수정(#32), 지표·비활성화·삭제(P1). 버튼을 미리 두지 않는다.

export default function CustomerDetailPage() {
  const { customerId: rawId } = useParams()
  const location = useLocation()
  const customerId = parseCustomerId(rawId)
  const detail = useCustomerDetail(customerId)
  const listSearch = listSearchFrom(location.state)
  const backTo = `${PATHS.CUSTOMERS}${listSearch}`
  const vehicleLink = (vehicle) => ({ to: vehiclePath(vehicle.vehicleId), state: { listSearch } })

  return (
    <div className="s06">
      <header className="s06__header">
        <Link className="s06__back" to={backTo}>
          <span aria-hidden="true">‹</span> 고객·차량
        </Link>
        <h1 className="s06__title">고객 상세</h1>
      </header>
      <CustomerDetailBody detail={detail} vehicleLink={vehicleLink} />
    </div>
  )
}

function CustomerDetailBody({ detail, vehicleLink }) {
  const navigate = useNavigate()
  const { status, data, error, reload } = detail

  if (status === 'notFound') {
    return (
      <section className="s06__card">
        <EmptyState
          title={NOT_FOUND_TITLE}
          description={NOT_FOUND_DESCRIPTION}
          action={{ label: GO_HOME_LABEL, onClick: () => navigate(PATHS.HOME) }}
        />
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="s06__card s06__card--padded">
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />
      </section>
    )
  }

  if (!data) {
    return (
      <div className="s06__skeleton" role="status" aria-label="불러오는 중">
        <span className="s06__skeleton-block s06__skeleton-block--info" />
        <span className="s06__skeleton-block s06__skeleton-block--vehicles" />
      </div>
    )
  }

  return (
    <div className={`s06__body${status === 'loading' ? ' s06__body--refreshing' : ''}`} aria-busy={status === 'loading'}>
      <section className="s06__card s06__card--padded">
        <CustomerInfoCard customer={data} />
      </section>
      <section className="s06__card">
        <CustomerVehicleList vehicles={data.vehicles} vehicleLink={vehicleLink} />
      </section>
    </div>
  )
}
