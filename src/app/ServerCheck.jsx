import { useEffect, useState } from 'react'
import { getServerHealth } from '@/shared/api/client'

// 초기 세팅 확인용 화면: 백엔드가 떠 있고 DB에 연결됐는지만 보여준다. `기반` 이슈에서 S-01 로그인으로 바뀐다.
export default function ServerCheck() {
  const [state, setState] = useState({ loading: true, status: null, error: null })

  useEffect(() => {
    getServerHealth()
      .then((status) => setState({ loading: false, status, error: null }))
      .catch((error) => setState({ loading: false, status: null, error: error.message }))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>차곡</h1>
      {state.loading && <p>백엔드 연결 확인 중…</p>}
      {state.status && <p>백엔드 상태: {state.status}</p>}
      {state.error && <p>백엔드에 연결하지 못했습니다: {state.error}</p>}
    </main>
  )
}
