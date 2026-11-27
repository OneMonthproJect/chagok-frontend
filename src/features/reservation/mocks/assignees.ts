// 개발용 Mock (CONVENTIONS 7장 「Mock」) — 08 36 담당 후보. 계약의 기준은 08이다.
// assignees.json은 08 7.1 36 JSON 예시 그대로이고, 07 7.1 A 정비소의 사장(owner_a)·정비사(mech_a)와 같다.
// 로그인은 A 정비소 기준(다른 Mock과 같음). 쿼리가 없고 상태를 쌓지 않는다.
// 예약 Mock(index.ts·seed.json)과 파일을 나눠 둔다 — 같은 파일을 고치는 다른 PR(#30)과 겹치지 않게.
// api.ts만 동적 import()로 부른다. 화면·pages는 import하지 않는다.

import type { MockResponse } from '@/shared/api/client'
import assigneesOk from './assignees.json'

export function mockGetAssignees(): MockResponse {
  return { status: 200, body: assigneesOk }
}
