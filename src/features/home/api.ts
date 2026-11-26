// features/home의 API 호출 (08 04). 요청은 shared/api/client를 거친다.
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type { HomeSummary } from './types'

/** 08 04 */
export function getHome(): Promise<HomeSummary> {
  return request<HomeSummary>('GET', '/api/home', {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetHome()) : undefined,
  })
}
