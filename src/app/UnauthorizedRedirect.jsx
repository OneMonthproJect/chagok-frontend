import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { onUnauthorized } from '@/shared/api/client'
import { PATHS } from '@/app/paths'
import { unauthorizedState } from '@/app/unauthorizedState'

// client가 401 AUTH_REQUIRED를 받으면(토큰은 client가 이미 지움) 로그인 화면으로 보낸다 (05 POL-126).
// state: reason 'expired' → 로그인 화면이 "다시 로그인해 주세요." 안내를 보인다,
//        from = 401이 난 화면 → 다시 로그인하면 그 화면으로 돌아간다 (D-68).
export default function UnauthorizedRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  // 화면을 옮길 때마다 구독을 다시 하지 않도록, 지금 위치는 ref로 읽는다
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(
    () => onUnauthorized(() => {
      navigate(PATHS.LOGIN, { replace: true, state: unauthorizedState(locationRef.current, PATHS.LOGIN) })
    }),
    [navigate],
  )
  return null
}
