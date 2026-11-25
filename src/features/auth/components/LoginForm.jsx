import { useRef, useState } from 'react'
import { createSubmitGuard } from '@/shared/lib/submitGuard'
import { login } from '../api'
import { emptyFieldErrors, loginErrorMessage } from '../loginFlow'
import ChagokLogo from './ChagokLogo.jsx'
import './LoginForm.css'

// S-01 로그인 카드 (09 S-01, 디자인 v3.0 S-01 상태 01~07).
// - 빈 칸으로 누르면 칸 아래 문구(상태 02), 실패는 버튼 아래 공통 문구 하나(상태 03), 요청 중 "로그인 중"(상태 04),
//   응답 없음은 연결 확인 문구(상태 05), 만료·로그아웃 안내는 notice로 받는다(상태 06·07).
// - 입력값은 컴포넌트 상태에만 둔다(브라우저 저장소에 두지 않음). 실패해도 입력값을 지우지 않는다 (05 POL-122).
// - Enter로도 보내고, 요청 중 두 번 보내지 않는다 (05 POL-120).
// 사용: <LoginForm notice={{ kind: 'expired', message: '…' }} onSuccess={(res) => ...} />
export default function LoginForm({ notice = null, onSuccess }) {
  const guardRef = useRef(null)
  if (guardRef.current === null) guardRef.current = createSubmitGuard()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    if (guardRef.current.isPending()) return
    const empty = emptyFieldErrors(loginId, password)
    setFieldErrors(empty)
    if (empty.loginId || empty.password) return

    setPending(true)
    setError(null)
    guardRef.current
      .run(() => login({ loginId: loginId.trim(), password }))
      .then((response) => onSuccess?.(response))
      .catch((e) => setError(loginErrorMessage(e)))
      .finally(() => setPending(false))
  }

  function change(setter, field) {
    return (event) => {
      setter(event.target.value)
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <ChagokLogo size={72} />
      <h1 className="login-card__title">차곡</h1>
      <p className="login-card__caption">정비 기록을 차곡차곡, 다음 방문까지</p>

      {notice && (
        <p className={`login-notice${notice.kind === 'logout' ? ' login-notice--logout' : ''}`} role="status">
          {notice.message}
        </p>
      )}

      <div className="login-card__fields">
        <div className={`login-field${fieldErrors.loginId ? ' is-error' : ''}`}>
          <label htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            name="loginId"
            autoComplete="username"
            placeholder="아이디를 입력해 주세요"
            value={loginId}
            onChange={change(setLoginId, 'loginId')}
            aria-invalid={fieldErrors.loginId ? 'true' : 'false'}
            aria-describedby={fieldErrors.loginId ? 'login-id-error' : undefined}
          />
          {fieldErrors.loginId && <span id="login-id-error" className="login-field__error">⚠ {fieldErrors.loginId}</span>}
        </div>

        <div className={`login-field${fieldErrors.password ? ' is-error' : ''}`}>
          <label htmlFor="login-pw">비밀번호</label>
          <div className="login-field__password">
            <input
              id="login-pw"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="비밀번호를 입력해 주세요"
              value={password}
              onChange={change(setPassword, 'password')}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={fieldErrors.password ? 'login-pw-error' : undefined}
            />
            <button
              type="button"
              className="login-field__toggle"
              aria-pressed={showPassword}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setShowPassword((v) => !v)}
            >
              <EyeIcon />
              <span>{showPassword ? '숨기기' : '보기'}</span>
            </button>
          </div>
          {fieldErrors.password && <span id="login-pw-error" className="login-field__error">⚠ {fieldErrors.password}</span>}
        </div>
      </div>

      <button type="submit" className="login-submit" disabled={pending} aria-busy={pending}>
        {pending && <i className="login-submit__spinner" aria-hidden="true" />}
        {pending ? '로그인 중' : '로그인'}
      </button>

      {error && <p className="login-error" role="alert">{error}</p>}
    </form>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}
