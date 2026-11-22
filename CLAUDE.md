# CLAUDE.md — chagok-frontend에서 AI로 작업할 때

## 먼저 확인

- `.claude/rules/`·`.claude/skills/`·`.claude/agents/`는 `chagok-docs`에서 복사한 사본이다(커밋되지 않음). **비어 있으면** 작업을 시작하지 말고 사용자에게 `bash ../chagok-docs/scripts/sync-claude.sh` 실행을 요청한다.
- 공용 규칙: `.claude/rules/ai-rules.md`, `.claude/rules/source-of-truth.md`
- 원본 문서는 옆 레포에 있다(`.claude/settings.json`의 `additionalDirectories`로 읽을 수 있음):

| 무엇 | 원본 |
|---|---|
| 코드 구조 (프론트는 7장, 4장의 StatusBadge) | `../chagok-docs/CONVENTIONS.md` |
| 브랜치·이슈·커밋·PR·릴리스·문서 동기화 | `../chagok-docs/CONTRIBUTING.md` |
| 범위·기능 ID·API·화면 | `../chagok-docs/docs/00`, `04`, `08`, `09` |

## 이 레포에서만

- 구조 `src/app` / `shared` / `features` / `pages` (CONVENTIONS 7장). feature끼리 import하지 않고, 상태(미확인/여유/임박/도래)를 프론트에서 계산하지 않는다.
- JavaScript 위주 + TypeScript 병행. API 타입(`features/*/types.ts`)은 08의 표·JSON 예시와 글자까지 같게 둔다.
- `fetch`는 `shared/api/client.ts`에서만 부른다. 화면은 `features/*/api.ts`를 거친다.
- 화면 ID(S-xx)와 `pages` 파일은 09와 1:1.
- API 모양이 08과 다르면 프론트에서 맞춰 우회하지 말고 차이를 보고한다(`chagok-contract-checker`). 08을 바꿔야 하면 `chagok-docs`에 문서 PR, 코드 PR 본문 「문서 PR」 칸에 링크.
- 오류 처리는 `shared/api/client.ts` 한 곳에서 05 POL-120~129대로(입력값 유지, 자동 재전송 금지, 409 동시 수정 처리). 화면마다 따로 만들지 않는다.
- 작업 절차: `ai-rules.md` 「작업 절차」(분석 → 계획 보고 → 승인 → 구현 → 검증 → 결과 보고).
- 점검: `npm run lint && npm run build`. 못 돌렸으면 "미검증(이유)"으로 보고하고 완료라고 하지 않는다.
- API 구현을 확인해야 하면 `../chagok-backend`를 읽기만 한다.
