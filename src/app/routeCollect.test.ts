import { describe, expect, it } from 'vitest'
import { collectRoutes } from '@/app/routeCollect'
import { menuMode } from '@/app/menuMode'

// 앱 골격 (chagok-frontend#17): 라우트 수집·메뉴·메뉴 모양 (화면 없이)
const mod = (route: object) => ({ default: route as never })

describe('collectRoutes', () => {
  it('공개 라우트와 로그인 라우트를 나누고, 메뉴는 menu를 선언한 화면만 order 순으로', () => {
    const r = collectRoutes({
      '../pages/S05/route.jsx': mod({ path: '/customers', element: 'S05', menu: { label: '고객·차량', order: 30, icon: 'customers' } }),
      '../pages/S01/route.jsx': mod({ path: '/login', element: 'S01', public: true }),
      '../pages/S02/route.jsx': mod({ path: '/', element: 'S02', menu: { label: '홈', order: 10, icon: 'home' } }),
      '../pages/S06/route.jsx': mod({ path: '/customers/:customerId', element: 'S06' }),
    })
    expect(r.publicRoutes.map((x) => x.path)).toEqual(['/login'])
    expect(r.appRoutes.map((x) => x.path)).toEqual(['/', '/customers', '/customers/:customerId'])
    expect(r.menu).toEqual([
      { path: '/', label: '홈', order: 10, icon: 'home' },
      { path: '/customers', label: '고객·차량', order: 30, icon: 'customers' },
    ])
  })

  it('화면이 없으면 메뉴도 비어 있다 (빈 메뉴 항목 없음)', () => {
    const r = collectRoutes({ '../pages/S01/route.jsx': mod({ path: '/login', element: 'S01', public: true, menu: { label: 'x', order: 1 } }) })
    expect(r.menu).toEqual([])
    expect(r.appRoutes).toEqual([])
  })

  it('형식이 틀리거나 경로가 겹치면 바로 알린다', () => {
    expect(() => collectRoutes({ '../pages/S02/route.jsx': mod({ element: 'x' }) })).toThrow(/S02/)
    expect(() => collectRoutes({
      '../pages/A/route.jsx': mod({ path: '/', element: 'a' }),
      '../pages/B/route.jsx': mod({ path: '/', element: 'b' }),
    })).toThrow(/두 번/)
  })

  it('끝 슬래시만 다른 경로를 중복으로 거부한다', () => {
    expect(() => collectRoutes({
      '../pages/A/route.jsx': mod({ path: '/customers', element: 'a' }),
      '../pages/B/route.jsx': mod({ path: '/customers/', element: 'b' }),
    })).toThrow(/같은 경로가 두 번 있습니다/)
  })
})

describe('menuMode (디자인 v3.0 RWD)', () => {
  it('폭으로 정한다: ≥1440 펼침, 1024~1439 접힘, <1024 위쪽 탭', () => {
    expect(menuMode(1920, null)).toBe('expanded')
    expect(menuMode(1440, null)).toBe('expanded')
    expect(menuMode(1366, null)).toBe('collapsed')
    expect(menuMode(1024, null)).toBe('collapsed')
    expect(menuMode(1023, null)).toBe('top')
    expect(menuMode(768, null)).toBe('top')
  })

  it('사용자가 고르면 그 선택을 유지하되, 좁은 화면은 항상 위쪽 탭', () => {
    expect(menuMode(1366, true)).toBe('expanded')
    expect(menuMode(1920, false)).toBe('collapsed')
    expect(menuMode(768, true)).toBe('top')
  })
})
