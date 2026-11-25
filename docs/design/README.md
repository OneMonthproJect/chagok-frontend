# 디자인 기준 — ChaGok Design v3.0 (P0·P1)

> 이 폴더는 **디자인 참조 자료**다. 기능·정책·API·화면 ID의 기준은 chagok-docs(`source-of-truth`: 13 결정 > 00·04·07·08 > 나머지)이고, 여기 문서가 그것과 다르면 chagok-docs가 우선한다. 여기를 고쳐서 정책이 바뀐 것으로 처리하지 않는다.
> 프로토타입은 Mock 데이터로 동작하는 **디자인 확인용**이다. 이 저장소의 `src/`와 관계없고, 그대로 복사해 구현하지 않는다.

## 1. 목적과 현재 기준

| 항목 | 값 |
|---|---|
| 목적 | 팀이 같은 화면·흐름·컴포넌트 구조를 보고 P0부터 구현하도록 기준 디자인과 설계 근거를 한곳에 둔다 |
| **최종 기준 버전** | **ChaGok — Design v3.0** (STEP 09-A 디자인, 09-B 소스 정리, 09-C 통합 검증·정책 수정, 09-E docs #111 반영, 2026-11-25) |
| 범위 | P0-핵심 · P0-나머지 · P1. P2·Non-goal은 디자인하지 않음 |
| **개발 순서** | **실제 개발은 P0부터.** P1은 디자인·Mock까지이며 이슈가 아직 없다(범위 동결 chagok-docs#103 기록 뒤 생성). F-CUS-10·11(비활성화·익명화)은 POL-46 확인 전 구현 시작 안 함 |
| 상태 | 디자인 완료 · 프로토타입 연결 완료 · Mock 동작 확인까지. **실제 기능 개발·실제 API 연동은 P0·P1 모두 미착수**(기능별: `references/DESIGN_PROGRESS.md` 6장) |
| 판정 | CONDITIONAL READY (P0·P1 디자인 기준) — 조건·결정 필요 D1~D18: `references/DESIGN_VERIFICATION.md` 「STEP 09-C」 |
| 화면 크기 | PC·태블릿(03 NFR-04). 폰 폭은 지원 범위 밖 — 알려진 한계(같은 문서 9C-7) |
| 기준 커밋 | **chagok-docs develop `e57b2be`**(STEP 09-E에서 확인, #111 예약 API 19 반영. 이후 `c68d41e`까지 확인 — D-71 협업 규칙만 바뀌어 화면·API 영향 없음) · chagok-frontend develop `bf2ab08`(이후 `c6304ec`까지 확인 — `.github` PR 규칙만 바뀜). 이전 검증 기준(09-A `ac0705b`, 09-C·D `42c75df`)은 각 문서에 검증 이력으로 남김 |

## 2. 주요 페이지 9개 (기본 확인 경로)

먼저 `improved-v3.0/screenshots/pages/`의 대표 화면 9장을 본다. 모달·패널·오류·권한별 상태는 페이지 안의 상태이고, 따로 보는 검증용 캡처는 3장에 있다.

| ID | 페이지 | 권한 | 대표 캡처 | 단계 |
|---|---|---|---|---|
| S-01 | 로그인 (+ 비밀번호 변경·약관 동의 단계) | 공개 | `S-01-login.png` | P0 (단계는 P1) |
| S-02 | 홈 (요약·캘린더·예약 상세 패널·고객 집계) | 사장·정비사 | `S-02-home.png` | P0 (고객 집계 P1) |
| S-04 | 재점검 대상 (+ 연락 준비) | 사장·정비사 | `S-04-reinspection.png` | P0 (연락 준비 문자·결과 P1) |
| S-05 | 고객·차량 목록 | 사장·정비사 | `S-05-customers.png` | P0 (비활성·지표 P1) |
| S-06 | 고객 상세 | 사장·정비사 | `S-06-customer-detail.png` | P0 (지표·비활성화 P1) |
| S-07 | 차량 상세 | 사장·정비사 | `S-07-vehicle-detail.png` | P0 (약식 도면·비활성화 P1) |
| S-08 | 방문·정비 기록 | 사장·정비사 | `S-08-visit-record.png` | P0 |
| S-09 | 정비소 설정 (탭 4) | 사장만 | `S-09-settings.png` | P1 |
| S-10 | 서비스 관리자 정비소 관리 | 서비스 관리자 | `S-10-admin.png` | P1 |

S-03은 폐지(D-54). 화면 이동·Route·Layout은 `references/FRONTEND_STRUCTURE.md` 11장.

## 3. 폴더

| 경로 | 내용 |
|---|---|
| `improved-v3.0/screenshots/pages/` | **기본 확인 경로.** 주요 페이지 9개 대표 화면(1440×900, v3 최종 소스) |
| `improved-v3.0/screenshots/verification/<페이지>/` | 검증용 상태 캡처 156장(480px). v2 아트보드 126 + P1 신규 28의 v3 상태, STEP 09-C 수정분 8장 갱신 + 확인 2장(`C-N1-*`), STEP 09-E #111 반영분 7장 갱신(지난 날짜 예약 패널의 「변경」 버튼: `Home-Week`·`Home-Week-SidebarCollapsed`·`Home-Week-Busy`·`Home-Refreshing`·`Home-CustomerStats-Custom`·`RWD-1366-Home`·`RWD-1920-Home`), STEP 09-E N5 누락분 1장 갱신(`Admin-ShopCreate-Errors`: 모달 뒤 목록의 「사장 아이디」 열 제거). 상태 ↔ 이름은 `references/SCREEN_SPEC.md` 9장 |
| `improved-v3.0/prototype/` | 실행되는 v3 Mock 프로토타입(한 파일 `index.html` + 이미지 8개) |
| `improved-v3.0/mapping/v2-to-v3-mapping.csv` | v2 아트보드 → v3 페이지·상태 번호(154행) |
| `improved-v2.0/` | 이전 개선본(v2.0): `screenshots/overview.png`·`thumbnails/`(126) · `assets/tokens.css`(디자인 토큰, v3도 같은 값) |
| `original-v1.0/README.md` | 원본 v1.0 보관 정보(파일은 저장소에 넣지 않음) |
| `CHANGELOG.md` | 디자인 변경 이력 (STEP 01~09, 09-A~E) |
| `references/FRONTEND_STRUCTURE.md` | 라우팅·Layout·Outlet·컴포넌트 트리·상태·반응형·파일 구조, **11장 P0·P1 통합 구조와 페이지별 컴포넌트** |
| `references/COMPONENT_SPEC.md` | 토큰·공통/도메인 컴포넌트 Props, 「STEP 09-C」 v3 소스 대응·P1 컴포넌트 |
| `references/PAGE_API_MAPPING.md` | 화면 × API 호출 시점·실패·갱신, **5장 P0·P1 통합 API**(계약 원본은 08) |
| `references/SCREEN_SPEC.md` | 화면 인벤토리·흐름·권한·상태, 9장 v2 → v3 매핑 |
| `references/DESIGN_VERIFICATION.md` | STEP 08·09·09-C 검증 결과, 결정 필요, 미검증, 알려진 한계 |
| `references/DESIGN_PROGRESS.md` | 진행 기록, 기능별 Coverage(P0·P1 × 상태) |

## 4. 확인 방법

1. **화면:** `improved-v3.0/screenshots/pages/` → 필요하면 `verification/`.
2. **프로토타입 실행:** `improved-v3.0/prototype/index.html`을 브라우저로 바로 연다(설치·서버 불필요). 글꼴 Pretendard는 인터넷이 있으면 CDN에서 불러오고, 없으면 기본 글꼴로 보인다.
   - 계정(07 시드 공개값): 사장 `owner_a` · 정비사 `mech_a` · 서비스 관리자 `admin`, 비밀번호 모두 `1234`. 모든 응답은 Mock이고 새로 고치면 처음 상태로 돌아간다.
   - 상태 재현: 주소 끝에 `#first-login` · `#first-login-mech` · `#inactive` · `#retention` · `#contacted` · `#inactive-customer`, 또는 `?fixture=이름`(예: `?fixture=loading`, 쉼표로 여러 개). 이름 40개: `action-error` · `action-forbidden` · `action-network` · `busy` · `conflict` · `contacted` · `detail-error` · `detail-loading` · `error` · `expire` · `first-login` · `first-login-mech` · `inactive` · `inactive-customer` · `list-error` · `list-loading` · `loading` · `login-network` · `login-slow` · `many` · `mechanic` · `missing-vehicle-info` · `network` · `no-customers` · `no-reservations` · `no-targets` · `no-vehicles` · `notfound` · `preview-error` · `preview-slow` · `pw-network` · `refreshing` · `retention` · `revisions` · `save-error` · `stale` · `submitting` · `timeout`. 실제 API 응답이 아니라 디자인 상황 재현용이다(SCREEN_SPEC 7장).
3. **Claude Design:** 캔버스 「ChaGok — Design v3.0」 https://claude.ai/artifact/BZJSL3aQeZJLiczt9v9MgG · 프로토타입 https://claude.ai/artifact/MmGjmo9bwoxBV1CqHcbaEL. 작성자 계정의 비공개 아티팩트라 팀원이 직접 못 열 수 있다. **캔버스는 STEP 09-C 정책 수정(N1~N5)과 STEP 09-E #111 반영(지난 날짜 예약의 「변경」 버튼·409 문구) 전 모습**이라(별도 Claude Design 세션에서 반영 중, 확인 대기), 차이가 있으면 이 폴더의 캡처·프로토타입이 기준이다(`references/DESIGN_VERIFICATION.md` 9C-2).
4. **페이지별 컴포넌트 구조:** `references/FRONTEND_STRUCTURE.md` 11-1(Route·Layout) → 11-3(페이지별 공통·기능 컴포넌트, Props·State·Event) → `COMPONENT_SPEC.md` 「STEP 09-C」.
5. **API 매핑:** `references/PAGE_API_MAPPING.md` 1장(화면 × API 한눈에) → 2장(P0 상세) → 5장(P1·계약 수준·TBD). 계약 원본은 chagok-docs `08_api_API명세서.md`.

## 5. 원본·과거 버전 (저장소에 넣지 않은 것)

| 자료 | 크기 | SHA-256 | 보관 |
|---|---|---|---|
| `ChaGok-Original-Design-v1.0.zip` (원본 v1.0) | 14,183,166 B | `fa1954c028d192d48beb809ed68995abf4d1f373a87284989ec80337199da625` | 작성자 로컬(승인 후 팀 보관 위치 기입) |
| `ChaGok-Design-v2.0-export.zip` (v2.0 전체 내보내기) | 72.7 MB | `4e32b02594cb50ab1467a9e511f462342e320c4dc2c11ade54c814ca7679b37e` | 2026-11-25 작성자 로컬에서 찾지 못함 — 보관 위치 확인 필요 |
| `ChaGok-Design-v3.0-export.zip` (v3.0 캡처 154 원본 크기·프로토타입 빌드·소스·매핑) | 58,152,125 B | `280b54bdaf7d9e86e6b678173f2bde50be80f77ba3ce87b11ce5528d6bc9c9a8` | 작성자 로컬(승인 후 기입) |
| `ChaGok-Design-v3.0-prototype-source-step09c.zip` (v3 프로토타입 소스, 09-B 정리 + 09-C 수정) — 이전 판 | 10,037,300 B | `955ee07aece38ff0b8f720b82ffdf65fb795d27f831649170238636c843e7cbc` | 작성자 로컬(승인 후 기입) |
| `ChaGok-Design-v3.0-prototype-source-step09e.zip` (**최신 소스**: 09-C + 09-E #111 반영, `DetailPanel.tsx`·`mock/db.ts` 2파일 변경) | 10,037,484 B | `1241865532ad3470102ce419f11443fc5d67f9a773332eb7058c6b918d73e731` | 작성자 로컬(승인 후 기입) |

프로토타입 **소스**(`.tsx`)는 저장소에 넣지 않는다. `eslint .`가 검사해 CI가 실패하고, 실제 `src/`와 섞일 수 있기 때문이다. 저장소에는 실행본(`prototype/index.html`)만 둔다.

## 6. 앞으로 수정·동기화 기준

- 정책·API·화면 ID가 바뀌면 **chagok-docs를 먼저** 고친다(결정 → 13 → 00·04·08·09). 이 폴더는 그 뒤에 맞춘다.
- 디자인을 바꿀 때는 Claude Design 캔버스, 프로토타입 소스(위 소스 ZIP), 이 폴더의 캡처·문서를 **함께** 갱신하고 `CHANGELOG.md`에 남긴다. 셋 중 하나만 바뀐 상태로 두지 않는다. 지금 캔버스는 N1~N5와 09-E 반영분이 빠져 있다(위 4장).
- 실제 구현이 디자인과 달라야 하면 이 폴더를 고치지 말고 결정 이슈로 올린다. 프로토타입 Mock 필드 이름은 08과 다르므로 구현은 08을 따른다(PAGE_API_MAPPING 4장·5-5).
- 결정 필요 D1~D18이 정해지면 해당 화면·문서만 고치고 `DESIGN_VERIFICATION.md` 9C-5에 결과를 적는다.
- 원본(v1.0)·과거 개선본(v2.0)은 고치지 않는다. 비교와 이력 확인용이다.

## 7. 읽는 순서 (화면 이슈 착수 전)

이 README → `screenshots/pages/` → `references/DESIGN_VERIFICATION.md`(조건·결정·한계) → `FRONTEND_STRUCTURE.md` 11장 → `COMPONENT_SPEC.md` → `PAGE_API_MAPPING.md` → 해당 화면의 `verification/` 캡처.
