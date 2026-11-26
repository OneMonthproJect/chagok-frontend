import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PATHS, QUERY, vehiclePath } from '@/app/paths'
import { NETWORK_ERROR } from '@/shared/api/client'
import { todaySeoul } from '@/shared/lib/date'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import VehicleCustomerHeader from '@/features/customer/components/VehicleCustomerHeader.jsx'
import VehiclePicker from '@/features/customer/components/VehiclePicker.jsx'
import { GO_HOME_LABEL, NOT_FOUND_DESCRIPTION, NOT_FOUND_TITLE, parseVehicleId } from '@/features/customer/detailFlow'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL } from '@/features/customer/searchFlow'
import { useVehicleDetail } from '@/features/customer/useVehicleDetail'
import { saveVisit } from '@/features/maintenance/api'
import ItemRecordRows from '@/features/maintenance/components/ItemRecordRows.jsx'
import VisitInfoForm from '@/features/maintenance/components/VisitInfoForm.jsx'
import { useServiceItems } from '@/features/maintenance/useServiceItems'
import {
  VISIT_MESSAGES as M,
  fieldErrorsToVisitForm,
  hasMissing,
  hasVisitErrors,
  initialVisitRecordForm,
  missingNoticeText,
  recordItems,
  rowOf,
  selectedRows,
  selectionSummary,
  toVisitSaveRequest,
  validateVisitRecordForm,
  vehicleMissing,
} from '@/features/maintenance/visitRecordFlow'
import './VisitRecordPage.css'

// S-08 방문·정비 기록 (09 S-08·5장, 04 F-MNT-01, 08 09·12·13, 05 POL-30·120~125, D-58, 디자인 v3.0 S-08-visit-record).
// - 주소 `/visits/new?vehicleId=&reservationId=`. vehicleId가 있으면 09로 차량을 불러 채우고, 없으면 VehiclePicker로 검색해 고른다
//   (고르면 주소에 vehicleId를 넣는다). customer(차량)와 maintenance(기록)는 이 화면에서만 합친다(CONVENTIONS 7장).
// - reservationId는 받아만 둔다: 예약과 기록은 데이터로 잇지 않는다(08 12, 05 POL-95). 예약에서 왔으면 차량을 바꾸지 못하게만 한다.
//   P0-나머지의 담당 정비사 기본값(예약의 담당)에서 쓴다.
// - 방문일 기본 = 서울 기준 오늘(shared/lib/date). 문자열 그대로 보낸다.
// - 저장(08 12)은 1개 이상 골랐을 때만 활성. 저장 중 비활성·두 번 눌러도 한 번(Button, POL-120). 성공하면 S-07로(replace).
//   400은 칸 옆 + 위쪽 안내, 입력값 유지(POL-121). 그 밖의 실패는 위쪽 안내 + 사람이 누르는 "다시 시도"(자동 재전송 없음, POL-125).
//   응답 없음(NETWORK_ERROR)은 실제로는 저장됐을 수 있다(12는 요청마다 새 방문, 삭제 없음). 그래서 S-07을 새 창으로 여는 링크를 함께 보여
//   입력값을 잃지 않고 이력에서 저장 여부를 확인한 뒤 다시 시도하게 한다(08 0.2 표).
// - 차량을 바꾸면 입력을 처음으로 되돌린다(앞 차량의 주행거리·기록이 다른 차량에 저장되지 않게).
// - 이번 이슈에 없는 것(09 0장 연결 안 된 버튼 금지): 저장 전 미리보기(#35), 거절·외부·점검 결과·담당 정비사(P0-나머지).
//   디자인의 이탈 확인 대화상자·저장 토스트·관련 예약 표시는 09에 없어 넣지 않았다.

const INFO_FIELDS = ['visitDate', 'mileage', 'modelYear']

export default function VisitRecordPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const rawVehicleId = params.get(QUERY.VEHICLE_ID)
  const hasVehicleParam = rawVehicleId !== null
  const vehicleId = hasVehicleParam ? parseVehicleId(rawVehicleId) : null
  const fromReservation = params.get(QUERY.RESERVATION_ID) !== null
  const vehicle = useVehicleDetail(vehicleId)
  const items = useServiceItems()

  const [today] = useState(() => todaySeoul())
  const [form, setForm] = useState(() => initialVisitRecordForm(today))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)

  const rows = items.data ? recordItems(items.data) : []
  const vehicleData = vehicle.status === 'ready' || vehicle.status === 'loading' ? vehicle.data : null
  const missing = vehicleData ? vehicleMissing(vehicleData) : { modelYear: false, latestMileage: false }
  const selected = selectedRows(form, rows).length
  const canSave = vehicleData != null && vehicleData.vehicleId === vehicleId && rows.length > 0 && selected > 0

  function setVehicle(nextId) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextId == null) next.delete(QUERY.VEHICLE_ID)
        else next.set(QUERY.VEHICLE_ID, String(nextId))
        return next
      },
      { replace: true },
    )
    // 다른 차량의 기록이 되지 않도록 입력을 처음으로 되돌린다(주행거리 갱신·기록은 P0-핵심에서 되돌릴 수 없음, 04 F-MNT-01)
    setForm(initialVisitRecordForm(today))
    setErrors({})
    setSaveError(null)
  }

  function clearError(field) {
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function changeField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (INFO_FIELDS.includes(field)) clearError(field)
  }

  function changeRow(itemId, patch) {
    setForm((prev) => ({ ...prev, records: { ...prev.records, [itemId]: { ...rowOf(prev, itemId), ...patch } } }))
    setErrors((prev) => {
      if (!prev.memo?.[itemId] && !prev.form) return prev
      const memo = { ...prev.memo }
      delete memo[itemId]
      const next = { ...prev, memo }
      if (Object.keys(memo).length === 0) delete next.memo
      delete next.form
      return next
    })
  }

  async function save() {
    if (!canSave) return
    setSaveError(null)
    const found = validateVisitRecordForm(form, rows, missing, today)
    setErrors(found)
    if (hasVisitErrors(found)) return
    const body = toVisitSaveRequest(form, rows, missing)
    try {
      await saveVisit(vehicleId, body)
      navigate(vehiclePath(vehicleId), { replace: true })
    } catch (error) {
      if (error?.code === 'INVALID_INPUT' && error.fieldErrors?.length > 0) {
        setErrors(fieldErrorsToVisitForm(error.fieldErrors, body.records.map((record) => record.itemId)))
      } else {
        setSaveError(error)
      }
    }
  }

  function cancel() {
    if (location.key !== 'default') navigate(-1)
    else navigate(vehicleId != null ? vehiclePath(vehicleId) : PATHS.HOME)
  }

  return (
    <div className="s08">
      <header className="s08__header">
        {vehicleData ? (
          <Link className="s08__back" to={vehiclePath(vehicleData.vehicleId)}>
            <span aria-hidden="true">‹</span> {vehicleData.plateNumber} 차량
          </Link>
        ) : (
          <Link className="s08__back" to={PATHS.HOME}>
            <span aria-hidden="true">‹</span> 홈
          </Link>
        )}
        <h1 className="s08__title">{M.PAGE_TITLE}</h1>
        <p className="s08__description">{M.PAGE_DESCRIPTION}</p>
      </header>

      {!hasVehicleParam ? (
        <section className="s08__card s08__card--padded" aria-labelledby="s08-pick-title">
          <h2 id="s08-pick-title" className="s08__section-title">
            {M.PICK_TITLE}
          </h2>
          <p className="s08__section-meta">{M.PICK_DESCRIPTION}</p>
          <div className="s08__picker">
            <VehiclePicker value={null} onChange={(option) => setVehicle(option.vehicleId)} />
          </div>
        </section>
      ) : vehicle.status === 'notFound' ? (
        <section className="s08__card">
          <EmptyState
            title={NOT_FOUND_TITLE}
            description={NOT_FOUND_DESCRIPTION}
            action={{ label: GO_HOME_LABEL, onClick: () => navigate(PATHS.HOME) }}
          />
        </section>
      ) : vehicle.status === 'error' ? (
        <section className="s08__card s08__card--padded">
          <ErrorNotice title={LOAD_FAILED_MESSAGE} error={vehicle.error} onRetry={vehicle.reload} retryLabel={RELOAD_LABEL} />
        </section>
      ) : !vehicleData ? (
        <div className="s08__skeleton" role="status" aria-label="불러오는 중">
          <span className="s08__skeleton-block" />
        </div>
      ) : (
        <>
          {(hasVisitErrors(errors) || saveError) && (
            <ErrorNotice
              title={saveError ? M.SAVE_FAILED : M.CHECK_INPUT}
              error={saveError ?? undefined}
              body={saveError ? undefined : errors.form}
              onRetry={saveError ? save : undefined}
            />
          )}
          {saveError?.code === NETWORK_ERROR && (
            <a className="s08__check-saved" href={vehiclePath(vehicleData.vehicleId)} target="_blank" rel="noreferrer">
              {M.CHECK_SAVED}
            </a>
          )}

          <section className="s08__card s08__card--padded s08__vehicle">
            <VehicleCustomerHeader vehicle={vehicleData} />
            {!fromReservation && (
              <Button variant="ghost" size="sm" onClick={() => setVehicle(null)}>
                {M.CHANGE_VEHICLE}
              </Button>
            )}
          </section>

          {hasMissing(missing) && <ErrorNotice tone="info" title={M.MISSING_TITLE} body={missingNoticeText(missing)} />}

          <section className="s08__card s08__card--padded" aria-labelledby="s08-visit-title">
            <h2 id="s08-visit-title" className="s08__section-title">
              {M.VISIT_INFO_TITLE}
            </h2>
            <div className="s08__section-body">
              <VisitInfoForm
                form={form}
                errors={errors}
                missing={missing}
                today={today}
                latestMileage={vehicleData.latestMileage}
                onChange={changeField}
              />
            </div>
          </section>

          <section className="s08__card s08__card--padded" aria-labelledby="s08-records-title">
            <h2 id="s08-records-title" className="s08__section-title">
              {M.RECORDS_TITLE}
            </h2>
            <p className="s08__section-meta">{M.RECORDS_DESCRIPTION}</p>
            <div className="s08__section-body">
              {items.status === 'error' ? (
                <ErrorNotice title={M.ITEMS_FAILED} error={items.error} onRetry={items.reload} retryLabel={RELOAD_LABEL} />
              ) : !items.data ? (
                <span className="s08__section-loading" role="status" aria-label="불러오는 중" />
              ) : (
                <ItemRecordRows
                  items={rows}
                  form={form}
                  memoErrors={errors.memo}
                  onChoice={(itemId, choice) => changeRow(itemId, { choice })}
                  onMemo={(itemId, memo) => changeRow(itemId, { memo })}
                />
              )}
            </div>
          </section>

          <div className="s08__footer">
            <p className="s08__summary" aria-live="polite">
              {selectionSummary(form, rows)}
            </p>
            <div className="s08__actions">
              <Button variant="ghost" onClick={cancel}>
                {M.CANCEL}
              </Button>
              <Button disabled={!canSave} onClick={save}>
                {selected > 0 ? `${selected}건 ${M.SAVE}` : M.SAVE}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
