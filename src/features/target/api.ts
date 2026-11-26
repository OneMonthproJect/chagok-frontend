// features/target의 API 호출 (08 14). 요청은 shared/api/client를 거친다.
// Mock은 개발 서버에서 VITE_USE_MOCK=true일 때만, 동적 import()로 불러 운영 번들에 들어가지 않는다 (CONVENTIONS 7장 「Mock」).

import { MOCK_ENABLED, request } from '@/shared/api/client'
import type { TargetListResponse } from './types'

/** 08 14. 쪽 나누기 없이 전부, 정렬은 서버(도래 먼저 → 다음 정비일 이른 순) */
export function getTargets(): Promise<TargetListResponse> {
  return request<TargetListResponse>('GET', '/api/targets', {
    mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.mockGetTargets()) : undefined,
  })
}
