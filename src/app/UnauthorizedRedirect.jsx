import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onUnauthorized } from '@/shared/api/client'
import { PATHS } from '@/app/paths'

// client가 401 AUTH_REQUIRED를 받으면(토큰은 client가 이미 지움) 로그인 화면으로 보낸다 (05 POL-126).
// reason: 'expired' → 로그인 화면이 "다시 로그인해 주세요" 안내를 보일 수 있게 넘긴다.
export default function UnauthorizedRedirect() {
  const navigate = useNavigate()
  useEffect(
    () => onUnauthorized(() => navigate(PATHS.LOGIN, { replace: true, state: { reason: 'expired' } })),
    [navigate],
  )
  return null
}
