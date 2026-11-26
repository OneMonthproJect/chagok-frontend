import { Link } from 'react-router-dom'
import { menu } from '@/app/routes'

// 로그인한 상태에서 없는 주소 (FRONTEND_STRUCTURE 2장 Δ, 11-1 404). AppLayout 안이라 메뉴로 다른 화면에 갈 수 있다.
// 갈 수 있는 화면이 메뉴에 있을 때만 이동 버튼을 보인다(연결 안 된 버튼 없음).
export default function NotFoundPage() {
  const first = menu[0]
  return (
    <section className="not-found">
      <h1>찾을 수 없는 화면입니다.</h1>
      <p>주소를 확인하거나 메뉴에서 화면을 골라 주세요.</p>
      {first && <Link className="not-found__link" to={first.path}>{first.label}으로 가기</Link>}
    </section>
  )
}
