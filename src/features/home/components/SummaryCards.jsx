import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import './SummaryCards.css'

// 홈 요약 숫자 (09 S-02, F-HOME-01, 08 04, 디자인 v3.0 home-summary-row, chagok-frontend#28).
// - 숫자는 04 응답 그대로(오늘 예약은 서버가 취소를 뺀 값). 화면에서 다시 세지 않는다.
// - UI·UX 통합 개선(#110 5·6절): 넓은 화면에서 스크롤해도 위에 붙어 있다(sticky, CSS).
//   [오늘 예약] 카드 전체가 버튼 — onOpenToday가 있을 때만(연결 안 된 버튼 없음). 누르면 화면이 우측 패널을 오늘 예약 목록으로 바꾼다.
//   todayActive면 선택 표시(aria-pressed). 화살표 아이콘·Hover 외곽선으로 누를 수 있음을 보인다.
// - [보기 →](재점검 대상)는 onShowTargets가 있을 때만.
// - 정비 대기·완료 카드는 08 04에 집계가 없어 두지 않는다(예약 상태로 대신 세지 않음, #110 결정 대기).
// 사용: <SummaryCards state={summary.state} onReload={summary.reload} onOpenToday={…} todayActive={…} onShowTargets={…} />
export default function SummaryCards({ state, onReload, onOpenToday, todayActive = false, onShowTargets }) {
  if (state.kind === 'error') {
    return (
      <div className="summary-cards summary-cards--error">
        <ErrorNotice title="요약 숫자를 불러오지 못했습니다." error={state.error} onRetry={onReload} />
      </div>
    )
  }

  const data = state.kind === 'ok' ? state.data : null
  const value = (n) => (data ? n : '–')
  const todayBody = (
    <>
      <p>오늘 예약</p>
      <div className="summary-card__row">
        <strong>{value(data?.todayReservationCount)}<span>건</span></strong>
        {onOpenToday && (
          <svg className="summary-card__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </div>
    </>
  )

  return (
    <section className="summary-cards" aria-label="오늘 요약" aria-busy={state.kind === 'loading'}>
      {onOpenToday ? (
        <button
          type="button"
          className={`summary-card summary-card--button${todayActive ? ' is-active' : ''}`}
          aria-pressed={todayActive}
          aria-label={`오늘 예약 ${data ? `${data.todayReservationCount}건` : ''} — 목록 보기`}
          onClick={onOpenToday}
        >
          {todayBody}
        </button>
      ) : (
        <div className="summary-card">{todayBody}</div>
      )}
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
