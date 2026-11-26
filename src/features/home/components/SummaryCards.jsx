import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import './SummaryCards.css'

// 홈 요약 숫자 (09 S-02, F-HOME-01, 08 04, 디자인 v3.0 home-summary-row, chagok-frontend#28).
// - 숫자는 04 응답 그대로(오늘 예약은 서버가 취소를 뺀 값). 화면에서 다시 세지 않는다.
// - "목록 →"(오늘 목록으로)·[보기 →](재점검 대상)은 쓰는 화면이 콜백을 넘길 때만 그린다(연결 안 된 버튼 없음).
// 사용: <SummaryCards state={summary.state} onReload={summary.reload} onShowToday={…} onShowTargets={…} />
export default function SummaryCards({ state, onReload, onShowToday, onShowTargets }) {
  if (state.kind === 'error') {
    return (
      <div className="summary-cards summary-cards--error">
        <ErrorNotice title="요약 숫자를 불러오지 못했습니다." error={state.error} onRetry={onReload} />
      </div>
    )
  }

  const data = state.kind === 'ok' ? state.data : null
  const value = (n) => (data ? n : '–')

  return (
    <section className="summary-cards" aria-label="오늘 요약" aria-busy={state.kind === 'loading'}>
      <div className="summary-card">
        <p>오늘 예약</p>
        <div className="summary-card__row">
          <strong>{value(data?.todayReservationCount)}<span>건</span></strong>
          {onShowToday && (
            <button type="button" className="summary-card__link" onClick={onShowToday}>목록 →</button>
          )}
        </div>
      </div>
      <div className="summary-card summary-card--brand">
        <p>오늘 연락할 고객</p>
        <div className="summary-card__row">
          <strong>{value(data?.todayContactCount)}<span>명</span></strong>
          {onShowTargets && (
            <button type="button" className="summary-card__pill" onClick={onShowTargets}>보기 →</button>
          )}
        </div>
      </div>
    </section>
  )
}
