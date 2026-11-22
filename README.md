# 차곡 · chagok-frontend

차곡(정비소용 예약 CRM)의 React 화면입니다. 기획 문서·협업 규칙·코드 구조 규칙은 **[chagok-docs](../chagok-docs)** 에 있습니다.

| 무엇 | 어디 |
|---|---|
| 범위·기능 ID·API 명세·화면 | `chagok-docs/docs/00·04·08·09` |
| 코드 구조 규칙 (프론트 7장) | `chagok-docs/CONVENTIONS.md` |
| 브랜치·이슈·PR·릴리스 | `chagok-docs/CONTRIBUTING.md` |
| 처음 보는 팀원 안내 | `chagok-docs/docs/etc/GUIDE_레포구조_협업규칙_AI스킬안내.md` |

## 지금 상태

초기 세팅이 끝난 상태입니다: React + Vite, JavaScript 중심 + TypeScript 병행, ESLint 경계 규칙, 폴더 구조. 첫 화면은 백엔드 연결만 확인합니다(`/actuator/health`). 화면·로그인 가드·공통 응답 처리는 `기반` 이슈에서 채웁니다.

```text
src/
├── main.jsx
├── app/        라우팅, 로그인 가드 (지금은 서버 확인 화면)
├── shared/     api/client.ts(유일한 fetch 위치) · ui/ · lib/   ← features·pages를 import하지 않음
├── features/   도메인별 api.ts · types.ts(08 그대로) · components/   ← 다른 feature를 import하지 않음
└── pages/      화면 조립, 09의 S-xx와 1:1
```

- **JS와 TS**: 화면 컴포넌트는 `.jsx`, API 타입·클라이언트는 `.ts`. `tsconfig.json`의 `allowJs`로 함께 쓰고, `npm run build`가 타입 검사(`tsc --noEmit`) 후 빌드합니다.
- **DB는 직접 쓰지 않습니다.** 데이터는 모두 백엔드 REST API(08)로만 받습니다.

## 실행

준비: Node 22 LTS, 백엔드 실행 중(`chagok-backend` README).

```bash
cp .env.example .env.local     # Windows PowerShell: copy .env.example .env.local
npm ci
npm run dev                    # http://localhost:5173 — "백엔드 상태: UP"이 보이면 연결 성공
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버. `/api`·`/actuator` 요청을 `VITE_DEV_PROXY_TARGET`(기본 `http://localhost:8080`)로 넘김 |
| `npm run lint` | ESLint (경계 규칙 포함). CI에서도 실행 |
| `npm run build` | 타입 검사 + 빌드. CI에서도 실행 |

CI(`frontend-ci`)는 `npm ci` → `npm run lint` → `npm run build`를 모든 PR과 develop·main push에서 돌립니다. `package.json`·`package-lock.json`이 없으면 실패합니다. 실패(❌)한 PR은 머지하지 않습니다(CONTRIBUTING 5장).

## 환경변수

| 이름 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | API 주소. 비우면 같은 주소(개발 중에는 프록시) |
| `VITE_DEV_PROXY_TARGET` | 개발 서버가 넘길 백엔드 주소 |

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
