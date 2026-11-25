import { useRef, useState } from 'react'
import { createSubmitGuard } from '@/shared/lib/submitGuard'

// 저장 버튼: 요청 중 비활성 + 진행 표시, 두 번 눌러도 요청은 한 번 (05 POL-120).
// onClick이 Promise를 돌려주면 끝날 때까지 잠근다. 실패해도 입력값은 화면이 그대로 둔다 (POL-122·125).
// variant: primary(기본)·secondary·ghost·danger / size: sm(40)·md(44, 기본)·lg(48) — 디자인 v3.0 (COMPONENT_SPEC STEP 07)
// loading: 폼 submit처럼 요청을 화면이 들고 있을 때 밖에서 진행 상태를 준다.
// 사용: <Button onClick={() => saveCustomer(form)}>저장</Button>
//       <Button variant="secondary" onClick={close}>닫기</Button>
//       <Button type="submit" loading={submitting} pendingText="로그인 중…">로그인</Button>

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['sm', 'md', 'lg']

export default function Button({
  onClick,
  children,
  pendingText = '저장 중…',
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  disabled = false,
  ...rest
}) {
  const guardRef = useRef(null)
  if (guardRef.current === null) guardRef.current = createSubmitGuard()
  const [pending, setPending] = useState(false)
  const busy = pending || loading

  function handleClick(event) {
    if (!onClick || guardRef.current.isPending()) return
    setPending(true)
    guardRef.current
      .run(() => onClick(event))
      .catch(() => {}) // 오류 표시는 호출한 화면이 ApiError로 한다
      .finally(() => setPending(false))
  }

  const classes = ['button']
  if (variant !== 'primary' && VARIANTS.includes(variant)) classes.push(`button--${variant}`)
  if (size !== 'md' && SIZES.includes(size)) classes.push(`button--${size}`)

  return (
    <button {...rest} type={type} className={classes.join(' ')} disabled={disabled || busy} aria-busy={busy} onClick={handleClick}>
      {busy ? (
        <>
          <span className="button__spinner" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
