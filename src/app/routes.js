import { collectRoutes } from '@/app/routeCollect'

// 화면 라우트 수집 (chagok-frontend#17). 화면 이슈는 pages/Sxx/route.jsx 만 만들고 App.jsx·AppMenu·paths.js는 고치지 않는다.
const modules = import.meta.glob('../pages/*/route.jsx', { eager: true })

export const { publicRoutes, appRoutes, menu } = collectRoutes(modules)
