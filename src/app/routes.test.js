// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

// 실제 앱처럼 app/routes(모든 pages/*/route.jsx)를 먼저 불러도 모듈을 읽는 중에 오류가 없어야 한다.
// 화면이 app/routes를 다시 import하면 순환이 생기므로, 모듈 최상단에서 appRoutes·menu를 읽으면 여기서 실패한다
// (#28에서 HomePage가 그렇게 해 개발 서버 홈이 빈 화면이 된 적이 있음).
describe('app/routes 불러오기', () => {
  it('모든 화면 라우트를 순환 없이 모으고, P0-핵심 메뉴 순서가 홈 · 재점검 대상 · 고객·차량', async () => {
    const { appRoutes, publicRoutes, menu } = await import('@/app/routes')
    expect(publicRoutes.map((r) => r.path)).toContain('/login')
    expect(appRoutes.map((r) => r.path)).toContain('/')
    expect(menu.map((m) => m.label).filter((l) => ['홈', '재점검 대상', '고객·차량'].includes(l))).toEqual(['홈', '재점검 대상', '고객·차량'])
  })
})
