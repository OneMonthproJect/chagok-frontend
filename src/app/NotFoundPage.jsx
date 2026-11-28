import { Link } from 'react-router-dom'
import { menu } from '@/app/routes'
import mascotClipboard from '@/shared/ui/assets/mascot-clipboard.png'

// 로그인한 상태에서 없는 주소 (FRONTEND_STRUCTURE 2장 Δ, 11-1 404). AppLayout 안이라 메뉴로 다른 화면에 갈 수 있다.
// 갈 수 있는 화면이 메뉴에 있을 때만 이동 버튼을 보인다(연결 안 된 버튼 없음).
// 제목 위 CHA 마스코트(원본 클립보드 이미지를 크기만 줄인 것, 색 처리 없음, #110 14·17절). 꾸밈 그림이라 화면 읽기에서는 건너뛴다.
export default function NotFoundPage() {
  const first = menu[0]
  return (
    <section className="not-found">
      <img className="not-found__mascot" src={mascotClipboard} alt="" aria-hidden="true" width="180" height="180" />
      <h1>찾을 수 없는 화면입니다.</h1>
      <p>주소를 확인하거나 메뉴에서 화면을 골라 주세요.</p>
      {first && <Link className="not-found__link" to={first.path}>{first.label}으로 가기</Link>}
    </section>
  )
}
