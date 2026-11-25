import Button from '@/shared/ui/Button.jsx'
import './ErrorNotice.css'

// 공통 오류 안내 (조회 실패·저장 실패·403·409·500·네트워크). 09 0장·5장, 05 POL-125·127·129.
// 문구는 새로 만들지 않는다: error(ApiError)의 message(서버 문구 또는 client.ts DEFAULT_MESSAGES)나 화면이 넘긴 title·body를 보인다.
//   error에는 shared/api/client.ts가 던진 ApiError만 넘긴다(그 밖의 오류는 내부 문구가 그대로 보이므로 화면이 title·body로 바꿔 넘긴다).
//   title이 없으면 error.message가 제목, title이 있으면 error.message가 아래 줄(body를 따로 주면 body).
// 다시 시도는 사람이 버튼을 누를 때만 onRetry를 부른다 — 자동 재전송 없음(POL-125). onRetry가 없으면 버튼도 없다.
// tone: error(기본) · warn(409 동시 수정 등) · info
// 사용: <ErrorNotice title="불러오지 못했습니다." error={err} onRetry={reload} retryLabel="다시 불러오기" />
//       <ErrorNotice error={saveError} onRetry={save} />

const TONES = ['error', 'warn', 'info']

export default function ErrorNotice({ error, title, body, tone = 'error', onRetry, retryLabel = '다시 시도' }) {
  const heading = title ?? error?.message
  const text = body ?? (title ? error?.message : undefined)
  if (!heading && !text) return null

  const toneClass = TONES.includes(tone) ? tone : 'error'
  return (
    <div className={`error-notice error-notice--${toneClass}`} role={toneClass === 'info' ? 'status' : 'alert'}>
      <span className="error-notice__icon" aria-hidden="true">
        {toneClass === 'info' ? 'i' : '!'}
      </span>
      <div className="error-notice__text">
        {heading && <p className="error-notice__title">{heading}</p>}
        {text && <p className="error-notice__body">{text}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" pendingText={retryLabel} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
