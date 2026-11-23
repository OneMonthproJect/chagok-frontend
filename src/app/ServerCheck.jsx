import { useEffect, useState } from 'react'
import { getServerHealth } from '@/shared/api/client'
import Layout from '@/shared/ui/Layout.jsx'

// 임시 진입 화면: 백엔드가 떠 있고 DB에 연결됐는지만 보여 준다(요청은 client.ts를 거침).
// S-01 로그인 화면(F-AUTH-01 화면 이슈)이 App.jsx의 로그인 경로에서 이 화면을 대신한다. 버튼·메뉴는 두지 않는다.
export default function ServerCheck() {
  const [state, setState] = useState({ loading: true, status: null, error: null })

  useEffect(() => {
    getServerHealth()
      .then((status) => setState({ loading: false, status, error: null }))
      .catch((error) => setState({ loading: false, status: null, error: error.message }))
  }, [])

  return (
    <Layout header={<strong>차곡</strong>}>
      {state.loading && <p>백엔드 연결 확인 중…</p>}
      {state.status && <p>백엔드 상태: {state.status}</p>}
      {state.error && <p>{state.error}</p>}
    </Layout>
  )
}
