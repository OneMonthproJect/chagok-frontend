import { useEffect, useRef } from 'react'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import ErrorNotice from '@/shared/ui/ErrorNotice.jsx'
import ReservationList from './ReservationList.jsx'
import './ReservationPanel.css'

// 우측 패널의 예약 목록 보기 (UI·UX 통합 개선 6절, chagok-frontend#110).
// - 예약 상세 패널(ReservationPanel)과 같은 자리·크기·닫기 방식이다. 안의 내용만 목록이다(새 탭·모달·뒤로 가기 버튼 없음).
// - 목록은 쓰는 화면이 넘긴 값 그대로(서버 순서, 취소 포함). 줄: 시각·번호판·고객명·연락처 / 목적·담당·상태(ReservationRow).
// - 줄을 누르면 onSelect(reservationId) — 화면이 같은 패널을 예약 상세로 바꾼다.
// - 불러오는 중·실패(사람이 누르는 다시 시도)·빈 목록(09 5장 문구 + 이어지는 버튼)은 여기서 그린다. 실제 0건과 실패를 섞지 않는다.
// props: title · state({ kind: 'loading' } | { kind: 'error', error } | { kind: 'ok', items }) · onClose · onRetry · onSelect
//        emptyTitle · emptyAction({ label, onClick })(선택) · failTitle
export default function ReservationListPanel({ title, state, onClose, onRetry, onSelect, emptyTitle, emptyAction, failTitle }) {
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <aside className="rsv-panel rsv-panel--list" aria-labelledby="rsv-list-panel-title" onKeyDown={handleKeyDown}>
      <header className="rsv-panel__header">
        <h2 id="rsv-list-panel-title" className="rsv-panel__title" tabIndex={-1} ref={headingRef}>
          {title}
        </h2>
        <button type="button" className="rsv-panel__close" aria-label={`${title} 닫기`} onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="rsv-panel__scroll" aria-busy={state.kind === 'loading'}>
        {state.kind === 'loading' && (
          <p className="rsv-panel__state" role="status">
            예약을 불러오는 중…
          </p>
        )}
        {state.kind === 'error' && <ErrorNotice title={failTitle} error={state.error} onRetry={onRetry} />}
        {state.kind === 'ok' && state.items.length === 0 && <EmptyState compact title={emptyTitle} action={emptyAction} />}
        {state.kind === 'ok' && state.items.length > 0 && (
          <ReservationList items={state.items} label={title} onSelect={onSelect} variant="panel" />
        )}
      </div>
    </aside>
  )
}
