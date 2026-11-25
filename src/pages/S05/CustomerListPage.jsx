import { useState } from 'react'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import CustomerResultList from '@/features/customer/components/CustomerResultList.jsx'
import CustomerSearchBox from '@/features/customer/components/CustomerSearchBox.jsx'
import CustomerVehicleFormModal from '@/features/customer/components/CustomerVehicleFormModal.jsx'
import { countText, rangeText } from '@/features/customer/searchFlow'
import { useCustomerSearch } from '@/features/customer/useCustomerSearch'
import Pagination from './Pagination.jsx'
import './CustomerListPage.css'

// S-05 고객·차량 목록 (09 S-05, F-CUS-01·02, 08 05·06, 디자인 v3.0 Customer-List-* · Modal-Register-*).
// - 검색창 하나 → 05 (입력이 멈춘 뒤 0.3초). 결과 없음·등록 고객 없음 문구는 09 5장.
// - [신규 고객·차량 등록] → M-01. 빈 상태의 신규 등록은 검색어를 M-01에 채운다.
// - 등록 뒤: 화면 위에 결과 문구, 목록을 처음(최근 등록순)부터 다시 불러온다.
//   줄 → S-06 이동, 등록 뒤 S-06 이동, M-01의 기존 고객 행동(차량 보기·이 고객에 차량 추가)은 S-06·S-07 화면이 생기는 이슈에서 연결한다.
// - P1(비활성 포함 토글·최근 방문·방문 횟수·점검 예정)은 넣지 않는다.

export default function CustomerListPage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [registerQuery, setRegisterQuery] = useState(null) // null이면 M-01 닫힘
  const [notice, setNotice] = useState(null)
  const search = useCustomerSearch(query, page)
  const range = search.data ? rangeText(search.data) : null

  function changeQuery(next) {
    setQuery(next)
    setPage(0)
  }

  function handleCreated({ name, plateNumber }) {
    setRegisterQuery(null)
    setNotice(`${name} 고객(${plateNumber})을 등록했습니다.`)
    if (query === '' && page === 0) search.reload()
    else changeQuery('')
  }

  return (
    <div className="s05">
      <header className="s05__header">
        <div>
          <h1 className="s05__title">고객·차량</h1>
          {search.data && <p className="s05__count">{countText(search.query, search.data.totalElements)}</p>}
        </div>
        <Button size="lg" onClick={() => setRegisterQuery('')}>
          + 신규 고객·차량 등록
        </Button>
      </header>

      {notice && <ErrorNotice tone="info" title={notice} />}

      <section className="s05__card" aria-label="고객·차량 목록">
        <div className="s05__toolbar">
          <CustomerSearchBox
            value={query}
            onChange={changeQuery}
            hint="일부만 입력해도 찾습니다. 띄어쓰기·하이픈은 무시합니다."
          />
        </div>
        <CustomerResultList search={search} onRegister={(q) => setRegisterQuery(q)} />
        {range && search.data && (
          <footer className="s05__footer">
            <span className="s05__range">{range}</span>
            <Pagination page={search.data.page} totalPages={search.data.totalPages} onChange={setPage} />
          </footer>
        )}
      </section>

      {registerQuery !== null && (
        <CustomerVehicleFormModal
          initialQuery={registerQuery}
          context="list"
          onCreated={handleCreated}
          onClose={() => setRegisterQuery(null)}
        />
      )}
    </div>
  )
}
