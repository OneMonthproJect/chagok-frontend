import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import { LOAD_FAILED_MESSAGE, RELOAD_LABEL, emptyState } from '../searchFlow'
import CustomerRow from './CustomerRow.jsx'
import './customer.css'

// S-05 결과 영역: 불러오는 중 · 조회 실패 · 빈 상태 · 목록 (09 S-05·5장, 디자인 v3.0 Customer-List-*).
// search: useCustomerSearch 결과. 처음 불러올 때만 자리 표시를 보이고, 다시 검색하는 동안에는 이전 목록을 흐리게 둔다.
// 조회 실패는 "불러오지 못했습니다." + 사람이 누르는 "다시 불러오기"(자동 재시도 없음).
// onRegister(검색어): 빈 상태의 신규 등록 버튼. 검색어가 있으면 그 검색어를 M-01에 채운다(09 S-05 💡).

const SKELETON_ROWS = 5

export default function CustomerResultList({ search, onRegister }) {
  const { status, data, error, query, reload } = search

  if (status === 'error') {
    return (
      <div className="customer-results__state">
        <ErrorNotice title={LOAD_FAILED_MESSAGE} error={error} onRetry={reload} retryLabel={RELOAD_LABEL} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="customer-results__skeleton" role="status" aria-label="불러오는 중">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <span key={i} className="customer-results__skeleton-row" />
        ))}
      </div>
    )
  }

  if (data.items.length === 0) {
    const empty = emptyState(query)
    return (
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={onRegister ? { label: empty.actionLabel, onClick: () => onRegister(query) } : undefined}
      />
    )
  }

  return (
    <div className={`customer-results${status === 'loading' ? ' customer-results--refreshing' : ''}`} aria-busy={status === 'loading'}>
      <table className="customer-table">
        <thead>
          <tr>
            <th scope="col">고객명</th>
            <th scope="col">연락처</th>
            <th scope="col">안내 수신</th>
            <th scope="col">차량</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((customer) => (
            <CustomerRow key={customer.customerId} customer={customer} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
