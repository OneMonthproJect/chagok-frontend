import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PATHS, vehiclePath } from '@/app/paths'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import AddVehicleInline from '@/features/customer/components/AddVehicleInline.jsx'
import CustomerEditForm from '@/features/customer/components/CustomerEditForm.jsx'
import CustomerInfoCard from '@/features/customer/components/CustomerInfoCard.jsx'
import CustomerVehicleList from '@/features/customer/components/CustomerVehicleList.jsx'
import {
  GO_HOME_LABEL,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  listSearchFrom,
  parseCustomerId,
} from '@/features/customer/detailFlow'
import { EDIT_LABEL } from '@/features/customer/editFlow'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL } from '@/features/customer/searchFlow'
import { useCustomerDetail } from '@/features/customer/useCustomerDetail'
import './CustomerDetailPage.css'

// S-06 고객 상세 (09 S-06·5장, F-CUS-04, 08 07, 디자인 v3.0 Customer-Detail-*).
// - 주소 `/customers/:customerId` → 07. 양의 정수가 아니면 부르지 않고 찾을 수 없음.
// - 404(없는 고객·다른 정비소 고객, X1)는 "찾을 수 없습니다." + "홈으로", 그 밖의 실패는 "불러오지 못했습니다." + 사람이 누르는
//   "다시 불러오기"(09 5장, POL-125). 디자인 v3.0의 "고객 정보를 불러오지 못했습니다."와 다르면 09가 우선(design README).
// - 위쪽 "고객·차량"은 S-05로. S-05 줄에서 왔으면 그때의 검색어·쪽(`?q=&page=`)으로 돌아간다.
// - 차량 카드를 누르면 S-07(#22). S-05에서 가져온 검색(`listSearch`)을 넘겨 S-07의 "고객·차량"도 같은 목록으로 돌아가게 한다.
// - 차량 추가(#21): [차량 추가]를 누르면 차량 영역 머리 아래에 인라인 입력(09 S-06). 저장하면 07을 다시 불러온다.
//   S-05 M-01의 "이 고객에 차량 추가"는 `state.openAddVehicle`로 보내 이 입력을 연 채 시작한다(#19).
// - 고객 수정(#32, 08 22): 고객 정보 카드의 [수정] → 카드 아래 인라인 입력. 저장하면 닫고 07을 다시 불러온다.
//   409 동시 수정이면 07을 다시 불러 카드에 최신 값을 보이고 입력은 그대로 둔다(최신 version은 다시 부른 07 값을 쓴다, POL-124).
//   S-05 M-01의 "기존 고객 수정"은 `state.openEdit`로 보내 이 입력을 연 채 시작한다.
//   다시 불러오기(07)가 실패해도 이전 data를 남겨 입력을 보존하고, 카드 위에 "불러오지 못했습니다." + [다시 불러오기]를 보인다.
// - 이 화면에 아직 없는 것: 지표·비활성화·삭제(P1). 버튼을 미리 두지 않는다.

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
      <CustomerDetailBody
        detail={detail}
        vehicleLink={vehicleLink}
        customerId={customerId}
        openAddVehicle={location.state?.openAddVehicle === true}
        openEdit={location.state?.openEdit === true}
      />
    </div>
  )
}

function CustomerDetailBody({ detail, vehicleLink, customerId, openAddVehicle, openEdit }) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(openAddVehicle)
  const [editing, setEditing] = useState(openEdit)
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

  if (status === 'error' && !data) {
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
        {status === 'error' && <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />}
        <div className="s06__info-row">
          <CustomerInfoCard customer={data} />
          {!editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {EDIT_LABEL}
            </Button>
          )}
        </div>
        {editing && (
          <div className="s06__edit">
            <CustomerEditForm
              customer={data}
              refreshing={status === 'loading'}
              onSaved={(kind) => {
                setEditing(false)
                if (kind === 'saved') reload()
              }}
              onConflict={reload}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}
      </section>
      <section className="s06__card">
        <CustomerVehicleList
          vehicles={data.vehicles}
          vehicleLink={vehicleLink}
          onAddVehicle={adding ? undefined : () => setAdding(true)}
          addForm={
            adding && (
              <AddVehicleInline
                customerId={customerId}
                onAdded={() => {
                  setAdding(false)
                  reload()
                }}
                onCancel={() => setAdding(false)}
              />
            )
          }
        />
      </section>
    </div>
  )
}
