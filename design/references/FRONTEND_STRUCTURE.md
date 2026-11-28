# FRONTEND_STRUCTURE — ChaGok Design v2.0 → v3.0(P0·P1) React 구조 설계 (STEP 07 · 09-C 갱신)

> **상태: 설계안(미확정).** 팀 승인과 저장소 대조(STEP 09·10) 전에는 확정으로 쓰지 않는다.
> 기준: chagok-docs develop `ac0705b`(2026-11-24, STARTER #95 머지 포함) · chagok-frontend develop `bf2ab08` · chagok-backend develop `aa03f59`.
> 우선순위: 13 결정 > 00·04·07·08 > 09 > CONVENTIONS 7장 > **STARTER 07·08(추천안)** > 이 문서. 이 문서는 STARTER 07·08을 **다시 쓰지 않고**, v2.0 디자인이 그 위에 더하거나 바꾸는 것만 적는다.
> 표기: **=** STARTER 그대로 · **+** v2.0이 더함 · **Δ** v2.0이 다르게 제안(💡 팀 결정) · **P0-나머지** 단계 구분.
> 독립 HTML 아트보드는 화면 그림일 뿐 React 구조가 아니다. 프로토타입 `prototype-src/`도 한 파일(App.tsx) 시연용이며, 아래 경로로 나누어 옮긴다.
> **v3.0 갱신 (STEP 09-C, 2026-11-25):** P1 화면 S-09·S-10과 P1 요소가 디자인에 들어왔다. v3.0 프로토타입 소스는 STEP 09-B에서 이 문서 8장 경로에 맞춰 모듈 54개로 나눴다(디자인 차이 0). P0·P1 통합 구조와 프로토타입 ↔ 설계 대응은 **11장**. 1~10장은 P0 설계(v2.0) 그대로이며, 11장이 바꾸는 곳은 11장에 적었다.

## 0. 저장소에서 확인한 것

| 항목 | 현재 (frontend `bf2ab08`) | 설계에 주는 영향 |
|---|---|---|
| 의존성 | react 19.1 · react-dom · react-router-dom 7.18 · Vite · Vitest · TS(병행) | 새 라이브러리(상태 관리·쿼리·폼·UI 키트) 추가 없이 설계. 추가가 필요하면 별도 `chore` PR(STARTER 08 규칙 6) |
| 라우터 | `BrowserRouter` + `<Routes>` (`app/App.jsx`) | 작성 중 이탈 확인(`useBlocker`)은 data router(`createBrowserRouter`)가 필요 → **3-1에서 결정**(9장 Q3) |
| `app/` | `App.jsx`·`RequireAuth.jsx`·`UnauthorizedRedirect.jsx`·`ServerCheck.jsx`·`paths.js`(LOGIN만) | 가드·401 이동은 있음 = 그대로 씀 |
| `shared/api/client.ts` | 공통 응답·`ApiError`·401 알림·Mock 판정·`NETWORK_ERROR` | 오류 처리는 여기 한 곳(09 0장). 화면은 `ApiError.code`로만 가른다 |
| `shared/lib` | `tokenStore`(localStorage, ❓ FU-3), `submitGuard`(두 번 누르기 방지) | 토큰 외 데이터는 브라우저 저장소에 두지 않음(STEP 06 규칙) |
| `shared/ui` | `Button`·`Layout`·`StatusBadge`·`theme.css` | v2.0 토큰(`--ck-*`)은 `theme.css`가 아니라 3-2·3-1 컴포넌트 CSS에 둔다(STARTER 08: theme.css 수정 금지) → 9장 Q7 |
| `features/`·`pages/` | 비어 있음(.gitkeep) | 아래 5·8장 경로로 생성 |
| CODEOWNERS | 모두 주석(결정 14 후 채움) | 소유자 = 추천만. 실제 변경 안 함 |

## 1. 화면 인벤토리 (C03 입력)

| ID | 화면 | 종류 | URL (9장 Q1) | 권한 | 단계 | 부모 Layout | 들어오는 곳 → 나가는 곳 | 주요 API | 이슈 (STARTER 02, 추천) | v2.0 아트보드 |
|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | 로그인 | 페이지 | `/login` | 공개 | 핵심 | 없음 | 가드·401·로그아웃 → `from` 또는 `/` | 01·03 | FE #16 (3) | Main, Login-* |
| — | 앱 골격 | Layout | — | 로그인 | 핵심 | — | — | 03 | FE #17 (3-1) | 모든 제품 화면 |
| S-02 | 홈 (요약·캘린더·패널) | 페이지 | `/` | 로그인 | 핵심(오늘 목록)·나머지(주·월) | AppLayout | S-01, 메뉴 → S-04, M-02, 패널, S-07, S-08 | 04·15·16·17·18·19·(20·21·36·39·40·41·42) | #24·#25·#26·#28 / #30·#31·#33·#36·#37 | Home-* |
| — | 예약 상세 패널 | 패널(S-02 안) | `/?reservation=<id>` | 로그인 | 핵심·나머지(행동) | S-02 | 캘린더·목록·S-04·S-07·409 → S-07·S-08·M-02 | 17·18·20·21·39·40·41 | #26·#31·#33 | Home-Panel-*, Home-Dialog-* |
| S-04 | 재점검 대상 | 페이지 | `/targets` | 로그인 | 핵심 (+연락 준비 💡) | AppLayout | 홈 요약·메뉴 → M-02, 패널, S-07 | 14·09·16 | #27 (16) | Reinspection-* |
| S-05 | 고객·차량 목록 | 페이지 | `/customers` | 로그인 | 핵심 | AppLayout | 메뉴 → M-01, S-06, S-07 | 05·06 | #19 (5) | Customer-List-* |
| S-06 | 고객 상세 | 페이지 | `/customers/:customerId` | 로그인 | 핵심 (수정 나머지) | AppLayout | S-05·S-07·M-01 → S-07, 차량 추가, 고객 수정, M-02, 패널 | 07·08·22 | #20 (6)·#21 (6-1)·#32 | Customer-Detail-*, Modal-AddVehicle*, Modal-EditCustomer* |
| S-07 | 차량 상세 | 페이지 | `/vehicles/:vehicleId` | 로그인 | 핵심 (수정·M-03 나머지) | AppLayout | S-05·S-06·패널·S-04·S-08 → S-06, S-08, M-02/패널, 차량 수정, M-03 | 09·10·11·23·37·38 | #22 (9)·#32·#34 | Vehicle-Detail, Vehicle-Detail-*, Vehicle-Toast-Saved, Modal-EditVehicle*, Modal-EditRecord*, Modal-RecordRevisions |
| S-08 | 방문·정비 기록 | 페이지 | `/visits/new?vehicleId=&reservationId=` | 로그인 | 핵심 (외부·거절·결과·담당 나머지) | AppLayout | 패널 방문 완료·S-07 → 저장 후 S-07 | 09·10·12·13·36 | #23 (10)·#35·#29 | Visit-Record-* |
| M-01 | 고객·차량 등록 | 모달 | 없음 | 로그인 | 핵심 | S-05, M-02 | → S-06(목록에서) / M-02로 돌아가 차량 채움 | 05·06 | #19 (5) | Modal-Register-*, Modal-Create-Register(ed) |
| M-02 | 예약 등록·변경 | 모달 | 없음 | 로그인 | 핵심 (담당·재배정 나머지) | S-02, S-04, S-06, S-07 | → 패널(성공·409) | 05·13·16·19·36 | #25 (14-2)·#37 | Modal-Create-*, Modal-Edit-* |
| M-03 | 정비 기록 수정 | 모달 | 없음 | 로그인(조건) | 나머지 | S-07 | → S-07(갱신) | 37·38 | #34 | Modal-EditRecord* |
| — | 차량 추가 | 모달(Δ) / 인라인(09 💡) | 없음 | 로그인 | 핵심 | S-06, M-01→M-02 | → S-06 갱신 / M-02 차량 채움 | 08 | #21 (6-1) | Modal-AddVehicle* |
| — | 고객 수정 · 차량 수정 | 모달 | 없음 | 로그인 | 나머지 | S-06 · S-07 | → 같은 화면 갱신 | 22 · 23 | #32 | Modal-EditCustomer*, Modal-EditVehicle* |
| — | 확인 대화상자 (방문 접수·취소·노쇼·정정·이탈) | 대화상자 | 없음 | 로그인 | 나머지 / 핵심(이탈) | 패널, S-08 | — | 39·20·21·40 | #31·#33·#23 | Home-Confirm-*, Home-Dialog-*, Visit-Record-LeaveConfirm |
| — | 404 · 조회 실패 · 오류 토스트 | 상태 | — | — | 공통 | AppLayout | — | — | 3-1·3-2 | Vehicle-NotFound, *-Error, Home-ErrorToast-* |
| — | 반응형 변형 · 접근성 | 같은 화면의 폭별 배치 | 위와 같음 | — | — | — | — | — | 3-1(메뉴) · 각 화면 | RWD-1920-*, RWD-1366-*, RWD-1024-*, RWD-768-*, A11y-Modal-KeyboardFocus |
| — | 디자인 가이드 | 문서(제품 아님) | 없음 | — | — | — | — | — | — | DS-*, Guide-* |

S-03은 만들지 않는다(폐지, D-54). ~~S-09·S-10은 P1이라 만들지 않는다~~ → v3.0에서 S-09·S-10(P1)을 추가했다: 11장.

아트보드 120개 ↔ 위 구현 단위 21개(페이지 7·패널 2·모달 8·확인 대화상자 1·Layout 1·공통 상태 2)의 대응과 Base·Variant·State·Result·Scenario 분류는 SCREEN_SPEC 4·8장(STEP 09). 같은 상태를 화면마다 만들지 않는 기준은 COMPONENT_SPEC 「STEP 09 — 반복 구조 통합」.

## 2. 라우팅 · Layout · Outlet (C01)

```
<RouterProvider>                                   Δ 9장 Q3: 이탈 확인 때문에 createBrowserRouter 권장 (현재 BrowserRouter)
  <UnauthorizedRedirect/>                          = 있음. 401 → /login (state.reason='expired')
  /login                → pages/S01 (AppLayout 밖) = 이미 토큰 있으면 / 로
  <RequireAuth>                                    = 있음. 토큰 없으면 /login (state.from)
    <AppLayout>                                    = 3-1. 머리·메뉴·<Outlet/> + (+) Toast 자리
      /                   pages/S02               = ?date ?reservation  + ?view=week\|month ?mine=1 (P0-나머지)
      /targets            pages/S04               = —                   + ?filter ?sort ?q ?vehicle (💡)
      /customers          pages/S05               = ?q ?page
      /customers/:customerId pages/S06
      /vehicles/:vehicleId pages/S07
      /visits/new         pages/S08               = ?vehicleId ?reservationId
      *                   NotFound (+)            Δ 로그인 상태의 없는 경로는 404 페이지(현재는 /login으로 보냄)
```

| 결정 대상 | 기준 (직접 접근·새로 고침·뒤로) | 설계 |
|---|---|---|
| 예약 상세 패널 | 새로 고쳐도 같은 예약을 봐야 하고, S-04·S-07·409에서 "기존 예약 보기"로 링크된다 | **URL 쿼리** `?reservation=<id>`(= STARTER). 닫기 = 쿼리 삭제. 좁은 화면 뒤로 = 닫기 |
| 홈 보기·날짜 | 새로 고침 후 같은 주/월 | `?date=YYYY-MM-DD` + `?view=week\|month` + `?mine=1` |
| 재점검 필터·정렬·검색 | 차량·예약으로 갔다 뒤로 오면 그대로(B09) | **URL 쿼리** `?filter=due\|soon\|free&sort=next\|name&q=` (기본값이면 생략). 고른 차량(연락 준비 패널) `?vehicle=<id>`. 펼친 카드·스크롤은 **화면 상태 + 스크롤 복원**(URL에 두지 않음) |
| 고객 목록 검색·쪽 | 뒤로 오면 그대로 | `?q=&page=`(= STARTER). 입력 중 글자는 화면 상태, 0.3초 뒤 URL 반영(`replace`) |
| 모달(M-01·M-02·M-03·차량 추가·수정) | 새로 고치면 닫혀도 됨(09에 복원 규칙 없음), 작성 중 데이터 노출 위험 | **URL 없음**(= STARTER 6장 4번). 여는 화면 상태로만 |
| 방문 기록 S-08 | 새로 고침해도 같은 차량 | 페이지. `vehicleId`·`reservationId` 쿼리. 입력값은 새로 고치면 사라짐(저장소 미사용) |
| 확인 대화상자 | 일시 | URL 없음 |
| 스크롤 복원 | 목록 → 상세 → 뒤로 | 라우터 `ScrollRestoration`(data router) 또는 페이지별 저장. Q3와 함께 |

참고: 명령서 예시 `/vehicles/:vehicleId/visits/new`와 STARTER `/visits/new?vehicleId=`가 다르다. 09 S-08 1번이 "차량이 채워져 오지 않으면 검색"을 허용하므로 STARTER 안을 따른다(9장 Q1).

경로 상수는 `app/paths.js`의 `PATHS`만 쓴다(= STARTER). 쿼리 키도 상수로 둔다(+ `QUERY`): `reservation`·`date`·`view`·`mine`·`filter`·`sort`·`q`·`page`·`vehicle`·`vehicleId`·`reservationId`.

## 3. 화면 흐름 (전달 값 · 유지 상태)

```mermaid
flowchart LR
  L["/login"] -->|성공: from 또는 /| H["/ 홈"]
  H -->|오늘 연락할 고객| T["/targets"]
  H -->|카드·목록 선택 ?reservation=| P["예약 패널"]
  H -->|빈 칸·빈 날·예약 등록| M2(["M-02"])
  T -->|카드 선택 ?vehicle=| CP["연락 준비 패널"]
  T & CP -->|예약 등록: vehicleId·items| M2
  T & CP -->|예약 있음| P
  M2 -->|신규 고객: 검색어| M1(["M-01"])
  M1 -->|저장: vehicleId| M2
  M2 -->|성공·409 reservationId| P
  P -->|방문 완료(18 성공): vehicleId·reservationId| V["/visits/new"]
  P -->|방문 접수 39 · 취소 20 · 노쇼 21 · 정정 40| P
  P -->|차량번호·상세 이동| VD["/vehicles/:vehicleId"]
  C["/customers ?q&page"] -->|신규 등록| M1
  M1 -->|저장: customerId| CD["/customers/:customerId"]
  C -->|고객명| CD
  C -->|차량번호| VD
  CD -->|차량 추가 · 수정| CD
  CD --> VD
  VD -->|고객명| CD
  VD -->|방문 기록: vehicleId| V
  VD -->|예약: 유효 예약 있으면 패널, 없으면 M-02| M2
  VD -->|수정 · 기록 수정 M-03| VD
  V -->|저장 12| VD
```

| 흐름 | 넘기는 값 | 유지되는 것 | 초기화되는 것 |
|---|---|---|---|
| 로그인 → 앱 | `from`(가드·401이 넘김) | — | 로그인 칸(새로 고침·로그아웃) |
| 홈 → 패널 | `reservation` 쿼리 | 보기·날짜·`mine` | — |
| 재점검 → M-02 | `vehicleId`, 도래·임박 `itemIds`(목적 기본값) | 필터·정렬·검색·선택·펼침·스크롤 | — |
| 빈 칸 → M-02 | `date`, `time` | — | — |
| M-02 ↔ M-01 | 검색어(→ 칸 추정), 저장 결과 `vehicleId` | M-02 입력값 전부 | M-01 입력(닫으면) |
| M-02 409 | `details.reservationId` → 패널 | M-02 입력(STARTER/09: 변경 화면에 채움 💡) | — |
| 패널 → S-08 | `vehicleId`, `reservationId` (18 성공 뒤에만) | — | — |
| S-08 → S-07 | `justSaved`(화면 상태, 저장 결과 표시) | — | S-08 입력 |
| 목록 → 고객 → 차량 → 뒤로 | — | `q`·`page`·스크롤 | — |
| 로그아웃 | — | — | 토큰·Me·모든 화면 상태·토스트 |

## 4. 컴포넌트 트리 (C03)

`[sh]` shared/ui · `[f:도메인]` features/도메인/components · `[p]` pages/Sxx 안 · `[app]` app/. 이슈 번호는 frontend 레포(STARTER 02 10장).

```
AppLayout [app] (#17)
├─ AppHeader [app]            03 me · 정비소·이름·역할 · 로그아웃(작성 중이면 이탈 확인)
├─ AppMenu [app]              ≥1024 왼쪽(펼침/접힘, 1440 미만 자동 접힘 +) · <1024 위쪽 탭 +
├─ <Outlet/>
└─ ToastHost [app] +          성공 2.5초(role=status) · 오류는 닫을 때까지(role=alert) — 9장 Q6

S01 LoginPage [p]
└─ LoginForm [f:auth]         칸별 미입력·보기/숨기기·Enter·로그인 중·실패 공통 문구·연결 실패·만료/로그아웃 안내 +

S02 HomePage [p]                                  조립: home + reservation + customer(VehiclePicker) + maintenance(items)
├─ SummaryCards [f:home]      04 (#28)
├─ RefreshIndicator [sh] +    저장 뒤 다시 불러오는 동안
├─ CalendarToolbar [f:home]   주/월 탭 · 내 담당만 · 기간 이동 · 오늘로 (P0-나머지 #30·#36)
├─ WeekCalendar [f:home]      15 · 08–20시 + 위/아래 띠 + 같은 시각 나눔 + 빈 칸 → M-02 (#36) +
├─ MonthGrid [f:home]         42 · 처리 필요 n (#30)
├─ DateListPanel [f:reservation]  15 · 그 날 목록 + 빈 날 등록 (#30)
│   └─ ReservationRow [f:reservation]   (= 오늘 목록 P0-핵심 #24, 같은 컴포넌트)
├─ ReservationPanel [f:reservation]  17 (#26)  (+ 행동 #31·#33)
│   ├─ ItemStatusList variant=summary [sh] (3-2 #18)
│   ├─ RecentVisits [f:reservation]
│   ├─ ReservationRevisions [f:reservation]  41 (+)
│   ├─ PanelActions [f:reservation]  상태별 주요 1개 + 허용 행동 (+)
│   └─ ConfirmDialog [sh] / StartDialog·CorrectDialog [f:reservation]  39·20·21·40 (+)
├─ PanelEmpty → EmptyState [sh] +
└─ ReservationFormModal (M-02) [f:reservation] (#25·#37)
    ├─ vehiclePicker slot ← VehiclePicker [f:customer]   (pages에서 끼움, = STARTER)
    ├─ TimeSlotPicker [f:reservation] +       30분 버튼 + 그 밖 목록, 같은 담당·같은 시각 비활성
    ├─ PurposeFields [f:reservation]          items(13)는 pages가 props로 (= STARTER Q3)
    ├─ AssigneeSelect [f:reservation] (#37)   36 · 재배정 규칙·당일 사유
    └─ CustomerVehicleFormModal (M-01) slot ← [f:customer] (pages에서 끼움)

S04 TargetsPage [p] (#27)                          조립: target + customer(연락처 09) + reservation(M-02)
├─ TargetToolbar [f:target] +   나누기 탭·건수 · 정렬 · 검색 (URL 쿼리)
├─ TargetList [f:target]
│   └─ TargetCard [f:target]  Δ 요약/펼침 (STARTER는 TargetRow)
│       └─ ItemStatusList variant=target [sh]
├─ ContactPanel [p] + 💡       선택 차량: 09 연락처(전체) · 복사 · 안내 항목 · 예약 (9장 Q5)
└─ ReservationFormModal [f:reservation]

S05 CustomerListPage [p] (#19)
├─ CustomerSearchBox [f:customer]   0.3초 · 지우기 · 초기화
├─ CustomerResultList [f:customer] → CustomerRow (고객명 → S-06 · 차량번호 칩 → S-07 분리 +)
├─ Pagination [p] +                 S-05만 → 두 번째 사용 때 shared로 (STARTER 3.2 원칙 5)
├─ EmptyState / ErrorNotice / Skeleton [sh]
└─ CustomerVehicleFormModal (M-01) [f:customer]
    ├─ DuplicateNotice [f:customer] +   같은 연락처·차량번호 → 차량 추가 / 이 차량 / 고객 수정
    ├─ CustomerFields [f:customer] +    M-01·고객 수정 공용
    └─ VehicleFields [f:customer] +     M-01·차량 추가·차량 수정 공용

S06 CustomerDetailPage [p] (#20 → #21)
├─ CustomerInfoCard [f:customer]   연락처 복사 + · 수정(#32)
├─ CustomerVehicleList [f:customer] → VehicleRow (도래 n·임박 n · 예약/예약 있음 +)
├─ AddVehicle [f:customer] (#21)   Δ 모달(v2.0) / 인라인(09 💡·STARTER) — 9장 Q4. 어느 쪽이든 VehicleFields 재사용
└─ CustomerEditModal [f:customer] (#32)   22

S07 VehicleDetailPage [p] (#22)                    조립: customer(헤더) + maintenance + reservation(M-02·패널 링크)
├─ VehicleCustomerHeader [f:customer]  Δ 요약 카드(상태 수·빈 연식/주행거리 안내·작은 그림)
├─ ItemStatusList variant=table [sh]   도래·임박 줄 강조, 마지막 기준 기록/다음 정비 구분
├─ VisitHistory [f:maintenance]        11 · 방문 묶음 · 기록 줄 · 수정됨 · [수정](권한 이유) (#34)
├─ VehicleEditModal [f:customer] (#32) 23
├─ RecordEditModal (M-03) [f:maintenance] (#34)  37
└─ RecordRevisionsModal [f:maintenance] (#34)    38

S08 VisitRecordPage [p] (#23 · #35 · #29)
├─ VisitVehicleCard [f:maintenance] +   차량·최근 주행거리·관련 예약(따로 저장 안내)
├─ VisitInfoForm [f:maintenance]        방문일·주행거리·(빈 차량) 연식
├─ VisitPreview [f:maintenance] (#35)   10 · 0.5초 · 마지막 요청만 · 로딩/실패/최신 → ItemStatusList variant=preview [sh]
├─ ItemRecordRows [f:maintenance]       구분별 조건부 칸 (외부·거절·결과 #29)
├─ MechanicSelect [f:maintenance] (#29) 36 (STARTER는 reservation에 MechanicSelect → 9장 Q8)
├─ RecordFooter [p] +                   기록 요약 · n건 저장 (아래 고정)
└─ LeaveDialog → ConfirmDialog [sh]     작성 중 이탈 (9장 Q3)
```

## 5. 공통 UI · 도메인 컴포넌트 구분 (C02 연결)

STARTER 07 3.2의 구분 기준 1~5를 그대로 쓴다. v2.0 때문에 바뀌거나 더해지는 것만:

| 컴포넌트 | 위치 | 이유 | 만드는 이슈 |
|---|---|---|---|
| `Modal` (+ 초점 가두기·Esc·초점 복귀·겹친 모달) | `shared/ui` | = 3-2. v2.0 `useDialogA11y` 동작을 Modal에 넣는다 | #18 |
| `ConfirmDialog` + | `shared/ui` | 취소·노쇼·방문 접수·정정·이탈 5곳에서 같은 틀(대상 표시·위험 버튼) | #18에 추가 제안 💡 |
| `FormField` · `EmptyState` · `ErrorNotice` · `ItemStatusList` | `shared/ui` | = 3-2 | #18 |
| `Toast` (성공·오류) + | `shared/ui` 모양 + `app/ToastHost` | 전 화면 공통. 오류는 자동으로 안 닫힘 | 3-2(모양)·3-1(자리) 💡 |
| `Skeleton` · `RefreshIndicator` + | `shared/ui` | 공통 상태 8종(COMPONENT_SPEC) | 3-2 💡 |
| `CustomerFields` · `VehicleFields` + | `features/customer` | customer 데이터 모양을 앎, 4곳 재사용 | #19(처음 만드는 이슈) |
| `TimeSlotPicker` · `AssigneeSelect` · `PanelActions` · `ReservationRevisions` | `features/reservation` | 예약 도메인 | #25·#33·#37 |
| `WeekCalendar` · `MonthGrid` · `CalendarToolbar` | `features/home` (= STARTER 08) | 홈 전용 | #30·#36 |
| `TargetCard` · `TargetToolbar` | `features/target` | Δ TargetRow → 요약/펼침 카드 | #27 |
| `ContactPanel` | `pages/S04` | target + customer(09) 조합 → pages | #27 💡(9장 Q5) |
| `VisitVehicleCard` · `VisitPreview` · `ItemRecordRows` · `VisitHistory` · `RecordEditModal` · `RecordRevisionsModal` | `features/maintenance` | 정비 도메인 | #23·#35·#29·#22·#34 |

Props·이벤트·상태는 COMPONENT_SPEC.md 「STEP 07 — Props·상태·파일」.

## 6. 상태 관리 (B09·B10, C04 연결)

새 라이브러리 없이 React 상태 + URL + 작은 공용 훅으로 한다. 전역에 두는 것은 **Me·토큰·토스트**뿐이다.

| 상태 | 소유 | 저장 위치 | 갱신 | 초기화 |
|---|---|---|---|---|
| 토큰 | `shared/lib/tokenStore` | localStorage (현재 구현, ❓ FU-3) | 로그인 01 | 로그아웃·401 |
| Me (이름·역할·정비소) | `app/AppLayout` (`features/auth/useMe`) | 메모리(Context) | 03 한 번 | 로그아웃·401 |
| 토스트 | `app/ToastHost` | 메모리 | 각 화면이 `toast.success/error` | 화면 이동해도 오류는 남음, 로그아웃 시 비움 |
| 서버 데이터 | 각 `pages/Sxx` | 메모리(그 화면) | 화면 진입·쿼리 변경 시 조회, 쓰기 성공 뒤 영향받는 조회만 다시(아래 표) | 화면 떠나면 버림 |
| URL 상태 | 라우터 | 주소 | 2장 표 | 메뉴 재진입 = 기본 쿼리 |
| 선택·펼침·스크롤 | 그 화면 | 화면 상태(+ 스크롤 복원) | — | 메뉴 재진입·로그아웃 |
| 모달·폼 입력 | 그 모달 | 화면 상태 | — | 닫기·저장 성공. 실패하면 유지 |
| 로딩·오류 | 그 조회/요청 | 화면 상태 | — | 다음 요청 |

**조회 훅(제안, `shared/lib/useRequest`):** `const { data, error, loading, refreshing, reload } = useRequest(() => api.x(id), [id])` — 처음엔 `loading`(Skeleton), `reload()` 때는 이전 데이터를 둔 채 `refreshing`. 늦게 온 이전 응답은 버린다(요청 번호 비교 — v2.0 미리보기와 같은 방식). 자동 재시도 없음. 💡 3-2 또는 3-1에서 결정(9장 Q6).

**쓰기 뒤 다시 부르는 조회(B10):**

| 쓰기 | 같은 화면에서 다시 부름 | 이동 | 다른 화면 (다음 진입 때 자동) |
|---|---|---|---|
| 16 예약 등록 · 19 변경 | 15(보던 기간) · 42(월) · 04(오늘이면) | 패널 `?reservation=` → 17 | S-04 14 · S-07 "예약 있음" |
| 18 방문 완료 | 17 · 15 · 04 | 성공 시만 S-08 | S-04 14 |
| 20 취소 · 21 노쇼 · 39 방문 접수 · 40 정정 | 17 · 15 · 42 · 04 · (41 열려 있으면) | — | S-04 14 |
| 409 (모든 쓰기) | 해당 상세(17·07·09·11)를 다시 불러 보여 줌 | 이동 없음 | — |
| 06 고객 등록 | — | S-06 (`customerId`) 또는 M-02로 차량 전달 | S-05 05 |
| 08 차량 추가 | 07 | — | — |
| 22 고객 수정 | 07 | — | 동의 해제 시 S-04 14·홈 04 |
| 23 차량 수정 | 09 · 10 | — | — |
| 12 방문 기록 | — | S-07 → 09·10·11 | S-04 14 · S-06 07 · 패널 17 · 홈 04 |
| 37 기록 수정 | 11 · 10 · 09 | — | 같은 |

예약 처리(18 등)와 정비 기록(12)은 **다른 요청**이다. 18 성공 뒤 12가 실패해도 18은 되돌리지 않고, 화면은 "방문 완료는 저장됨, 정비 기록만 실패"로 나눠 알린다(POL-95, v2.0 Visit-Record-SaveFailed).

## 7. 반응형 (C06)

| 폭 | 메뉴 | 패널 (예약·연락 준비) | 배치 | 담당 |
|---|---|---|---|---|
| ≥ 1440 | 왼쪽 216px 펼침 | 오른쪽 380px | 기본 | `AppMenu`(3-1), 각 페이지 CSS |
| 1280–1439 | 자동 접힘 76px(사용자가 펼치면 유지) 💡 | 380px | 기본 | 〃 |
| 1024–1279 | 접힘 | 300px | 캘린더 카드 글자 축소, 툴바 줄바꿈 | 〃 |
| < 1024 | 위쪽 탭 48px (09 💡) | 화면 전체 덮개(처음엔 닫힘) | 한 열, 목록 카드형 줄, 차량 그림 숨김, 버튼 44px | 〃 |

기준은 `--ck-bp-*` 토큰 하나로 둔다(COMPONENT_SPEC 토큰). 스마트폰 전용 배치는 범위 밖(03 NFR-04 PC·태블릿). v3 확인: 768px 이상 제품 화면 가로 넘침 0, 390px는 알려진 한계 — DESIGN_VERIFICATION 9C-7·D18.

## 8. 파일 구조 (실제 `src/` + STARTER 08 경로 위에 v2.0 추가분)

```
src/
├── app/            = App.jsx(routes 수집) · routes.js · AppLayout · AppHeader · AppMenu · paths.js · RequireAuth · UnauthorizedRedirect
│                   + ToastHost.jsx · NotFoundPage.jsx · (Q3) router 생성
├── shared/
│   ├── api/client.ts         = (오류 문구 DEFAULT_MESSAGES에 TIMEOUT 추가 여부 💡 Q9)
│   ├── ui/                   = Button · Layout · StatusBadge · Modal · FormField · EmptyState · ErrorNotice · ItemStatusList
│   │                         + ConfirmDialog · Toast · Skeleton · RefreshIndicator (각 *.css)
│   └── lib/                  = tokenStore · submitGuard  + useRequest(💡) · format(날짜·km·마스킹 표시 없음: 서버 값 그대로)
├── features/
│   ├── auth/                 = LoginForm · useMe
│   ├── home/                 = SummaryCards · WeekCalendar  + CalendarToolbar · MonthGrid
│   ├── reservation/          = ReservationRow · ReservationList · ReservationPanel · ReservationFormModal · PurposeFields · DateNavigator · MechanicSelect · ReassignModal
│   │                         + TimeSlotPicker · PanelActions · StartDialog · CorrectDialog · ReservationRevisions · DateListPanel
│   ├── customer/             = CustomerSearchBox · CustomerRow · CustomerResultList · CustomerVehicleFormModal · VehiclePicker · CustomerInfoCard · CustomerVehicleList · VehicleRow · AddVehicleInline(Q4) · VehicleCustomerHeader
│   │                         + CustomerFields · VehicleFields · DuplicateNotice · CustomerEditModal · VehicleEditModal
│   ├── maintenance/          = VisitHistory · VisitInfoForm · ItemRecordRows · VisitPreview
│   │                         + VisitVehicleCard · RecordEditModal · RecordRevisionsModal
│   └── target/               = TargetList  Δ TargetRow → TargetCard  + TargetToolbar
│       (각 feature: api.ts · types.ts(08 글자 그대로) · components/ · mocks/)
└── pages/  S01 · S02 · S04 · S05 · S06 · S07 · S08  (각 Page.jsx + route.jsx, ContactPanel·Pagination·RecordFooter는 그 page 안)
```

프로토타입 → 저장소 옮기기 주의:
- 프로토타입 Mock 응답 필드 이름은 화면 시연용이라 **08과 다르다**(예: `plate`↔`plateNumber`, `todayContactCustomerCount`↔`todayContactCount`, `year`↔`modelYear`, `mileage`↔`latestMileage`, `id`↔`reservationId`). 구현은 `features/*/types.ts`를 08 그대로 두고 화면이 맞춘다(PAGE_API_MAPPING 4장).
- 프로토타입의 `?fixture=`는 디자인 상황 재현용이다. 저장소 Mock(`features/*/mocks/`, `VITE_USE_MOCK`)과 섞지 않는다.
- 프로토타입 `index.css`는 원본 Figma CSS 위에 덧붙인 것이다. 저장소에는 컴포넌트별 `*.css` + 토큰으로 옮긴다(Tailwind 없음).

## 9. 소유권 (C07) · 결정 필요

소유자는 **STARTER 01·08**(D-14 담당 확정)을 그대로 적는다. 실제 Assignee·CODEOWNERS는 바꾸지 않았다.

STEP 09 확인(2026-11-24, GitHub 공개 API로 열린 이슈 조회): frontend 열린 이슈 22개의 Assignee가 위 표와 일치한다 — `godgeul-glitch`(이재성) #16·#17·#24~#26·#28·#30·#31·#33·#36·#37, `eunjung01230`(최은정) #18~#20·#22·#23·#29·#32·#34·#35, `dyk816`(김동윤) #21·#27. **#14 `shared/api/client.ts` 버그(시간 초과 없음)만 담당 없음**(Q9와 연결). CODEOWNERS는 여전히 모두 주석.

| 경로 | 추천 소유 (STARTER) | 관련 이슈 | 선행 · 머지 순서 | v2.0 추가분 소유 제안 |
|---|---|---|---|---|
| `app/*` (라우트·Layout·머리·메뉴) | 이재성 | #16 → #17 | #17이 routes 수집 방식을 만든 뒤 화면 이슈는 App.jsx 수정 안 함 | ToastHost·NotFound·반응형 메뉴 = #17 |
| `shared/ui/*` (공통 5종) | 최은정 | #18 | 화면 이슈보다 먼저 | ConfirmDialog·Toast·Skeleton·RefreshIndicator = #18에 추가 💡 |
| `shared/api/client.ts` · `shared/lib` | 프론트기반(FU-2 #14) | — | L2·L3 리뷰 | useRequest = 💡 담당 미정 |
| `features/auth` · `pages/S01` | 이재성 | #16 | 첫 | 로그인 상태(STEP 06) = #16 |
| `features/customer` · `pages/S05·S06` | 최은정 (6-1 김동윤) | #19 → #20 → #21 · #32 | 6-1은 6 머지 뒤 | Customer/VehicleFields = #19가 먼저 |
| `features/maintenance` · `pages/S07·S08` | 최은정 | #22 → #23 → #35 · #29 · #34 | 백엔드 #23·#42 뒤 Mock→실연동 | VisitVehicleCard·RecordFooter = #23, M-03 = #34 |
| `features/reservation` · `pages/S02` | 이재성 | #24 → #25 → #26 → (#31 → #33 → #37) · #30 · #36 | STARTER 3장 순서 | TimeSlotPicker = #25, PanelActions = #26/#31/#33 |
| `features/home` | 이재성 | #28 · #30 · #36 | — | MonthGrid = #30 |
| `features/target` · `pages/S04` | 김동윤 | #27 | #25(M-02) 뒤 | TargetCard·ContactPanel = #27 |
| 디자인 토큰 (`--ck-*`) | 미정 | — | theme.css 수정 금지(STARTER) | 9장 Q7 |

### 결정 필요 (팀 · PM)

| # | 내용 | 선택지 · 추천 | 막는 것 |
|---|---|---|---|
| Q1 | URL 확정 (STARTER 1.1 + v2.0 쿼리 `view`·`mine`·`filter`·`sort`·`vehicle`) | STARTER 안 + v2.0 쿼리. S-08은 `/visits/new?vehicleId=` 유지 | #17 paths |
| Q2 | 예약 상세 패널을 S-02에만 둘지 | = STARTER: S-02에만, 다른 화면은 `/?reservation=`로 이동 (v2.0 프로토타입도 같음) | #26 |
| Q3 | 라우터를 `createBrowserRouter`로 바꿀지 (이탈 확인 `useBlocker`, `ScrollRestoration`) | 바꾸기 추천. 안 바꾸면 S-08 이탈 확인은 앱 안 링크만 직접 막고 새로 고침은 `beforeunload` | #17 · #23 |
| Q4 | S-06 차량 추가: 모달(v2.0·명령서) vs 인라인(09 💡·STARTER `AddVehicleInline`) | 모달(M-01과 칸 공유, 좁은 화면 일관). 파일 경계(#21 김동윤)는 그대로, 이름만 `AddVehicleModal` | #21 |
| Q5 | S-04 연락 준비 패널(전체 연락처는 09 API 추가 호출) — 09 S-04 P0 행에 없는 요소 | 명령서 STEP 04 요구로 디자인함. 유지하려면 09에 추가(docs PR), 아니면 숨김. 문자 기능(P1)과 섞지 않음 | #27 |
| Q6 | 토스트·조회 훅을 공용으로 둘지와 담당 | `shared/ui/Toast` + `app/ToastHost` + `shared/lib/useRequest` | #17 · #18 |
| Q7 | v2.0 토큰(`--ck-*`)을 어디에 둘지 (theme.css 수정 금지 규칙과 충돌) | `shared/ui/tokens.css` 새 파일(3-2) + theme.css는 그대로 | #18 |
| Q8 | `MechanicSelect` 위치: STARTER는 reservation(#37), S-08(#29)도 씀 → feature 사이 import 금지 | 같은 모양이면 `shared/ui/StaffSelect`(데이터는 props) | #29 · #37 |
| Q9 | 시간 초과(`TIMEOUT`)를 client.ts 오류 코드로 둘지 | 08 0.3에 없음 → 네트워크 오류와 같은 `NETWORK_ERROR` 문구로 합치는 안(추천) | FU-2 |
| Q10 | Q14(API 07 조립 위치, docs#96) | 백엔드 결정. 화면 계약(07 응답)은 D-63 B01로 확정이라 프론트 영향 없음 | backend #43 |


## 10. 설계 근거 (STEP 09 보완 — 팀 설명용)

| 질문 | 근거 |
|---|---|
| 왜 이 URL 구조인가 | STARTER 07 1.1 표를 그대로 따른다(화면 ID와 `pages` 1:1, CLAUDE.md). 새로 고침·뒤로 가기·다른 화면에서 링크로 열어야 하는 것(예약 패널·홈 날짜/보기·목록 검색·재점검 필터)만 쿼리로 올리고, 작성 중 데이터가 있는 모달은 URL에 두지 않는다(2장 표). |
| 왜 중첩 라우팅인가 | 인증 확인(RequireAuth)과 머리·메뉴(AppLayout)를 한 번만 렌더링하고 `<Outlet/>`만 바꾸기 위해서다. 화면 이슈가 `App.jsx`를 고치지 않게 해 #17 이후 병렬 개발 충돌을 줄인다(STARTER 08). 중첩은 이 두 단계만 쓴다. 화면 안 패널·모달은 라우트로 만들지 않는다. |
| 왜 Layout을 분리했나 | 로그인(S-01)은 메뉴가 없고, 업무 화면은 같은 머리·메뉴·토스트·반응형 메뉴를 쓴다. 서비스 관리자 화면(S-10)은 P1이고 P0에는 관리자 UI가 없다(04 F-AUTH-02 "P0에는 관리 화면이 없다") → **관리자 Layout은 만들지 않는다.** P1에서 S-10과 함께 정한다. |
| 왜 이 컴포넌트를 공통화했나 | 세 개 이상 화면에서 같은 모양·같은 규칙(접근성·오류 문구·요청 중 비활성)을 써야 하는 것만 `shared/ui`(#18 범위 + 9장 Q6 제안). 데이터를 직접 부르지 않고 props만 받는다. |
| 왜 도메인 안에 두었나 | 업무 규칙(예약 상태별 행동, 기록 수정 권한, 409 처리)을 가진 컴포넌트는 그 feature 안에 둔다. 모양이 비슷해도 규칙이 다르면 합치지 않는다(예: 예약 상태 칩 ≠ 정비 주기 StatusBadge). feature끼리 import 금지(ESLint 경계)라 여러 feature가 쓰면 pages에서 조합한다. |
| 왜 그 계층에서 API를 부르나 | `fetch`는 `shared/api/client.ts` 한 곳, 엔드포인트는 `features/*/api.ts`, 호출 시점은 페이지(또는 페이지가 쓰는 feature 훅)가 정한다(CLAUDE.md). 같은 데이터를 여러 UI가 따로 부르지 않게 페이지가 한 번 받아 props로 내린다. |
| 확장 영향은 어떻게 줄이나 | 새 화면 = 새 `pages/Sxx` + `route.jsx`(메뉴 선언) → 다른 화면 파일 수정 없음. 쓰기 뒤 갱신은 6장 표에 적힌 조회만 다시 부른다(전체 재호출 금지). 정비 주기 상태는 서버 값만 표시. |

## 11. v3.0 — P0·P1 통합 구조 (STEP 09-C, 2026-11-25)

기준: chagok-docs develop `42c75df`(A 기준 `ac0705b` 이후 바뀐 것은 D-69 백엔드 규칙·AI 기록뿐이라 화면 정책 영향 없음) · chagok-frontend develop `bf2ab08`(변경 없음) · v3.0 프로토타입 `.step09-work/b-source`(STEP 09-B 결과).
범위: P0-핵심·P0-나머지·P1. P2·Non-goal은 넣지 않았다. 범위 동결 결정은 docs#103에서 기록 대기 중이다(11-6 Q11).

### 11-1. 주요 페이지 9개와 Route

URL은 1장·2장(Q1)의 **제안**을 그대로 쓴다. P1 두 화면의 URL은 09에 없으므로 **제안·결정 필요**(Q12)로 둔다. "Route"는 독립 URL을 갖는 화면 단위이고, 모달·패널·확인창·상태는 Route가 아니다(2장 규칙 유지).

| ID | 페이지 | URL | 동적 부분 | Layout · 가드 | 페이지 컴포넌트 (설계 경로) | v3 프로토타입 소스 |
|---|---|---|---|---|---|---|
| S-01 | 로그인 (+P1 비밀번호 변경·약관 동의 단계) | `/login` | — (단계는 03 응답으로 정함, URL 아님) | Layout 밖. P1 단계 가드: 단계가 남았으면 어느 주소로 와도 S-01의 그 단계로(09 S-01) | `pages/S01` + `features/auth` | `pages/S01-Login/LoginPage.tsx` · `features/auth/LoginSteps.tsx` |
| S-02 | 홈 (요약·캘린더·패널·P1 고객 집계) | `/` | `?reservation=` `?date=` `?view=` `?mine=` | AppLayout · RequireAuth | `pages/S02` | `pages/S02-Home/HomePage.tsx` (검토용 `?stage=core` = `HomeCorePage.tsx`) |
| S-04 | 재점검 대상 (+P1 연락 준비: 문자 초안·연락 결과) | `/targets` | `?filter` `?sort` `?q` `?vehicle` | AppLayout | `pages/S04` + `features/target` | `pages/S04-Reinspection/ReinspectionPage.tsx` · `ContactPanel.tsx` |
| S-05 | 고객·차량 목록 (+P1 비활성 포함·지표) | `/customers` | `?q` `?page` (+P1 비활성 포함 토글: URL 여부 결정 필요 Q13) | AppLayout | `pages/S05` | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` |
| S-06 | 고객 상세 (+P1 지표·비활성화·삭제) | `/customers/:customerId` | `:customerId` | AppLayout | `pages/S06` | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` |
| S-07 | 차량 상세 (+P1 약식 도면·비활성화) | `/vehicles/:vehicleId` | `:vehicleId` | AppLayout | `pages/S07` | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` |
| S-08 | 방문·정비 기록 | `/visits/new` | `?vehicleId` `?reservationId` | AppLayout · 이탈 확인(Q3) | `pages/S08` | `pages/S08-VisitRecord/VisitRecordPage.tsx` |
| S-09 | 정비소 설정 (P1, 탭 4) | 제안 `/settings` (+ `?tab=staff\|items\|alert\|retention` 💡) | 탭 | AppLayout · **사장만**(정비사는 메뉴 없음, 직접 접근 시 404 — 프로토타입 동작) | `pages/S09` (+ `features/staff`·`features/item` 💡) | `pages/S09-Settings/*` (SettingsPage + 탭 4) |
| S-10 | 서비스 관리자 정비소 관리 (P1) | 제안 `/admin` | — | **AdminLayout**(정비소 메뉴 없음) · 관리자만 | `pages/S10` + `app/AdminLayout` 💡 | `pages/S10-Admin/AdminPage.tsx` |
| — | 404 | `*` | — | AppLayout 안 404 페이지(2장 Δ) | `app/NotFoundPage` | `app/NotFoundPage.tsx` |

집계: 주요 페이지 9 · Route 10(페이지 9 + 404) · 동적 경로 2(`:customerId`·`:vehicleId`) · Layout 2(AppLayout·AdminLayout) · 중첩은 2단계(RequireAuth → Layout → Outlet)만 쓴다.

```
<RouterProvider>
  <UnauthorizedRedirect/>                          401 → /login (from)
  /login                → pages/S01               (P1 단계 가드 포함)
  <RequireAuth>
    <LoginStepGuard/>   + P1: passwordChangeRequired·termsAgreementRequired 남으면 /login 단계로
    <AppLayout> <Outlet/>                          정비소 역할(OWNER·MECHANIC)
      / · /targets · /customers · /customers/:customerId · /vehicles/:vehicleId · /visits/new
      /settings         + P1 pages/S09            <RequireRole OWNER> 💡
      *                 NotFound
    <AdminLayout> <Outlet/>                        + P1 ADMIN 전용 💡
      /admin            pages/S10
```
`RequireRole`·`LoginStepGuard`·`AdminLayout`은 P1 구현 때 생기는 **제안**이다. 서버가 최종 판단하고(06 권한), 화면은 메뉴·버튼만 숨긴다.

### 11-2. 프로토타입 ↔ 설계 경로 대응 (v3 소스 = 시연용, 그대로 복사하지 않음)

| v3 프로토타입(`b-source/src`) | 설계 경로(8장) | 차이 |
|---|---|---|
| `app/App.tsx` (화면 스택 `useState<Route[]>`·`PageKey` 7) | `app/App.jsx`·`routes.js`·`paths.js` (react-router) | 프로토타입은 공유용 단일 HTML·해시 상황 재현 때문에 라우터가 없다. 화면 전환 키 7개 = 위 표 S-02~S-09의 URL. S-01·S-10은 로그인·역할 조건으로 갈린다 |
| `app/AppMenu.tsx` (Sidebar·TopBar·NAV_ITEMS) | `app/AppMenu`·`AppHeader` | 같음. 설정 메뉴는 사장만(`isOwner`) |
| `app/LeaveDialog.tsx` | S-08 이탈 확인(Q3) | 같음 |
| `shared/ui/*` (Icon·ChaLogo·StatusBadge·PageHeader·Feedback·EmptyState·FormField·Modal) | `shared/ui/*` | 이름 대응은 COMPONENT_SPEC 「STEP 09-C 대응표」 |
| `shared/lib/{env,a11y,form,date}.ts` | `shared/lib/*` | `env`(`?view`·`?stage`)는 프로토타입 전용이라 옮기지 않음 |
| `features/{auth,home,reservation,customer,maintenance,account}` | `features/*` | `account`(ResetPasswordModal)는 S-09·S-10 공용 → P1 구현 때 `shared/ui` 또는 `features/staff`로 💡 |
| `pages/S01~S10` | `pages/S01~S10` | 같은 단위 |
| `mock/db.ts`·`mock/p1.ts` (`?fixture=`) | `features/*/mocks/` + `VITE_USE_MOCK` | **섞지 않는다**(8장 주의). 필드 이름은 08을 따른다(PAGE_API_MAPPING 4장·5장) |
| `index.css` (Tailwind + `--ck-*`) | 컴포넌트별 `*.css` + 토큰(Q7) | 저장소에는 Tailwind 없음 |

### 11-3. 페이지별 컴포넌트·상태·이벤트 (v3 소스에서 확인)

| 페이지 | 공통(shared) | 기능·전용 | 모달·패널 | Variant (props·쿼리) | State | 주요 Props·상태 | 이벤트 → 이동 |
|---|---|---|---|---|---|---|---|
| S-01 | ChaLogo·Icon·PasswordField | LoginSteps(PasswordStep·TermsStep) | — | 역할(OWNER·MECHANIC·ADMIN)·로그인 단계·만료/로그아웃 안내 | 칸 오류·401·403 `ACCOUNT_INACTIVE`·네트워크·로그인 중 | `notice` · 입력값 | 로그인 → `from` 또는 S-02 / 단계 남음 → 단계 / ADMIN → S-10 |
| S-02 | PageHeader·StatusChip·Feedback | Calendar·MonthGrid·CustomerStatsCard(P1) | DetailPanel(+PanelDialog 접수·취소·노쇼·정정)·DateListPanel·PanelEmpty·M-02 | 주/월·내 담당·패널 열림·좁은 화면 덮는 패널·`?stage=core` | 로딩·오류·예약 0건·409·새로 고침 표시 | `HomeView`(App 보관)·`panelProps` | 슬롯·등록 → M-02 / 방문 완료 → S-08 / 차량 → S-07 / 요약 → S-04 |
| S-04 | PageHeader·CycleBadge·LoadError·ConfirmDialog | ReinspectionView | ContactPanel(+ContactP1 문자 초안·연락 결과)·M-02 | 필터 4·정렬·검색·고른 차량 | 로딩·오류·0대·연락함(30일 꼬리표)·연락 거부 확인 | `TargetStore`(뒤로 와도 유지) | 예약 → M-02 / 기존 예약 → S-02 패널 / 이미 정비함 → S-08 |
| S-05 | PageHeader·ListSkeleton·LoadError·MascotFigure | (목록 줄·쪽 이동) | M-01 | 검색·쪽·비활성 포함(P1) | 로딩·오류·고객 0명·검색 0건 | `ListStore` | 줄 → S-06 / 차량 → S-07 / 신규 → M-01 |
| S-06 | PageHeader·LoadError·ConfirmDialog | MetricsStrip(P1)·CustomerLifecycle(P1) | AddVehicleModal·CustomerEditModal·M-02 | 등록 직후 강조·차량 0대·비활성(P1) | 로딩·오류·409(`HAS_ACTIVE_RESERVATION`·`HAS_HISTORY`) | `customerId`·`initialModal`·`highlight` | 차량 → S-07 / 예약 → M-02 또는 패널 |
| S-07 | PageHeader·CycleBadge·VehicleHistoryEmpty | VehicleDiagram(P1)·VehicleLifecycle(P1) | VehicleEditModal·M-03(RecordEditModal)·RecordRevisionsModal | 저장 직후(`justSaved`)·비활성(P1) | 404·이력 0건·M-03 409 | `vehicleId`·`justSaved` | 방문 기록 → S-08 / 고객 → S-06 / 예약 |
| S-08 | PageHeader·CycleBadge | (항목 행·미리보기) | LeaveDialog | 예약에서 옴/차량에서 옴·첫 방문 | 칸 오류·미리보기 로딩/실패·저장 중·저장 실패·낮은 주행거리 경고 | `vehicleId`·`reservationId`·`guard` | 저장 → S-07(`justSaved`) |
| S-09 (P1) | PageHeader·FormModal·ConfirmDialog·TextField·PasswordField·SubmitButton | StaffTab·ItemsTab·AlertTab·RetentionTab | StaffAddModal·ResetPasswordModal | 탭 4 | 아이디 중복 409(칸 오류)·정비사 비활성화 409·보관 대상 0명·알림 권한 상태 | `initialTab` | 탭 전환(같은 페이지) |
| S-10 (P1) | PageHeader·ChaLogo·FormModal·ConfirmDialog·SuccessToast | — | ShopCreateModal·ResetPasswordModal | — | 개설 칸 오류·아이디 중복 409·정지 확인 | 정비소 목록 | 개설·정지/재개·사장 비밀번호 재발급 |

API 연결(번호·호출 시점·실패 처리)은 PAGE_API_MAPPING 1·2장(P0)과 **5장(P1, STEP 09-C)**에 있다.

### 11-4. 상태 관리 — P1 추가분 (6장 규칙 유지)

| 상태 | 위치 | 유지·초기화 |
|---|---|---|
| 로그인 단계(비밀번호 변경·약관) | 03 응답(`passwordChangeRequired`·`termsAgreementRequired`) | 브라우저 저장소에 두지 않음. 새로 고침하면 03으로 다시 판단 |
| S-04 연락 준비 선택·문자 초안 | S-04 화면 상태(`?vehicle`) | 초안은 서버 응답(28)을 표시만 함. 복사·문자 앱 열기는 **브라우저 안에서만**(API 없음) |
| 비활성 포함 토글(S-05) | 화면 상태 | URL 반영 여부는 Q13 |
| S-09 탭 | 화면 상태(`?tab` 💡) | — |
| 아침 알림 사용·시간 | 04 F-NTF-01: API 없음, **브라우저 저장**(확정). 화면에 「이 브라우저에만 저장」 안내 | 6장 "토큰 외 브라우저 저장소 금지"의 **명시 예외**(04가 우선). 고객·예약 데이터는 계속 저장 금지 |

### 11-5. 프로토타입에서 확인한 것 / 확인 못 한 것

- 확인: 9개 페이지가 하나의 프로토타입에서 이어진다. 역할별 메뉴·버튼(설정은 사장만, 비활성화·삭제는 사장만, 관리자는 별도 Layout)도 동작한다. 572개 상태에서 B 정리 전후 차이 0(STEP09_B_REPORT 5장)이고, A의 P0 31/31·P1 26/26 시나리오도 다시 쓴다.
- STEP 09-C에서 고친 것: 정책 불일치 N1~N5(비활성 고객·차량 차단, 비활성 차량 꼬리표, 비활성 정비사 담당 제외, 보관 목록 기준일, 관리자 목록 열) — DESIGN_VERIFICATION 9C-2.
- 확인 못 함: 실제 URL·라우터(프로토타입에 없음), 문자 앱 열기의 기기별 동작, 실제 브라우저 알림, 실제 API·DB·인증.

### 11-6. 결정 필요 (P1 추가)

전체 결정 목록(정책·API 포함 D1~D18)은 DESIGN_VERIFICATION 9C-5. 아래 Q11~Q17은 그중 구조에 관한 것이다.

| # | 내용 | 추천 | 막는 것 |
|---|---|---|---|
| Q11 | 범위 동결(P0-핵심·P0-나머지·P1, P2·Non-goal 제외) 기록 — docs#103 OPEN | 팀 합의 기록 후 이 문서의 "범위"를 확정으로 바꿈 | P1 이슈 생성 |
| Q12 | S-09·S-10 URL (`/settings`·`/admin` 제안) 과 `?tab` 사용 | 제안대로 | P1 paths |
| Q13 | S-05 「비활성 포함」을 URL 쿼리로 둘지 | 목록 검색·쪽과 같이 URL(`?inactive=1`) 💡 | P1 S-05 |
| Q14 | (결정 아님, 기록) F-NTF-01은 04에서 브라우저 저장으로 확정 → 6장 규칙에 예외로 적었다(11-4). 저장 키 이름·형식만 구현 때 정함 | — | P1 S-09 |
| Q15 | 관리자 로그인: S-01 한 폼에서 계정으로 갈림(프로토타입) vs 별도 진입(09 💡) — A 보고서 6장 | 한 폼(API 01이 role로 응답) | S-01·S-10 |
| Q16 | 비활성 정비사 임시 비밀번호 재발급 처리 — A 보고서 6장 | 불허 + 기존 오류 코드 | S-09 |
| Q17 | P1 화면 담당·이슈 — frontend에 P1 이슈 없음(2026-11-25 확인, 열린 이슈 23개 모두 P0·기반) | 범위 동결(Q11) 뒤 백로그에서 생성 | P1 개발 착수 |
