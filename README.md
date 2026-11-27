# 차곡 · chagok-frontend

차곡(정비소용 예약 CRM)의 React 화면입니다. 기획 문서·협업 규칙·코드 구조 규칙은 **[chagok-docs](../chagok-docs)** 에 있습니다.

| 무엇 | 어디 |
|---|---|
| 범위·기능 ID·API 명세·화면 | `chagok-docs/docs/00·04·08·09` |
| 코드 구조 규칙 (프론트 7장) | `chagok-docs/CONVENTIONS.md` |
| 브랜치·이슈·PR·릴리스 | `chagok-docs/CONTRIBUTING.md` |
| 처음 보는 팀원 안내 | `chagok-docs/docs/etc/GUIDE_레포구조_협업규칙_AI스킬안내.md` |
| 디자인 기준 (v3.0 화면·컴포넌트 구조·API 매핑, 참조용) | [`docs/design/README.md`](docs/design/README.md) — 주요 페이지 9 캡처·Mock 프로토타입. 정책 기준은 chagok-docs |

## 지금 상태

P0-핵심과 P0-나머지 화면이 들어간 상태입니다(2026-11-27, develop `9491f19`). M2 통합 검증(태그 `v0.5-m2-integration`, 2026-11-26)을 통과했고, P0-나머지 구현 이슈(chagok-docs 12 백로그 5장)는 모두 닫혔습니다. 화면은 S-01 로그인, S-02 홈(오늘 예약 목록 → 월·주 캘린더, 예약 상세 패널), S-04 재점검 대상, S-05 고객·차량 목록, S-06 고객 상세, S-07 차량 상세, S-08 방문·정비 기록과 모달 M-01·M-02·M-03입니다. P1 화면(S-09 설정, S-10 서비스 관리자, S-01 비밀번호 변경·약관 단계)은 아직 없습니다. 다음 마일스톤 순서는 `chagok-docs` README 「지금 단계」를 봅니다.

```text
src/
├── main.jsx      공통 스타일(theme.css) + App
├── app/          App.jsx · routes.js·routeCollect.ts(화면 route 수집) · paths.js(경로 상수, 09 S-xx와 1:1) · RequireAuth(로그인 가드) · UnauthorizedRedirect(401 → 로그인, from·reason, D-68) · AppLayout·AppHeader·AppMenu
├── shared/       ← features·pages를 import하지 않음
│   ├── api/client.ts    유일한 fetch 위치. request() · ApiError · onUnauthorized · MOCK_ENABLED · 10초 시간 초과(05 POL-125)
│   ├── ui/              StatusBadge · Button · Layout · Modal · FormField · EmptyState · ErrorNotice · ItemStatusList · theme.css
│   └── lib/             tokenStore(토큰 저장 한 곳) · submitGuard(중복 제출 잠금) · date · noteTag · recordDisplay · submitEdit · useEditForm
├── features/     auth · customer · home · maintenance · reservation · target — 도메인별 api.ts · types.ts(08 그대로) · components/ · mocks/(개발용)   ← 다른 feature를 import하지 않음
└── pages/        S01 · S02 · S04 · S05 · S06 · S07 · S08 — 화면 조립, 09의 S-xx와 1:1
```

### 공통 모듈 쓰는 법

| 모듈 | 예 | 지키는 것 |
|---|---|---|
| `request` | `request<Customer>('GET', '/api/customers/1')` → 성공이면 `data`, 실패면 `ApiError` | 08 0.2 해석. 401 `AUTH_REQUIRED`면 토큰을 지우고 로그인으로(LOGIN_FAILED는 화면이 처리). **자동 재전송 없음**(POL-125). 일시 문자열은 그대로 |
| `ApiError` | `catch (e) { if (e.code === 'INVALID_INPUT') showFieldErrors(e.fieldErrors) }` | `status`(응답 없음은 0) · `code`(08 0.3, 응답 없음은 `NETWORK_ERROR`) · `message` · `fieldErrors` · `details`(예: `{ reservationId }`). 실패해도 입력값을 지우지 않는다(POL-122) |
| Mock | `request('GET', path, { mock: MOCK_ENABLED ? () => import('./mocks').then((m) => m.detail(id)) : undefined })` | `features/<도메인>/api.ts`에서만. 개발 서버 + `VITE_USE_MOCK=true`일 때만 켜지고 운영 빌드에서는 빠진다. 응답은 08 0.2 모양 그대로(CONVENTIONS 7장 Mock) |
| `StatusBadge` | `<StatusBadge status={item.status} />` | 서버가 준 `UNKNOWN`·`AHEAD`·`SOON`·`DUE`를 미확인·여유·임박·도래로. 계산하지 않음 |
| `Button` | `<Button onClick={() => save(form)}>저장</Button>` | `onClick`이 Promise면 끝날 때까지 비활성 + "저장 중…", 두 번 눌러도 한 번(POL-120). 오류 표시는 화면이 |
| `Layout` | `<Layout header={<AppHeader />}>…</Layout>` | 상단 영역 + 본문, 1024px 기준 여백만. 메뉴·머리 내용은 화면 이슈가 넘김 |
| 로그인 가드 | `App.jsx`의 `<Route element={<RequireAuth />}>` 안에 로그인이 필요한 화면을 둔다 | 토큰이 없으면 `/login`. 로그인 화면은 `setToken()`으로 저장, 로그아웃은 `clearToken()`(POL-12) |

### ⚠ 임시 디자인 (D-19 화면 상세 설계 2026-11-24 확정 전)

`src/shared/ui/theme.css`의 색(Soft Blue Garage × Monochrome Automotive: 네이비·파스텔 블루·연핑크·화이트·웜 아이보리)·여백·글꼴과 `Layout`의 배치는 **확정이 아닙니다.** D-19 뒤 바꿀 곳: `theme.css` 변수, `Layout`(메뉴 위치·머리 구성·좁은 화면 배치), `Button` 모양, `StatusBadge` 색(09 0장 💡 회색·파랑·주황·빨강). 동작(요청·오류·가드·중복 제출 방지)은 바뀌지 않습니다.

- **JS와 TS**: 화면 컴포넌트는 `.jsx`, API 타입·클라이언트는 `.ts`. `tsconfig.json`의 `allowJs`로 함께 쓰고, `npm run build`가 타입 검사(`tsc --noEmit`) 후 빌드합니다.
- **DB는 직접 쓰지 않습니다.** 데이터는 모두 백엔드 REST API(08)로만 받습니다.

## 실행

준비: Node 22 LTS, 백엔드 실행 중(`chagok-backend` README).

```bash
cp .env.example .env.local     # Windows PowerShell: copy .env.example .env.local
npm ci
npm run dev                    # http://localhost:5173/login → 시연 계정(chagok-docs 07 7.1, 예: owner_a / 1234)으로 로그인해 홈이 보이면 연결 성공 (시연 시드를 넣은 DB 기준)
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버. `/api`·`/actuator` 요청을 `VITE_DEV_PROXY_TARGET`(기본 `http://localhost:8080`)로 넘김 |
| `npm run lint` | ESLint (경계 규칙·Mock import 금지 포함). CI에서도 실행 |
| `npm run typecheck` | 타입 검사만 |
| `npm test` | Vitest (공통 모듈·공통 UI와 각 feature의 api·흐름·화면 컴포넌트 테스트). CI에서도 실행 |
| `npm run build` | 타입 검사 + 빌드. CI에서도 실행 |

CI(`frontend-ci`)는 `npm ci` → `npm run lint` → `npm test` → `npm run build`를 모든 PR과 develop·main push에서 돌립니다. `package.json`·`package-lock.json`이 없으면 실패합니다. 실패(❌)한 PR은 머지하지 않습니다(CONTRIBUTING 5장).

## 환경변수

| 이름 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | API 주소. 비우면 같은 주소(개발 중에는 프록시) |
| `VITE_DEV_PROXY_TARGET` | 개발 서버가 넘길 백엔드 주소 |
| `VITE_USE_MOCK` | `true`면 개발 서버에서만 Mock 응답 사용(`.env.development.local`). 운영 빌드에서는 무시 |

`.env.local`은 Git에 올리지 않습니다(`.gitignore`). `VITE_`로 시작하는 값은 브라우저에 그대로 노출되므로 비밀값을 넣지 않습니다.

## 작업 폴더와 AI 설정

이 레포는 `chagok-docs` 옆에 있어야 합니다. 화면을 확인하려면 `chagok-backend`도 함께 띄웁니다.

```text
chagok/
├── chagok-docs/
├── chagok-backend/
└── chagok-frontend/   ← 여기
```

Claude를 쓴다면 처음 한 번, 그리고 `chagok-docs`를 pull한 뒤 공용 AI 설정을 복사합니다 (Git Bash).

```bash
bash ../chagok-docs/scripts/sync-claude.sh
```

`.claude/rules·skills·agents`는 복사본이라 커밋되지 않습니다. 고칠 일이 있으면 `chagok-docs`에서 고칩니다.

## 작업할 때마다

```bash
git switch develop && git pull
git switch -c feature/#이슈번호-short-name     # 버그는 fix/, 설정은 chore/
# 작업 → 커밋 → push → develop으로 PR
```

API 모양이 08과 다르면 프론트에서 맞춰 우회하지 않고, 08 문서 PR(`chagok-docs`)이나 백엔드 이슈로 올립니다.
