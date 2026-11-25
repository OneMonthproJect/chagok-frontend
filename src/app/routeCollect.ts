// pages/*/route.jsx 를 모아 라우트·메뉴로 나눈다 (chagok-frontend#17, STARTER 07). 화면 없이 테스트하도록 순수 함수로 둔다.
//
// route.jsx 형식 (default export):
//   { path, element, public?, menu? }
//   - public: true  → 로그인 없이, AppLayout 밖 (S-01)
//   - menu: { label, order, icon } → 사이드바·위쪽 탭 항목. 라우트가 있는 화면만 메뉴에 보인다(빈 메뉴 없음)
//   - icon: app/menuIcons.jsx 의 이름 ('home' | 'targets' | 'customers')

export interface RouteMenu {
  label: string
  order: number
  icon?: string
}

export interface PageRoute {
  path: string
  element: unknown
  public?: boolean
  menu?: RouteMenu
}

export interface MenuItem extends RouteMenu {
  path: string
}

export interface CollectedRoutes {
  publicRoutes: PageRoute[]
  appRoutes: PageRoute[]
  menu: MenuItem[]
}

/** import.meta.glob(eager) 결과 { 파일경로: { default: route } } 를 받는다 */
export function collectRoutes(modules: Record<string, { default?: PageRoute }>): CollectedRoutes {
  const routes = Object.keys(modules)
    .sort()
    .map((file) => {
      const route = modules[file]?.default
      if (!route || typeof route.path !== 'string' || !route.element) {
        throw new Error(`${file}: route.jsx는 { path, element } 를 default export 해야 합니다`)
      }
      return route
    })

  const seen = new Set<string>()
  for (const route of routes) {
    const path = route.path && (route.path.replace(/\/+$/, '') || '/')
    if (seen.has(path)) throw new Error(`같은 경로가 두 번 있습니다: ${route.path}`)
    seen.add(path)
  }

  const menu = routes
    .filter((r) => !r.public && r.menu)
    .map((r) => ({ path: r.path, ...(r.menu as RouteMenu) }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))

  return {
    publicRoutes: routes.filter((r) => r.public),
    appRoutes: routes.filter((r) => !r.public),
    menu,
  }
}
