import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import LoginForm from '@/features/auth/components/LoginForm.jsx'
import { loginNotice, returnPath } from '@/features/auth/loginFlow'
import { getToken } from '@/shared/lib/tokenStore'
import { PATHS } from '@/app/paths'
import repairShopImage from './assets/login-repair-shop.png'
import mascotImage from './assets/login-mascot-wrench.png'
import './LoginPage.css'

// S-01 로그인 (09 S-01, D-68, 디자인 v3.0 S-01). 넓은 화면은 왼쪽 브랜드 영역 + 오른쪽 로그인 카드, 900px 이하는 카드만.
// - 성공: state.from(로그인 가드·401 처리가 넘긴 원래 화면)이 있으면 그곳, 없으면 홈(S-02).
// - 이미 토큰이 있으면 from 또는 홈으로 바로 간다. (S-02 화면이 생기기 전에는 AppLayout의 404가 보인다, #17)
// - 안내: 401 만료(reason='expired'), 로그아웃(reason='logout', 앱 골격 #17이 넘김)
// - 이미지: design/improved-v3.0/prototype/의 정비소 사진·마스코트(렌치)를 이 화면 전용으로 복사해 쓴다.
//   글꼴 Pretendard는 공통 토큰(#18)이 정할 때까지 설치된 경우에만 쓰이고, 없으면 시스템 글꼴.
export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const target = returnPath(location.state, PATHS.LOGIN)
  const loggedIn = getToken() !== null

  if (loggedIn) {
    return <Navigate to={target ?? PATHS.HOME} replace />
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="login-visual__note"><i />정비 기록부터 다음 방문까지</div>
        <img className="login-visual__image" src={repairShopImage} alt="" />
        <div className="login-visual__copy">
          <span>SMART GARAGE CRM</span>
          <h2>차곡 쌓이는 기록,<br />놓치지 않는 고객 관리.</h2>
          <p>정비 이력과 재점검 일정을 한눈에 관리하세요.</p>
        </div>
      </section>
      <section className="login-page__form">
        <LoginForm
          mascotSrc={mascotImage}
          notice={loginNotice(location.state)}
          onSuccess={() => navigate(target ?? PATHS.HOME, { replace: true })}
        />
        <p className="login-page__footer">© 2026 ChaGok</p>
      </section>
    </main>
  )
}
