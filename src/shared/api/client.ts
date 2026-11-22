// 모든 HTTP 요청은 이 파일에서만 보낸다 (CONVENTIONS 7장). 화면은 features/*/api.ts를 거친다.
// 공통 응답 처리(success/data/error)와 토큰 첨부는 `기반` 이슈에서 08 API 명세 0장대로 채운다.

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

export async function getServerHealth(): Promise<string> {
  const response = await fetch(`${BASE_URL}/actuator/health`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const body: { status?: string } = await response.json()
  return body.status ?? 'UNKNOWN'
}
