import { useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { useCustomerSearch } from '../useCustomerSearch'
import { LOAD_FAILED_MESSAGE, NO_RESULTS_MESSAGE, RELOAD_LABEL, vehicleOptions } from '../searchFlow'
import CustomerSearchBox from './CustomerSearchBox.jsx'
import './customer.css'

// 차량 검색해서 고르기 (08 05, 09 M-02 "차량: 검색해서 고르기 또는 신규(M-01)", 디자인 v3.0 Modal-Create).
// 다른 feature(M-02 예약, S-08)는 이 파일을 직접 import하지 않고 pages에서 끼운다(CONVENTIONS 7장).
// - value: 고른 vehicleId(없으면 null), onChange(option): { vehicleId, plateNumber, customerId, customerName, phone }
// - onRegister(검색어): 있으면 "찾는 고객이 없나요? [신규 고객·차량 등록]"을 보인다(M-01을 여는 것은 쓰는 화면). 없으면 버튼도 없다.
// 검색어가 없으면 최근 등록 차량 2대를 보인다(디자인). 조회 실패는 사람이 누르는 다시 불러오기만(자동 재시도 없음).

const RECENT_COUNT = 2

export default function VehiclePicker({ value = null, onChange, onRegister, label = '차량 검색' }) {
  const [query, setQuery] = useState('')
  const search = useCustomerSearch(query)
  const options = vehicleOptions(search.data?.items ?? [])
  const shown = search.query ? options : options.slice(0, RECENT_COUNT)

  return (
    <div className="vehicle-picker">
      <CustomerSearchBox value={query} onChange={setQuery} label={label} placeholder="차량번호·고객명·연락처 검색" />

      {search.status === 'error' ? (
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={search.error} onRetry={search.reload} retryLabel={RELOAD_LABEL} />
      ) : (
        <div className="vehicle-picker__list" role="listbox" aria-label={label} aria-busy={search.status === 'loading'}>
          {shown.map((option) => {
            const selected = option.vehicleId === value
            return (
              <button
                key={option.vehicleId}
                type="button"
                role="option"
                aria-selected={selected}
                className={`vehicle-picker__option${selected ? ' vehicle-picker__option--selected' : ''}`}
                onClick={() => onChange(option)}
              >
                <span className="vehicle-picker__text">
                  <b>{option.plateNumber}</b>
                  <small>
                    {option.customerName} · {option.phone}
                  </small>
                </span>
                <i className="vehicle-picker__tag">{selected ? '선택됨' : '선택'}</i>
              </button>
            )
          })}
        </div>
      )}
      {search.status === 'ready' && search.query && shown.length === 0 && <p className="vehicle-picker__empty">{NO_RESULTS_MESSAGE}</p>}

      {onRegister && (
        <div className="vehicle-picker__register">
          <span className="customer-form__help">찾는 고객이 없나요?</span>
          <Button variant="ghost" size="sm" onClick={() => onRegister(query.trim())}>
            + 신규 고객·차량 등록
          </Button>
        </div>
      )}
    </div>
  )
}
