import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import LoginForm from '@/features/auth/components/LoginForm.jsx'
import { loginNotice, returnPath } from '@/features/auth/loginFlow'
import { getToken } from '@/shared/lib/tokenStore'
import { PATHS } from '@/app/paths'
import './LoginPage.css'

// S-01 로그인 (09 S-01, D-68, 디자인 v3.0 S-01). 넓은 화면은 왼쪽 브랜드 영역 + 오른쪽 로그인 카드, 900px 이하는 카드만.
// - 성공: state.from(로그인 가드·401 처리가 넘긴 원래 화면)이 있으면 그곳, 없으면 홈(S-02).
// - 이미 토큰이 있고 from이 있으면 그 화면으로 바로 간다.
// - TODO(#24): "이미 토큰이 있으면 S-02로 바로"는 S-02 라우트가 생기는 chagok-frontend#24에서 켠다.
//   지금 켜면 '/' 라우트가 없어 로그인 ↔ '/' 사이를 계속 오가므로, 그때까지는 안내 문구만 보인다.
// - 안내: 401 만료(reason='expired'), 로그아웃(reason='logout', 앱 골격 #17이 넘김)
// - ⚠ 디자인의 정비소 사진·마스코트 이미지와 Pretendard 글꼴 파일은 아직 레포에 넣지 않았다(시스템 글꼴로 대신).
export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const target = returnPath(location.state, PATHS.LOGIN)
  const loggedIn = getToken() !== null

  if (loggedIn && target) {
    return <Navigate to={target} replace />
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="login-visual__note"><i />정비 기록부터 다음 방문까지</div>
        <div className="login-visual__copy">
          <span>SMART GARAGE CRM</span>
          <h2>차곡 쌓이는 기록,<br />놓치지 않는 고객 관리.</h2>
          <p>정비 이력과 재점검 일정을 한눈에 관리하세요.</p>
        </div>
      </section>
      <section className="login-page__form">
        <LoginForm
          notice={loginNotice(location.state, loggedIn)}
          onSuccess={() => navigate(target ?? PATHS.HOME, { replace: true })}
        />
        <p className="login-page__footer">© 2026 ChaGok</p>
      </section>
    </main>
  )
}
