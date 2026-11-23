import { useRef, useState } from 'react'
import { createSubmitGuard } from '@/shared/lib/submitGuard'

// 저장 버튼: 요청 중 비활성 + 진행 표시, 두 번 눌러도 요청은 한 번 (05 POL-120).
// onClick이 Promise를 돌려주면 끝날 때까지 잠근다. 실패해도 입력값은 화면이 그대로 둔다 (POL-122·125).
// 사용: <Button onClick={() => saveCustomer(form)}>저장</Button>
//       <Button variant="secondary" onClick={close}>닫기</Button>

export default function Button({ onClick, children, pendingText = '저장 중…', variant = 'primary', type = 'button', disabled = false, ...rest }) {
  const guardRef = useRef(null)
  if (guardRef.current === null) guardRef.current = createSubmitGuard()
  const [pending, setPending] = useState(false)

  function handleClick(event) {
    if (!onClick || guardRef.current.isPending()) return
    setPending(true)
    guardRef.current
      .run(() => onClick(event))
      .catch(() => {}) // 오류 표시는 호출한 화면이 ApiError로 한다
      .finally(() => setPending(false))
  }

  const className = variant === 'secondary' ? 'button button--secondary' : 'button'
  return (
    <button {...rest} type={type} className={className} disabled={disabled || pending} aria-busy={pending} onClick={handleClick}>
      {pending ? pendingText : children}
    </button>
  )
}
