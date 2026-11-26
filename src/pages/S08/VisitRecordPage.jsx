import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PATHS, QUERY, vehiclePath } from '@/app/paths'
import { NETWORK_ERROR } from '@/shared/api/client'
import { todaySeoul } from '@/shared/lib/date'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { ROLE_LABEL } from '@/features/auth/api'
import { useMe } from '@/features/auth/useMe'
import VehicleCustomerHeader from '@/features/customer/components/VehicleCustomerHeader.jsx'
import VehiclePicker from '@/features/customer/components/VehiclePicker.jsx'
import { GO_HOME_LABEL, NOT_FOUND_DESCRIPTION, NOT_FOUND_TITLE, parseVehicleId } from '@/features/customer/detailFlow'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL } from '@/features/customer/searchFlow'
import { useVehicleDetail } from '@/features/customer/useVehicleDetail'
import { saveVisit } from '@/features/maintenance/api'
import ItemRecordRows from '@/features/maintenance/components/ItemRecordRows.jsx'
import MechanicSelect from '@/features/maintenance/components/MechanicSelect.jsx'
import VisitInfoForm from '@/features/maintenance/components/VisitInfoForm.jsx'
import VisitPreview from '@/features/maintenance/components/VisitPreview.jsx'
import {
  MECHANIC_MESSAGES,
  defaultMechanic,
  splitMechanicFieldErrors,
  validateMechanic,
  withMechanic,
} from '@/features/maintenance/mechanicFlow'
import { useServiceItems } from '@/features/maintenance/useServiceItems'
import {
  VISIT_MESSAGES as M,
  fieldErrorsToVisitForm,
  hasMissing,
  hasVisitErrors,
  initialVisitRecordForm,
  missingNoticeText,
  recordItems,
  requiredVehicleInfo,
  rowOf,
  ROW_ERROR_FIELDS,
  selectedRows,
  selectionSummary,
  toVisitSaveRequest,
  validateVisitRecordForm,
  vehicleMissing,
} from '@/features/maintenance/visitRecordFlow'
import { parseReservationId } from '@/features/reservation/panelFlow'
import { useAssignees } from '@/features/reservation/useAssignees'
import { useReservationPanel } from '@/features/reservation/useReservationPanel'
import './VisitRecordPage.css'

// S-08 방문·정비 기록 (09 S-08·5장, 04 F-MNT-01~03, 08 09·12·13, 05 POL-30·120~125, D-58, 디자인 v3.0 S-08-visit-record).
// - 주소 `/visits/new?vehicleId=&reservationId=`. vehicleId가 있으면 09로 차량을 불러 채우고, 없으면 VehiclePicker로 검색해 고른다
//   (고르면 주소에 vehicleId를 넣는다). customer(차량)와 maintenance(기록)는 이 화면에서만 합친다(CONVENTIONS 7장).
// - reservationId는 요청에 넣지 않는다: 예약과 기록은 데이터로 잇지 않는다(08 12, 05 POL-95). 예약에서 왔으면 차량을 바꾸지 못하게 하고,
//   담당 정비사 기본값(그 예약의 담당)을 읽는 데만 쓴다(08 17 reservation.assignee).
// - 담당 정비사(P0-나머지, #62, 09 S-08 5번·05 POL-59): 후보는 08 36, 기본값은 예약의 담당 → 로그인 계정(08 03).
//   reservation(36·17)·auth(03)·maintenance(12)는 이 화면에서만 합친다(CONVENTIONS 7장). 기본값을 정하는 동안과
//   후보 조회 실패 때는 저장을 막고(입력값은 그대로), 다시 불러오기는 사람이 누른다(POL-125). X13 400은 담당 칸 옆에.
// - 방문일 기본 = 서울 기준 오늘(shared/lib/date). 문자열 그대로 보낸다.
// - 저장(08 12)은 1개 이상 골랐을 때만 활성. 저장 중 비활성·두 번 눌러도 한 번(Button, POL-120). 성공하면 S-07로(replace).
//   400은 칸 옆 + 위쪽 안내, 입력값 유지(POL-121). 그 밖의 실패는 위쪽 안내 + 사람이 누르는 "다시 시도"(자동 재전송 없음, POL-125).
//   응답 없음(NETWORK_ERROR)은 실제로는 저장됐을 수 있다(12는 요청마다 새 방문, 삭제 없음). 그래서 S-07을 새 창으로 여는 링크를 함께 보여
//   입력값을 잃지 않고 이력에서 저장 여부를 확인한 뒤 다시 시도하게 한다(08 0.2 표).
// - 차량을 바꾸면 입력을 처음으로 되돌린다(앞 차량의 주행거리·기록이 다른 차량에 저장되지 않게).
// - 저장 전 미리보기(08 10, F-VIS-01, #35)는 VisitPreview가 주행거리 칸을 따라 부른다. 실패해도 입력·저장을 막지 않는다.
//   "지난 방문 거절"·"지난 점검 주의" 꼬리표(F-CYC-02)도 미리보기 줄에 서버 값 그대로 붙는다.
// - 구분 거절·외부·점검 결과(F-MNT-02·03, #29)는 ItemRecordRows. 연식·주행거리 필수(D-58)는 교체·점검을 골랐을 때만(requiredVehicleInfo).
// - 넣지 않은 것: 디자인의 이탈 확인 대화상자·저장 토스트·관련 예약 표시는 09에 없어 넣지 않았다.

const INFO_FIELDS = ['visitDate', 'mileage', 'modelYear']
/** D-58 "비어 있음" 오류 (구분을 바꾸면 필수 여부가 달라져 지운다) */
const EMPTY_ERRORS = [
  ['mileage', M.MILEAGE_EMPTY],
  ['modelYear', M.MODEL_YEAR_EMPTY],
]

export default function VisitRecordPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const rawVehicleId = params.get(QUERY.VEHICLE_ID)
  const hasVehicleParam = rawVehicleId !== null
  const vehicleId = hasVehicleParam ? parseVehicleId(rawVehicleId) : null
  const fromReservation = params.get(QUERY.RESERVATION_ID) !== null
  const reservationId = fromReservation ? parseReservationId(params.get(QUERY.RESERVATION_ID)) : null
  const vehicle = useVehicleDetail(vehicleId)
  const items = useServiceItems()
  const assignees = useAssignees()
  const { me, error: meError } = useMe()
  // 예약에서 왔을 때만 17을 부른다(reservationId가 null이면 부르지 않음). 담당 기본값을 읽는 데만 쓴다
  const reservation = useReservationPanel(reservationId ?? null)

  const [today] = useState(() => todaySeoul())
  const [form, setForm] = useState(() => initialVisitRecordForm(today))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  /** 사람이 고른 담당. null이면 기본값을 쓴다 */
  const [mechanicChoice, setMechanicChoice] = useState(null)
  const [mechanicError, setMechanicError] = useState(null)

  const rows = items.data ? recordItems(items.data) : []
  const vehicleData = vehicle.status === 'ready' || vehicle.status === 'loading' ? vehicle.data : null
  const missing = vehicleData ? vehicleMissing(vehicleData) : { modelYear: false, latestMileage: false }
  const required = requiredVehicleInfo(form, rows, missing)
  const selected = selectedRows(form, rows).length

  // 담당 기본값은 후보(36)·로그인 계정(03)·예약(17, 예약에서 왔을 때)을 모두 읽은 뒤에 정한다(실패도 읽은 것으로 본다)
  const candidates = assignees.data ?? []
  const defaultsSettled = (me != null || meError != null) && (!fromReservation || reservation.status !== 'loading')
  const mechanicStatus =
    assignees.status === 'error' ? 'error' : assignees.status === 'ready' && defaultsSettled ? 'ready' : 'loading'
  const mechanicDefault = defaultMechanic({
    candidateIds: candidates.map((c) => c.staffId),
    fromReservation,
    reservationAssigneeId: reservation.data?.reservation.assignee?.staffId ?? null,
    loginStaffId: me?.staffId ?? null,
  })
  const mechanicId = mechanicStatus === 'ready' ? (mechanicChoice ?? mechanicDefault.mechanicId) : null
  const mechanicOptions = candidates.map((c) => ({ staffId: c.staffId, label: `${c.name} (${ROLE_LABEL[c.role] ?? c.role})` }))

  const canSave =
    vehicleData != null && vehicleData.vehicleId === vehicleId && rows.length > 0 && selected > 0 && mechanicStatus === 'ready'

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
    // 담당은 차량과 관계없어 고른 값을 그대로 두고, 칸 오류만 지운다
    setMechanicError(null)
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

  // 그 줄을 고치면 그 줄의 칸 오류(메모·외부 정비일·외부 주행거리)와 위쪽 한 줄 오류를 지운다.
  // 구분을 바꾸면 D-58 필수 여부가 달라질 수 있어 연식·주행거리 칸의 "비어 있음" 오류만 지운다(저장할 때 다시 검사).
  // 서버가 알려 준 범위 오류 등은 그 칸 값을 고칠 때까지 남긴다(POL-121).
  function changeRow(itemId, patch) {
    setForm((prev) => ({ ...prev, records: { ...prev.records, [itemId]: { ...rowOf(prev, itemId), ...patch } } }))
    setErrors((prev) => {
      const next = { ...prev }
      let changed = false
      for (const field of ROW_ERROR_FIELDS) {
        if (!prev[field]?.[itemId]) continue
        const rest = { ...prev[field] }
        delete rest[itemId]
        if (Object.keys(rest).length === 0) delete next[field]
        else next[field] = rest
        changed = true
      }
      if ('form' in next) {
        delete next.form
        changed = true
      }
      if ('choice' in patch) {
        for (const [field, empty] of EMPTY_ERRORS) {
          if (next[field] === empty) {
            delete next[field]
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
  }

  async function save() {
    if (!canSave) return
    setSaveError(null)
    const found = validateVisitRecordForm(form, rows, missing, today)
    const mechanicMessage = validateMechanic(mechanicId)
    setErrors(found)
    setMechanicError(mechanicMessage ?? null)
    if (hasVisitErrors(found) || mechanicMessage) return
    const body = withMechanic(toVisitSaveRequest(form, rows, missing), mechanicId)
    try {
      await saveVisit(vehicleId, body)
      navigate(vehiclePath(vehicleId), { replace: true })
    } catch (error) {
      if (error?.code === 'INVALID_INPUT' && error.fieldErrors?.length > 0) {
        // mechanicId(X13: 없음·남의 것·비활성)는 담당 칸 옆, 나머지는 방문 정보·항목 칸으로
        const { mechanic, rest } = splitMechanicFieldErrors(error.fieldErrors)
        setErrors(fieldErrorsToVisitForm(rest, body.records.map((record) => record.itemId)))
        setMechanicError(mechanic ?? null)
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
          {(hasVisitErrors(errors) || mechanicError || saveError) && (
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
                required={required}
                today={today}
                latestMileage={vehicleData.latestMileage}
                onChange={changeField}
              />
            </div>
          </section>

          <section className="s08__card s08__card--padded" aria-labelledby="visit-preview-title">
            <VisitPreview key={vehicleData.vehicleId} vehicleId={vehicleData.vehicleId} mileage={form.mileage} />
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
                <ItemRecordRows items={rows} form={form} errors={errors} today={today} onChange={changeRow} />
              )}
            </div>
          </section>

          <section className="s08__card s08__card--padded" aria-labelledby="s08-mechanic-title">
            <h2 id="s08-mechanic-title" className="s08__section-title">
              {MECHANIC_MESSAGES.TITLE}
            </h2>
            <div className="s08__section-body">
              {mechanicStatus === 'ready' && mechanicChoice == null && mechanicDefault.reservationFallback && (
                <ErrorNotice
                  tone="info"
                  title={
                    mechanicDefault.mechanicId != null
                      ? MECHANIC_MESSAGES.RESERVATION_FALLBACK
                      : MECHANIC_MESSAGES.RESERVATION_FALLBACK_EMPTY
                  }
                />
              )}
              <MechanicSelect
                status={mechanicStatus}
                options={mechanicOptions}
                value={mechanicId}
                error={mechanicError ?? undefined}
                loadError={assignees.error ?? undefined}
                onChange={(staffId) => {
                  setMechanicChoice(staffId)
                  setMechanicError(null)
                }}
                onRetry={assignees.reload}
              />
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
