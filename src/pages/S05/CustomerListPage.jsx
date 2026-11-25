import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QUERY } from '@/app/paths'
import Button from '@/shared/ui/Button.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import CustomerResultList from '@/features/customer/components/CustomerResultList.jsx'
import CustomerSearchBox from '@/features/customer/components/CustomerSearchBox.jsx'
import CustomerVehicleFormModal from '@/features/customer/components/CustomerVehicleFormModal.jsx'
import { SEARCH_DELAY_MS, countText, rangeText } from '@/features/customer/searchFlow'
import { useCustomerSearch, useDebouncedValue } from '@/features/customer/useCustomerSearch'
import Pagination from './Pagination.jsx'
import './CustomerListPage.css'

// S-05 고객·차량 목록 (09 S-05, F-CUS-01·02, 08 05·06, 디자인 v3.0 Customer-List-* · Modal-Register-*).
// - 검색창 하나 → 05. 입력 중 글자는 화면 상태, 멈춘 뒤 0.3초에 URL `?q=&page=`로 옮긴다(replace, FRONTEND_STRUCTURE 2장).
//   URL의 page는 화면 숫자(1부터), 08 page는 0부터. 기본값(검색어 없음·1쪽)이면 URL에서 뺀다.
// - [신규 고객·차량 등록] → M-01. 빈 상태의 신규 등록은 검색어를 M-01에 채운다. M-01은 URL이 없다.
// - 등록 뒤: 화면 위에 결과 문구, 목록을 처음(최근 등록순)부터 다시 불러온다.
//   줄 → S-06 이동, 등록 뒤 S-06 이동, M-01의 기존 고객 행동(차량 보기·이 고객에 차량 추가)은 S-06·S-07 화면이 생긴 뒤 연결한다.
// - P1(비활성 포함 토글·최근 방문·방문 횟수·점검 예정)은 넣지 않는다.

/** URL page(1부터) → 08 page(0부터). 숫자가 아니거나 1보다 작으면 0 */
function pageFromUrl(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n - 1 : 0
}

export default function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get(QUERY.Q) ?? ''
  const page = pageFromUrl(searchParams.get(QUERY.PAGE))

  const [input, setInput] = useState(urlQuery)
  const [registerQuery, setRegisterQuery] = useState(null) // null이면 M-01 닫힘
  const [notice, setNotice] = useState(null)
  const settledInput = useDebouncedValue(input.trim(), SEARCH_DELAY_MS)
  const search = useCustomerSearch(urlQuery, page, undefined, 0)
  const range = search.data ? rangeText(search.data) : null

  function updateUrl(q, nextPage) {
    const params = new URLSearchParams(searchParams)
    if (q) params.set(QUERY.Q, q)
    else params.delete(QUERY.Q)
    if (nextPage > 0) params.set(QUERY.PAGE, String(nextPage + 1))
    else params.delete(QUERY.PAGE)
    setSearchParams(params, { replace: true })
  }

  // 입력이 멈춰 값이 바뀌었을 때만 URL로 옮긴다(검색어가 바뀌면 1쪽부터). URL이 먼저 바뀐 경우(등록 뒤 초기화)는 되돌리지 않는다.
  const lastSettled = useRef(settledInput)
  useEffect(() => {
    if (settledInput === lastSettled.current) return
    lastSettled.current = settledInput
    if (settledInput === urlQuery) return
    const params = new URLSearchParams(searchParams)
    if (settledInput) params.set(QUERY.Q, settledInput)
    else params.delete(QUERY.Q)
    params.delete(QUERY.PAGE)
    setSearchParams(params, { replace: true })
  }, [settledInput, urlQuery, searchParams, setSearchParams])

  function handleCreated({ name, plateNumber }) {
    setRegisterQuery(null)
    setNotice(`${name} 고객(${plateNumber})을 등록했습니다.`)
    // 새 고객이 보이도록 검색을 풀고 처음 쪽으로. 이미 그 상태면 다시 불러온다.
    if (urlQuery === '' && page === 0) search.reload()
    else updateUrl('', 0)
    setInput('')
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
          <CustomerSearchBox value={input} onChange={setInput} hint="일부만 입력해도 찾습니다. 띄어쓰기·하이픈은 무시합니다." />
        </div>
        <CustomerResultList search={search} onRegister={(q) => setRegisterQuery(q)} />
        {range && search.data && (
          <footer className="s05__footer">
            <span className="s05__range">{range}</span>
            <Pagination page={search.data.page} totalPages={search.data.totalPages} onChange={(p) => updateUrl(urlQuery, p)} />
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
