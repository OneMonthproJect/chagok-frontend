# SCREEN_SPEC — ChaGok Design v2.0 → v3.0 (P0·P1, STEP 09-C 갱신)

> 상태: **STEP 08 최종 + STEP 09 구조 재분류(8장)**. 1~3장 = 원본 v1.0 인벤토리·문제·Mock 대조(STEP 00). 4~7장 = v2.0 최종 인벤토리·흐름·권한·상태(STEP 08). URL·컴포넌트 트리·API는 FRONTEND_STRUCTURE·PAGE_API_MAPPING에 있고 여기서 반복하지 않는다.
> 화면 ID·단계의 원본은 chagok-docs `09_screens`(화면)·`00_PRD`(단계)·`04_features`(기능 ID)이다. 이 문서는 그것을 복제하지 않고 **디자인 파일과의 대응**만 적는다.

## 1. 원본 v1.0 화면 인벤토리 (25개, 수정하지 않음)

기준: Claude Design 캔버스 "ChaGok — Original Design Baseline v1.0", 공유 ZIP `ChaGok-Original-Design-v1.0.zip`(screen-01~25, prototype.html).
구분: 페이지 / 모달 / 패널 / 상태 / 가이드. 단계: 09·00 기준으로 해당 화면이 표현한 기능의 단계.

| # | 파일 (canvas / zip) | 화면 ID | 이름 | 구분 | 단계 (문서 기준) | 주요 기능 · API(08) | 진입 → 이동 | 반복 컴포넌트 |
|---|---|---|---|---|---|---|---|---|
| 01 | Main / screen-01-login | S-01 | 로그인 | 페이지 | P0-핵심 | F-AUTH-01 · 01 | 시작 → 03 홈 | ChaLogo, 마스코트 |
| 02 | Login-Error / screen-02 | S-01 | 로그인 — 입력 오류 | 상태 | P0-핵심 | 〃 | 01 | 〃 |
| 03 | Home-Week / screen-03 | S-02 + 패널 | 홈 · 주 캘린더 · 예약 상세(오세훈) | 페이지+패널 | 캘린더·담당·접수·취소·노쇼 P0-나머지 / 요약·패널·변경 P0-핵심 / 고객 집계 **P1** | F-HOME-01, F-RSV-03·05 · 04, 15, 17, 42 | 로그인·메뉴 → 06·07(확인), 08(모달), 13(P0), 14(보기), 19(차량), 20(방문 완료) | Sidebar, Header, SummaryTile, Calendar, ReservationCard, DetailPanel, StatusChip, CycleBadge, HistoryBand |
| 04 | Home-Week-Reservation2 / 04 | S-02 + 패널 | 예약 상세(최지은, 이력 없음) | 상태 | 〃 | 17 | 03의 카드 | 〃 |
| 05 | Home-Week-DetailClosed / 05 | S-02 | 상세 패널 닫힘 | 상태 | 〃 | — | 03 닫기 | 〃 |
| 06 | Home-Confirm-Cancel / 06 | S-02 | 취소 확인 대화상자 | 모달 | P0-나머지 | F-RSV-07 · 20 | 03 [취소] → 03 | ConfirmDialog |
| 07 | Home-Confirm-NoShow / 07 | S-02 | 노쇼 확인 대화상자 | 모달 | P0-나머지 | F-RSV-08 · 21 | 03 [노쇼] → 03 | ConfirmDialog |
| 08 | Modal-Reservation / 08 | M-02 | 예약 등록 | 모달 | P0-핵심 (담당 선택 P0-나머지) | F-RSV-01 · 05, 13, 16, 36 | 홈·재점검·패널[변경] → 09(토스트) | Modal, SearchInput, TimePill, PurposeChip, Select |
| 09 | Home-Toast-Reservation / 09 | S-02 | 예약 등록 토스트 | 상태 | P0-핵심 | — | 08 [등록] | SuccessToast |
| 10 | Home-Month / 10 | S-02 | 월 캘린더 · 날짜 목록 패널 | 페이지+패널 | P0-나머지 | F-RSV-05 · 15, 42 | 03 [월] → 11, 12 | MonthGrid, DateListPanel |
| 11 | Home-Month-EmptyDay / 11 | S-02 | 예약 없는 날 | 상태 | P0-나머지 | — | 10 날짜 | ReservationEmptyState(마스코트) |
| 12 | Home-Month-ReservationDetail / 12 | S-02 + 패널 | 예약 상세(← 목록) | 패널 | P0-핵심/나머지 | 17 | 10 목록 줄 | DetailPanel |
| 13 | Home-P0 / 13 | S-02 | 홈 — 오늘 예약 목록 (제목 "홈 — P0-핵심") | 페이지 | P0-핵심 | F-RSV-02 · 04, 15, 17 | 홈 아이콘을 홈에서 한 번 더 | ReservationRow, DetailPanel(p0) |
| 14 | Reinspection / 14 | S-04 | 재점검 대상 + 문자 초안 패널 | 페이지+패널 | 목록 P0-핵심 / 꼬리표 P0-나머지 / 문자 초안·결과 기록·연락함 **P1** | F-TGT-01, F-CON-01·02 · 14, 28, 29 | 메뉴·보기 → 08, 19 | TargetCard(FollowupCard), CycleBadge, FilterChip, MessagePanel |
| 15 | Reinspection-Empty / 15 | S-04 | 재점검 — 검색 결과 없음 | 상태 | 〃 | — | 14 검색 | MascotEmptyState(clipboard) |
| 16 | Customer-List / 16 | S-05 | 고객·차량 목록 | 페이지 | 목록 P0-핵심 / 마스킹 P0-나머지 / 최근 방문·점검 예정 **P1** | F-CUS-01·07·09 · 05 | 메뉴 → 18, 19 | Table, ConsentChip, PlateChip, CycleBadge |
| 17 | Customer-List-Empty / 17 | S-05 | 검색 결과 없음 | 상태 | P0-핵심 | — | 16 검색 | EmptyState(아이콘) |
| 18 | Customer-Detail / 18 | S-06 | 고객 상세 | 페이지 | 정보·차량 P0-핵심 / 지표 **P1** | F-CUS-04·09 · 07 | 16 → 19 | ProfileCard, VehicleCard, CountBadge |
| 19 | Vehicle-Detail / 19 | S-07 | 차량 상세 | 페이지 | 정보·주기·이력 P0-핵심 / 수정됨 P0-나머지 / 도면(콜아웃) **P1** | F-CUS-05·08 · 09, 10, 11 | 16·18·패널 → 20 | VehicleHero, MaintenanceTable, ServiceRoute, HistoryList |
| 20 | Visit-Record / 20 | S-08 | 방문·정비 기록 | 페이지 | 기본 P0-핵심 / 거절·외부·점검 결과·담당 P0-나머지 | F-VIS-01, F-MNT-01~03 · 09, 10, 12, 13, 36 | 19·패널 → 19 | RecordField, PreviewCard, RecordSegments, MechanicSelect, RecordFooter |
| 21 | Visit-Record-Filled / 21 | S-08 | 입력됨(교체·점검·외부) | 상태 | 〃 | — | 20 | 〃 |
| 22 | Vehicle-Toast-Saved / 22 | S-07 | 저장 토스트 | 상태 | P0-핵심 | — | 21 [저장] | SuccessToast |
| 23 | Settings-Mascot-Usage / 23 | (없음) | Mascot usage (디자인 가이드) | 가이드 | 화면 명세에 없음 | — | 메뉴 [설정] → 25, 24 | MascotFigure, EmptyState 3종 |
| 24 | Settings-Mascot-Toast / 24 | (없음) | 가이드 · 토스트 | 가이드 | 〃 | — | 23 | SuccessToast |
| 25 | Settings-Logo / 25 | (없음) | Logo (디자인 가이드) | 가이드 | 〃 | — | 23 | ChaLogo 4크기·모노·파비콘 |

## 2. 원본에서 확인한 문제 (화면별, STEP 01~06 입력값)

표기: **정책** = 확정 문서와 불일치(근거 위치), **UX** = 사용성, **누락** = 없는 상태·화면.

### 공통 (전 화면)
- 정책: 사이드바 [설정]이 디자인 가이드(23~25)로 연결됨. S-09 설정은 P1·사장 전용(09 S-09) → A07.
- 정책: 화면 제목에 개발 용어 "P0-핵심" 노출(13) → A02.
- 정책: Mock 데이터가 07 ERD 7.2 시드와 다름(대상 차량, 기록 km·날짜, 차량 수, 방문 횟수) → A01. 상세는 §3.
- 정책: 원본은 주기 상태를 프론트에서 계산(App.tsx `previewStatuses`). 04 F-CYC-01·CONVENTIONS 7장: 계산은 서버, 프론트 재계산 금지 → A05.
- UX: 사이드바 아이콘만(라벨·툴팁 없음) → B01. 보조 글자 8~11px, 회색 글자(#A5A8AE·#9A9EA5 등) 대비 4.5:1 미만 다수 → B02.
- UX: 예약 상태 색 구분 약함(방문 완료·취소·노쇼 모두 회색 계열) → B03.
- UX: 로그아웃 동작이 화면마다 다름(14·16은 새로 고침, 나머지는 로그인 화면) → STEP 02.
- 누락: 로딩·조회 실패·401 만료("다시 로그인해 주세요", D-68)·403·404·500·네트워크 상태 화면 없음 → A06.

### S-01 로그인 (01·02)
- 누락: 요청 중(버튼 비활성·진행 표시, POL-120), 세션 만료 안내(D-68), 서버 연결 실패.
- 일치: 실패 문구 "아이디 또는 비밀번호를 확인해 주세요."(09 S-01).

### S-02 홈·캘린더·패널 (03~13)
- 정책: "고객 집계" 카드는 P1(F-STAT-01)인데 P0 화면에 노출 → A02.
- 정책: 주 보기 08:00 전·20:00 이후 예약을 카드로 보여 주는 영역이 없음(라벨만, 09 S-02·D-63 B08).
- 정책: [방문 접수]가 알림창만 띄움 — 진행중 상태, 연식·주행거리 빈 차량 입력(D-58) 없음 → A04.
- 정책: 정정(사유 입력)·이력 보기(41)·재배정 화면 없음 → A04.
- UX: 확인 대화상자에 차량번호·일시가 없음, 캘린더 카드가 어두운 배경 위로 올라옴(z-index) → B05·A04.
- UX: 패널 하단 버튼 5개가 같은 무게(주요 행동 2개 강조) → B05.
- 정책: 빈 날 문구 "예약이 없습니다." ↔ 09 5장 "오늘 예약이 없습니다."
- 정책: 13의 진입 방법이 없음(홈 아이콘 재클릭) — P0-핵심 오늘 목록과 P0-나머지 캘린더는 같은 홈의 단계별 모습이지 다른 메뉴가 아님(D-54) → A02.

### M-02 예약 등록 (08·09)
- 누락: 신규 고객(M-01) 진입, 변경 모드(제목·차량 고정·기존값·version), 409 `RESERVATION_ACTIVE_EXISTS`(기존 예약 패널 열기)·`MECHANIC_SLOT_CONFLICT` 상태, 입력 오류 → A04.
- 확인 필요: 시각 선택지 09:00~17:30 ↔ 캘린더 표시 08:00~20:00(허용 시간 정책 대조, STEP 03).
- UX: 담당 범례 8px.

### S-04 재점검 (14·15)
- 정책: 문자 초안·결과 기록·"연락함" 꼬리표는 P1(F-CON-01·02) → A02.
- 정책: 필터 "예약 있음 제외" — 09 S-04는 예약 있는 차량도 목록에 두고 버튼 대신 예약 일시를 보임.
- 정책: 대상 차량이 시드와 다름(정우성=전부 미확인이라 대상 아님, 오세훈·이영희(예약 있음) 누락) → A01.
- 정책: 카드 요약 "도래 2 · 임박 1"인데 항목은 2개만 → A01.
- 정책: 문자 초안 문구가 고른 차량과 무관하게 고정, 빈 결과에서도 이전 고객 초안이 남음 → A01(P1이므로 숨김 여부와 함께).
- UX: 카드가 길어 한 화면에 2대만 보임 → B07.

### S-05 고객·차량 (16·17)
- 정책: "최근 방문·점검 예정" 칸은 P1(F-CUS-09) → A02.
- 누락: [신규 등록](M-01), "등록된 고객이 없습니다." 빈 상태, 검색어를 M-01에 채우기 → A03·A06.
- 정책: "차량 10대" ↔ 시드 11대(오세훈 2대) → A01.
- UX: 줄 전체가 버튼이고 안의 차량번호도 링크(중첩) → B06. 페이지네이션 없음 → B06.

### S-06 고객 상세 (18)
- 정책: 지표(최근 방문·방문 횟수·점검 예정)는 P1 → A02.
- 누락: [차량 추가](P0-핵심 F-CUS-03), [수정](P0-나머지), 차량 없음 상태 → A03.
- 정책: 도래·임박 수가 재점검 카드와 다름(1·1 ↔ 2·1) → A01.

### S-07 차량 상세 (19·22)
- 정책: 브레이크패드 기준 기록이 "점검"(04 F-CYC-01: 기준은 교체·외부만) → A05.
- 정책: 도면 콜아웃은 P1(F-CUS-08) → A02. 일러스트 유지(명령서)와 단계 구분의 결정 필요.
- 누락: [예약](M-02), [수정](P0-나머지), 정비 이력 [수정] → M-03, 수정 이력 패널, 고객명 → S-06 이동 → A03·A04·STEP 05.
- 정책: 저장 후 이 화면의 값이 바뀌지 않음 → B10.

### S-08 방문·정비 기록 (20·21)
- 정책: 미리보기를 프론트에서 계산, km로 "임박"을 만듦(04: km는 도래만), 61,800km인데 "52,000km + 10,000km 초과" 문구(실제 기준 62,000km, 거리 기준 미도래 — 엔진오일 도래는 날짜 기준) → A05.
- 정책: 방문일 기본값이 오늘(11/24)이 아님(09 S-08: 기본 오늘).
- 누락: 차량 영역(차량번호·고객명), 연식·주행거리 빈 차량 안내(D-58), 미리보기 로딩·실패, 저장 실패, 이탈 확인 → B08·A06.
- UX: 가로 8px 넘침(1448px).

### 가이드 (23~25)
- 정책: 제품 메뉴 안에 있는 디자인 가이드 → 디자인 시스템 영역으로 분리 → A07.

## 3. 원본 Mock 데이터 ↔ 07 ERD 7.2 시드 (A01 입력값)

| 항목 | 원본 | 시드(07 7.2) |
|---|---|---|
| 재점검 대상 | 김민수·박철수·정우성·한가람·윤하늘 (5대) | 김민수·이영희(예약 있음)·박철수·한가람·윤하늘·오세훈 (6대, 장미래는 미동의 제외, 정우성은 전부 미확인) |
| 김민수 12가0001 | 엔진오일 교체 2026.05.10 52,000km, 브레이크 점검 기준, 58,200km | 엔진오일 교체 D-6M-7d 40,000km, 엔진오일 점검 D-2M(기준 아님), 최근 주행거리 💡40,000 |
| 오세훈 차량 | 55차0010 1대 | 55차0010 + 66카0011(전부 미확인) 2대 |
| 이영희 | 대상 목록 없음 | 엔진오일 도래, 예약 있음(D+2일 10:00) |
| 고객/차량 수 | 10명 / 10대 | 10명 / 11대 |

시드는 "오늘" 기준 상대 날짜(D-6M 등)이다. v2.0 Mock은 기준일 2026-11-24로 환산해 한 벌만 쓴다(STEP 01).


## 4. v2.0 최종 아트보드 인벤토리 (126개 = 제품 화면 120 + 디자인 가이드 6)

기준: 캔버스 "ChaGok — Design v2.0"(https://claude.ai/artifact/18wuf6YYckFReBnSD1HDZe), 내보내기 `ChaGok-Design-v2.0-export/screens/<아트보드>.png`·`artboards-html/<아트보드>.html`.
v1.0 칸: `v1-nn` = v1.0 screen-nn을 고친 것(원본 보존), 신규 = v2.0 추가. 구현 단위·분류·축·공통 컴포넌트·시나리오 칸의 뜻은 8장(STEP 09 구조 재분류).

| 집계 | 변경 | 신규 | 합계 |
|---|---|---|---|
| 제품 화면 | 22 | 98 | 120 |
| 디자인 가이드 | 3 (Guide-*) | 3 (DS-*) | 6 |
| 합계 | 25 | 101 | 126 |

v1.0 → v2.0 이름 변경: Modal-Reservation → **Modal-Create**, Home-P0 → **Home-Core-TodayList**(제품 화면에 개발 용어 금지), Settings-* → **Guide-***(설정 메뉴와 분리, A07).

| # | 아트보드 | 제목(캔버스) | 크기 | v1.0 | 구현 단위 | 분류 | 축·값 | 공통 컴포넌트 | 시나리오 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Guide-Mascot-Usage | 디자인 가이드 · Mascot usage | 1440×1072 | v1-23 | 디자인 가이드 | Guide | — | — | — |
| 2 | Guide-Mascot-Toast | 디자인 가이드 · 토스트 | 1440×900 | v1-24 | 디자인 가이드 | Guide | — | — | — |
| 3 | Guide-Logo | 디자인 가이드 · Logo | 1440×900 | v1-25 | 디자인 가이드 | Guide | — | — | — |
| 4 | DS-Foundations | 디자인 시스템 · Foundations | 1440×1816 | 신규 | 디자인 가이드 | Guide | — | — | — |
| 5 | DS-Controls | 디자인 시스템 · Controls | 1440×1522 | 신규 | 디자인 가이드 | Guide | — | — | — |
| 6 | DS-Feedback-Overlay | 디자인 시스템 · Feedback·Overlay | 1440×1477 | 신규 | 디자인 가이드 | Guide | — | — | — |
| 7 | Main | S-01 로그인 | 1440×900 | v1-01 | S-01 | Base | — | LoginForm | H |
| 8 | Login-Error | S-01 로그인 — 입력 오류 | 1440×900 | v1-02 | S-01 | State | 입력 오류(400·빈칸) | FormField | H |
| 9 | Home-Week | S-02 주 · 오세훈 어제 15:00 (처리 필요 → 방문 완료 우선) | 1440×900 | v1-03 | S-02 | Base | view=week · 패널 status=처리 필요 | WeekCalendar·ReservationPanel·PanelActions | C |
| 10 | Home-Week-Reservation2 | S-02 주 · 최지은 오늘 10:00 (예약 → 방문 접수 우선) | 1440×900 | v1-04 | 예약 패널 | Base | status=예약(오늘) | PanelActions | C |
| 11 | Home-Week-Reservation3 | S-02 주 · 서민준 (기타·메모) | 1440×900 | 신규 | 예약 패널 | Scenario | 데이터 예시(기타 목적·메모) | ReservationPanel | — |
| 12 | Home-Week-Reservation4 | S-02 주 · 이영희 11/26 (변경 가능) | 1440×900 | 신규 | 예약 패널 | Variant | status=예약(미래, 변경 가능) | PanelActions | E |
| 13 | Home-Week-DetailClosed | S-02 상세 패널 닫힘 | 1440×900 | v1-05 | S-02 | Variant | 패널 닫힘(?reservation 없음) | — | — |
| 14 | Home-Week-Busy | [디자인 상황] 같은 시각 2건 · 08:00 전·20:00 후 띠 | 1440×900 | 신규 | S-02 | Scenario | 같은 시각 2건·근무 시간 밖 | WeekCalendar | — |
| 15 | Home-Week-SidebarCollapsed | 공통 · 사이드바 접힘(툴팁) | 1440×900 | 신규 | AppLayout | Variant | 메뉴 접힘 | AppMenu | — |
| 16 | Home-Dialog-Start | 방문 접수 확인 | 1440×900 | 신규 | 확인 대화상자 | Base | kind=start | ConfirmDialog | C |
| 17 | Home-Dialog-Start-MissingInfo | 방문 접수 — 연식·주행거리 필수 (D-58) | 1440×900 | 신규 | 확인 대화상자 | State | start · 연식·주행거리 필수 | ConfirmDialog+VehicleFields | C |
| 18 | Home-Panel-InProgress | 패널 · 진행중 (방문 완료 우선) | 1440×900 | 신규 | 예약 패널 | Variant | status=진행중 | PanelActions | C |
| 19 | Home-Confirm-Cancel | 취소 확인 (대상 표시) | 1440×900 | v1-06 | 확인 대화상자 | Variant | kind=cancel(danger) | ConfirmDialog | — |
| 20 | Home-Confirm-NoShow | 노쇼 확인 (대상 표시) | 1440×900 | v1-07 | 확인 대화상자 | Variant | kind=noShow(danger) | ConfirmDialog | — |
| 21 | Home-Panel-NoShow | 패널 · 노쇼 처리됨 (정정만) | 1440×900 | 신규 | 예약 패널 | Variant | status=노쇼(정정만) | PanelActions | — |
| 22 | Home-Dialog-Correct | 지난 예약 정정 (상태·메모·사유) | 1440×900 | 신규 | 정정 모달 | Base | 지난 예약 정정 폼 | Modal+FormField | — |
| 23 | Home-Panel-Revisions | 패널 · 정정 후 이력 | 1440×900 | 신규 | 예약 패널 | State | 이력 펼침(41) | ReservationPanel | — |
| 24 | Home-Panel-Conflict409 | 패널 · 409 동시 수정 → 재조회 | 1440×900 | 신규 | 예약 패널 | State | 409 → 재조회 | ErrorNotice(warn) | F |
| 25 | Home-Month | S-02 월 · 오늘 목록 | 1440×900 | v1-10 | S-02 | Variant | view=month | MonthGrid | — |
| 26 | Home-Month-EmptyDay | S-02 월 · 예약 없는 날 → 이 날짜로 등록 | 1440×900 | v1-11 | S-02 | State | 빈 날 → 등록 | EmptyState | — |
| 27 | Home-Month-ReservationDetail | S-02 월 · 예약 상세(← 목록) | 1440×900 | v1-12 | 예약 패널 | Variant | 월 목록에서 진입(← 목록) | ReservationPanel | — |
| 28 | Home-Loading | S-02 로딩 | 1440×900 | 신규 | S-02 | State | 로딩 | Skeleton | — |
| 29 | Home-Error | S-02 조회 실패 | 1440×900 | 신규 | S-02 | State | 조회 실패 | ErrorNotice | H |
| 30 | Home-Core-TodayList | [P0-핵심 단계] S-02 홈 · 오늘 예약 목록 | 1440×900 | v1-13 | S-02 | Variant | 단계=P0-핵심(오늘 목록) | ReservationRow | — |
| 31 | Modal-Create | M-02 등록 · 빈 폼 | 1440×900 | v1-08 | M-02 | Base | mode=create | ReservationFormModal | A |
| 32 | Modal-Create-FromTarget | M-02 등록 · 재점검에서 (차량·목적 채움) | 1440×900 | 신규 | M-02 | Variant | defaults=차량·목적(S-04) | ReservationFormModal | A |
| 33 | Modal-Create-FromSlot | M-02 등록 · 빈 칸에서 (날짜·시각 채움) | 1440×900 | 신규 | M-02 | Variant | defaults=날짜·시각(빈 칸) | ReservationFormModal | — |
| 34 | Home-Toast-Reservation | S-02 등록 성공 → 새 예약 패널 | 1440×900 | v1-09 | S-02 | Result | 등록 성공 토스트 + 새 패널 | Toast(success) | A |
| 35 | Modal-Create-ActiveExists | M-02 등록 · 유효 예약 있는 차량 안내 | 1440×900 | 신규 | M-02 | State | 유효 예약 있음 안내(사전) | ErrorNotice(info) | — |
| 36 | Modal-Create-409-ActiveExists | M-02 409 RESERVATION_ACTIVE_EXISTS | 1440×900 | 신규 | M-02 | State | 409 ACTIVE_EXISTS | ErrorNotice(warn) | F |
| 37 | Modal-Create-SlotTaken | M-02 같은 담당·같은 시각 비활성 | 1440×900 | 신규 | M-02 | State | 시각 비활성(사전) | TimeSlotPicker | F |
| 38 | Modal-Create-409-MechanicSlot | M-02 409 MECHANIC_SLOT_CONFLICT | 1440×900 | 신규 | M-02 | State | 409 MECHANIC_SLOT | ErrorNotice(warn) | F |
| 39 | Modal-Create-Submitting | M-02 저장 중 (중복 요청 방지) | 1440×900 | 신규 | M-02 | State | 요청 중 | Button loading | — |
| 40 | Modal-Edit | M-02 변경 · 기존값 | 1440×900 | 신규 | M-02 | Variant | mode=edit | ReservationFormModal | E |
| 41 | Modal-Edit-409-Concurrent | M-02 변경 · 409 동시 수정 | 1440×900 | 신규 | M-02 | State | 409 동시 수정 | ErrorNotice(warn) | F |
| 42 | Modal-Edit-ReassignToday | M-02 변경 · 당일 재배정 사유 | 1440×900 | 신규 | M-02 | State | edit · 당일 재배정 사유 | FormField | E |
| 43 | Reinspection | S-04 재점검 대상 · 요약 카드 (선택 없음) | 1440×900 | v1-14 | S-04 | Base | 선택 없음 | TargetCard | A |
| 44 | Reinspection-Selected | S-04 선택 → 연락 준비 · 근거 펼침 | 1440×900 | 신규 | 연락 준비 패널 | Base | 차량 선택·근거 펼침 | TargetCard·ContactPanel | A |
| 45 | Reinspection-Filter-NoReservation | S-04 필터 예약 없음 · 다음 정비일 순 | 1440×900 | 신규 | S-04 | Variant | filter·sort | FilterTabs | — |
| 46 | Reinspection-Empty | S-04 검색·필터 결과 없음 | 1440×900 | v1-15 | S-04 | State | 검색·필터 결과 없음 | EmptyState | — |
| 47 | Customer-List | S-05 고객·차량 목록 (최근 등록순) | 1440×1001 | v1-16 | S-05 | Base | 최근 등록순 | — | D |
| 48 | Customer-List-Search | S-05 검색 · 차량 2대 고객 | 1440×900 | 신규 | S-05 | Variant | q 있음 | SearchInput | B |
| 49 | Customer-List-Empty | S-05 검색 결과 없음 → 검색어로 신규 등록 | 1440×900 | v1-17 | S-05 | State | 검색 결과 없음 → 신규 등록 | EmptyState | B |
| 50 | Customer-List-NoCustomers | [디자인 상황] S-05 등록된 고객 없음 | 1440×900 | 신규 | S-05 | State | 등록 0명 | EmptyState | — |
| 51 | Customer-List-Paged | [디자인 상황] S-05 48명 · 쪽 나누기 20 · 긴 이름 | 1440×1702 | 신규 | S-05 | Scenario | 48명·쪽 나누기·긴 이름 | Pagination | — |
| 52 | Customer-List-Loading | S-05 불러오는 중 | 1440×900 | 신규 | S-05 | State | 로딩 | Skeleton | — |
| 53 | Customer-List-Error | S-05 조회 실패 | 1440×900 | 신규 | S-05 | State | 조회 실패 | ErrorNotice | — |
| 54 | Modal-Register | M-01 신규 고객·차량 등록 | 1440×900 | 신규 | M-01 | Base | context=list | CustomerVehicleFormModal | B |
| 55 | Modal-Register-FromSearch | M-01 검색어 채움 | 1440×900 | 신규 | M-01 | Variant | initialQuery | CustomerVehicleFormModal | B |
| 56 | Modal-Register-Duplicate | M-01 같은 연락처 고객 안내 | 1440×900 | 신규 | M-01 | State | 같은 연락처 안내 | FormField(warn) | — |
| 57 | Modal-Register-Errors | M-01 입력 오류 (형식·범위·필수) | 1440×900 | 신규 | M-01 | State | 칸 오류 | FormField(error) | H |
| 58 | Modal-Register-Submitting | M-01 저장 중 | 1440×900 | 신규 | M-01 | State | 요청 중 | Button loading | — |
| 59 | Modal-Register-SaveFailed | [디자인 상황] M-01 저장 실패 · 입력 유지 | 1440×900 | 신규 | M-01 | State | 저장 실패·입력 유지 | SaveFailNotice | H |
| 60 | Customer-Detail-Registered | S-06 등록 성공 → 새 고객 | 1440×900 | 신규 | S-06 | Result | 등록 성공 → 새 고객 | Toast(success) | B |
| 61 | Modal-Create-Register | M-02 안에서 M-01 열기 | 1440×900 | 신규 | M-01 | Variant | context=reservation(M-02 위 stacked) | CustomerVehicleFormModal | B |
| 62 | Modal-Create-Registered | M-02로 돌아와 새 차량 채움 | 1440×900 | 신규 | M-02 | Result | 새 차량 채움 | ReservationFormModal | B |
| 63 | Customer-Detail | S-06 고객 상세(김민수) | 1440×900 | v1-18 | S-06 | Base | 차량 1대 | — | D |
| 64 | Customer-Detail-MultiVehicle | S-06 고객 상세(오세훈, 차량 2대) | 1440×900 | 신규 | S-06 | Scenario | 차량 2대 | — | — |
| 65 | Modal-AddVehicle | 차량 추가 (고객 고정) | 1440×900 | 신규 | 차량 추가 모달 | Base | 고객 고정 | FormModal+VehicleFields | D |
| 66 | Modal-AddVehicle-Duplicate | 차량 추가 · 같은 차량번호 경고 | 1440×900 | 신규 | 차량 추가 모달 | State | 같은 차량번호 경고 | FormField(warn) | — |
| 67 | Customer-Detail-VehicleAdded | S-06 차량 추가 성공 · 목록 갱신 | 1440×900 | 신규 | S-06 | Result | 차량 추가 성공·목록 갱신 | Toast(success) | D |
| 68 | Modal-EditCustomer | 고객 수정 (API 22) · 동의 해제 안내 | 1440×900 | 신규 | 고객 수정 모달 | Base | API 22 | FormModal+CustomerFields | — |
| 69 | Modal-EditCustomer-409 | [디자인 상황] 고객 수정 409 → 최신 값 | 1440×900 | 신규 | 고객 수정 모달 | State | 409 → 최신 값 | ErrorNotice(warn) | F |
| 70 | Customer-Detail-Loading | S-06 불러오는 중 | 1440×900 | 신규 | S-06 | State | 로딩 | Skeleton | — |
| 71 | Customer-Detail-Error | S-06 조회 실패 | 1440×900 | 신규 | S-06 | State | 조회 실패 | ErrorNotice | — |
| 72 | Vehicle-Detail | S-07 차량 상세(12가0001) | 1440×900 | v1-19 | S-07 | Base | 기본 | ItemStatusList·VisitHistory | C |
| 73 | Vehicle-Detail-78ra0004 | S-07 차량 상세(78라0004 · 예약 있음) | 1440×900 | 신규 | S-07 | Scenario | 예약 있음 차량 | ItemStatusList | — |
| 74 | Vehicle-Detail-MissingInfo | S-07 66카0011 · 연식·주행거리 없음 · 이력 없음 | 1440×900 | 신규 | S-07 | State | 연식·주행거리·이력 없음 | EmptyState | — |
| 75 | Modal-EditVehicle | 차량 수정 (API 23) | 1440×900 | 신규 | 차량 수정 모달 | Base | API 23 | FormModal+VehicleFields | — |
| 76 | Modal-EditVehicle-Errors | 차량 수정 · 비울 수 없음 오류 | 1440×900 | 신규 | 차량 수정 모달 | State | 칸 오류 | FormField(error) | — |
| 77 | Visit-Record | S-08 예약에서 진입 (78라0004 · 담당 기본값) | 1440×1527 | v1-20 | S-08 | Base | 예약에서 진입 | ItemRecordRows·VisitPreview | C |
| 78 | Visit-Record-Filled | S-08 교체·점검(주의)·거절·외부 · 55,000km 미리보기 | 1440×1981 | v1-21 | S-08 | Variant | 구분 4종 입력 + 미리보기 | ItemRecordRows | C |
| 79 | Visit-Record-PreviewLoading | [디자인 상황] S-08 미리보기 불러오는 중 | 1440×1484 | 신규 | S-08 | State | 미리보기 로딩 | VisitPreview | — |
| 80 | Visit-Record-PreviewError | [디자인 상황] S-08 미리보기 실패 | 1440×1401 | 신규 | S-08 | State | 미리보기 실패 | VisitPreview | — |
| 81 | Visit-Record-LowerMileage | S-08 최근보다 작은 주행거리 | 1440×1650 | 신규 | S-08 | State | 작은 주행거리 안내 | FormField(warn) | — |
| 82 | Visit-Record-FirstVisit | S-08 최초 방문 · 연식·주행거리 없음 | 1440×1616 | 신규 | S-08 | Variant | 최초 방문 | VehicleFields | B |
| 83 | Visit-Record-FirstVisit-Required | S-08 최초 방문 · 필수 오류 (D-58) | 1440×1827 | 신규 | S-08 | State | 최초 방문 필수 오류 | FormField(error) | B |
| 84 | Visit-Record-Errors | S-08 칸 오류 (외부 정비일 없음) | 1440×1943 | 신규 | S-08 | State | 칸 오류 | FormField(error) | H |
| 85 | Visit-Record-Submitting | S-08 저장 중 | 1440×1649 | 신규 | S-08 | State | 요청 중 | Button loading | — |
| 86 | Visit-Record-SaveFailed | [디자인 상황] S-08 저장 실패 · 예약 처리와 구분 | 1440×1759 | 신규 | S-08 | State | 저장 실패·입력 유지 | SaveFailNotice | H |
| 87 | Visit-Record-LeaveConfirm | S-08 작성 중 이탈 확인 | 1440×900 | 신규 | 확인 대화상자 | Variant | kind=leave | ConfirmDialog | — |
| 88 | Vehicle-Toast-Saved | S-07 저장 후 · 방금 저장한 결과 | 1440×900 | v1-22 | S-07 | Result | 방금 저장 강조 + 토스트 | Toast(success) | C |
| 89 | Modal-EditRecord | M-03 정비 기록 수정 | 1440×900 | 신규 | M-03 | Base | 정비 기록 수정 | FormModal | G |
| 90 | Modal-EditRecord-409 | [디자인 상황] M-03 409 → 최신 값 | 1440×900 | 신규 | M-03 | State | 409 → 최신 값 | ErrorNotice(warn) | G |
| 91 | Vehicle-Detail-RecordEdited | S-07 수정 후 · 수정됨 · 다음 정비일 바뀜 | 1440×900 | 신규 | S-07 | Result | 수정됨 꼬리표·다음 정비일 갱신 | VisitHistory | G |
| 92 | Modal-RecordRevisions | 수정 이력 (API 38) | 1440×900 | 신규 | 수정 이력 모달 | Base | API 38 | Modal | G |
| 93 | Vehicle-Detail-MechanicView | [디자인 상황] 정비사 로그인 · 수정 불가 이유 | 1440×900 | 신규 | S-07 | Variant | role=정비사(수정 불가 이유) | VisitHistory | — |
| 94 | Login-Failed | S-01 로그인 실패(공통 문구) · 비밀번호 보기 | 1440×900 | 신규 | S-01 | State | 실패 401 공통 문구 | ErrorNotice | H |
| 95 | Login-Submitting | S-01 로그인 중 | 1440×900 | 신규 | S-01 | State | 요청 중 | Button loading | H |
| 96 | Login-NetworkError | [디자인 상황] S-01 서버 연결 실패 | 1440×900 | 신규 | S-01 | State | 네트워크 | ErrorNotice | H |
| 97 | Login-SessionExpired | [디자인 상황] 401 만료 → 로그인 (다시 로그인하면 원래 화면) | 1440×900 | 신규 | S-01 | Variant | notice=expired | LoginForm | H |
| 98 | Login-LoggedOut | S-01 로그아웃 후 | 1440×900 | 신규 | S-01 | Variant | notice=logout | LoginForm | H |
| 99 | Home-Week-NoReservations | [디자인 상황] S-02 예약 0건 · 패널 비움 | 1440×900 | 신규 | S-02 | State | 예약 0건·패널 비움 | EmptyState | — |
| 100 | Home-ErrorToast-Server | [디자인 상황] 500 오류 토스트 (자동으로 안 닫힘) | 1440×900 | 신규 | 공통 오류 토스트 | State | code=500 | ErrorToast | H |
| 101 | Home-ErrorToast-Network | [디자인 상황] 네트워크 오류 토스트 | 1440×900 | 신규 | 공통 오류 토스트 | State | code=NETWORK | ErrorToast | H |
| 102 | Home-Dialog-Correct-Mechanic | [디자인 상황] 정비사 · 상태 정정 불가(권한) | 1440×900 | 신규 | 정정 모달 | Variant | role=정비사(메모만) | Modal+FormField | — |
| 103 | Reinspection-NoTargets | [디자인 상황] S-04 대상 없음 | 1440×900 | 신규 | S-04 | State | 대상 0 | EmptyState | — |
| 104 | Reinspection-Timeout | [디자인 상황] S-04 시간 초과 | 1440×900 | 신규 | S-04 | State | 시간 초과 | ErrorNotice | — |
| 105 | Customer-List-NetworkError | [디자인 상황] S-05 서버 연결 실패 | 1440×900 | 신규 | S-05 | State | 네트워크 | ErrorNotice | — |
| 106 | Vehicle-NotFound | [디자인 상황] 404 찾을 수 없음 | 1440×900 | 신규 | 공통 404 | State | 404(데이터 없음) | ErrorNotice/NotFound | — |
| 107 | A11y-Modal-KeyboardFocus | 접근성 · 모달 키보드 초점(Tab 갇힘·Esc) | 1440×900 | 신규 | Modal 공통 | A11y | 초점 가두기·Esc | Modal | — |
| 108 | Modal-Create-SaveFailed | [디자인 상황] M-02 저장 실패(500) · 입력 유지 · 다시 시도 | 1440×900 | 신규 | M-02 | State | 저장 실패·입력 유지 | SaveFailNotice | H |
| 109 | Home-Refreshing | [디자인 상황] 저장 뒤 다시 불러오는 중(Refreshing) | 1440×900 | 신규 | S-02 | State | 저장 뒤 다시 불러오는 중 | RefreshIndicator | — |
| 110 | Customer-Detail-NoVehicles | [디자인 상황] S-06 차량 없음 | 1440×900 | 신규 | S-06 | State | 차량 0 | EmptyState | — |
| 111 | Home-ErrorToast-Forbidden | [디자인 상황] 서버 403 권한 없음 토스트 | 1440×900 | 신규 | 공통 오류 토스트 | State | code=403 | ErrorToast | — |
| 112 | RWD-1920-Home | 1920×1080 홈 | 1920×1198 | 신규 | (해당 화면) | Responsive | vw=1920 | AppLayout·반응형 | — |
| 113 | RWD-1366-Home | 1366×768 홈 · 사이드바 자동 접힘 | 1366×924 | 신규 | (해당 화면) | Responsive | vw=1366 | AppLayout·반응형 | — |
| 114 | RWD-1366-Visit-Record | 1366×768 방문·정비 기록 | 1366×1649 | 신규 | (해당 화면) | Responsive | vw=1366 | AppLayout·반응형 | — |
| 115 | RWD-1024-Home-Panel | 1024×768 홈 · 오른쪽 패널 300 | 1024×924 | 신규 | (해당 화면) | Responsive | vw=1024 | AppLayout·반응형 | — |
| 116 | RWD-1024-Reinspection | 1024×768 재점검 · 연락 준비 | 1024×768 | 신규 | (해당 화면) | Responsive | vw=1024 | AppLayout·반응형 | — |
| 117 | RWD-1024-Customer-List | 1024×768 고객 목록 | 1024×1001 | 신규 | (해당 화면) | Responsive | vw=1024 | AppLayout·반응형 | — |
| 118 | RWD-768-Login | 768 로그인 | 768×1024 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 119 | RWD-768-Home | 768×1024 홈 · 위쪽 탭 | 768×1129 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 120 | RWD-768-Panel-Overlay | 768 예약 상세 = 화면 덮개 | 768×1024 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 121 | RWD-768-Reinspection | 768 재점검 · 한 줄 배치 | 768×1129 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 122 | RWD-768-Contact-Overlay | 768 연락 준비 = 화면 덮개 | 768×1024 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 123 | RWD-768-Customer-List | 768 고객 목록 · 카드형 줄 | 768×1541 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 124 | RWD-768-Vehicle-Detail | 768 차량 상세 · 그림 숨김 | 768×1129 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 125 | RWD-768-Visit-Record | 768 방문·정비 기록 · 44px 버튼 | 768×2284 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |
| 126 | RWD-768-Modal-Create | 768 예약 모달 · 전체 폭 | 768×1024 | 신규 | (해당 화면) | Responsive | vw=768 | AppLayout·반응형 | — |

## 5. 화면별 요약 — 흐름 · 권한 · 정상/예외 상태

권한: 모든 제품 화면은 로그인 필요(S-01 제외). 사장(owner)·정비사(mechanic) 차이는 아래 "권한" 칸만. 서버가 최종 판단하고 화면은 버튼 노출만 바꾼다.

| 화면 | 들어오는 곳 → 나가는 곳 | 권한 차이 | 정상 상태 아트보드 | 예외·경계 상태 아트보드 |
|---|---|---|---|---|
| S-01 로그인 | 시작·만료·로그아웃 → 원래 화면 또는 홈 | 공개 | Main | Login-Error, -Failed, -Submitting, -NetworkError, -SessionExpired, -LoggedOut |
| S-02 홈 | 로그인·메뉴 → 패널·M-02·S-04·S-07·S-08 | 없음 | Home-Week, -Reservation2~4, -Month, -Month-ReservationDetail, Home-Core-TodayList | -Busy, -NoReservations, -Month-EmptyDay, Home-Loading, Home-Error, Home-Refreshing, Home-ErrorToast-Server/Network/Forbidden, -SidebarCollapsed, -DetailClosed |
| 예약 상세 패널 | 캘린더·목록·S-04·S-07 → M-02·S-07·S-08 | 정정의 상태 변경은 사장만(정비사는 메모만) | Home-Panel-InProgress, -NoShow, -Revisions | Home-Panel-Conflict409, Home-Dialog-Start(-MissingInfo), Home-Confirm-Cancel/NoShow, Home-Dialog-Correct(-Mechanic) |
| M-02 예약 등록·변경 | 홈 빈 칸·재점검·차량 상세·패널[변경] → 패널(토스트) | 담당 선택 노출 동일 | Modal-Create, -FromTarget, -FromSlot, Modal-Edit | -SlotTaken, -ActiveExists, -409-*, -Submitting, -SaveFailed, Modal-Edit-409-Concurrent, -ReassignToday, Home-Toast-Reservation |
| M-01 고객·차량 등록 | S-05·M-02 → S-06 또는 M-02(차량 채움) | 없음 | Modal-Register, -FromSearch, Modal-Create-Register(-ed) | -Duplicate, -Errors, -Submitting, -SaveFailed |
| S-04 재점검 | 메뉴·홈 요약 → M-02·연락 준비 패널·S-07 | 없음 | Reinspection, -Selected, -Filter-NoReservation | -Empty, -NoTargets, -Timeout |
| S-05 고객·차량 목록 | 메뉴 → S-06·S-07·M-01 | 없음 | Customer-List, -Search, -Paged | -Empty, -NoCustomers, -Loading, -Error, -NetworkError |
| S-06 고객 상세 | S-05·M-01 → S-07·차량 추가·고객 수정 | 수정은 화면 동일 | Customer-Detail, -MultiVehicle, -Registered, -VehicleAdded | -NoVehicles, -Loading, -Error, Modal-AddVehicle(-Duplicate), Modal-EditCustomer(-409) |
| S-07 차량 상세 | S-05·S-06·패널 → S-08·M-02·M-03 | 기록 수정(M-03)은 작성자·사장 규칙, 정비사 보기 | Vehicle-Detail, -78ra0004, -RecordEdited, Vehicle-Toast-Saved | -MissingInfo, -MechanicView, Vehicle-NotFound, Modal-EditVehicle(-Errors), Modal-EditRecord(-409), Modal-RecordRevisions |
| S-08 방문·정비 기록 | 패널[방문 완료]·S-07 → S-07(방금 저장) | 담당 기본값 = 로그인 사용자 | Visit-Record, -Filled, -FirstVisit | -FirstVisit-Required, -LowerMileage, -PreviewLoading, -PreviewError, -Errors, -Submitting, -SaveFailed, -LeaveConfirm |
| 공통 폭·접근성 | 같은 화면의 폭별 배치 | — | RWD-1920·1366·1024·768-* | A11y-Modal-KeyboardFocus |

## 6. v2.0에서 만들지 않은 화면

S-03(폐지), S-09 설정·S-10(P1), P1 요소(고객 집계·문자 초안·연락 결과·연락함·고객 지표·차량 도면 콜아웃)는 v1.0에만 남아 있다(DESIGN_PROGRESS Q1·Q3).

> **v3.0 (STEP 09-A):** S-09·S-10과 위 P1 요소는 v3.0에서 디자인했다(9-4). S-03(폐지)과 403 전체 페이지는 v3.0에서도 만들지 않는다. 403 전체 페이지 없음(사장 전용 P0 페이지 없음, 오류 토스트로 처리).

## 7. 디자인 상황(fixture) 아트보드

시드 데이터만으로는 나타나지 않는 상태(409·500·네트워크·시간 초과·빈 목록·같은 시각 다건·연식 없는 차량 등)는 프로토타입 `?fixture=` 로 만든 **디자인 상황**이다. 실제 API 응답이 아니며, 목록은 `prototype-src/README.md`.

## 8. 구조 재분류 (STEP 09 보완 — 디자인·정책·흐름 변경 없음)

목적: 아트보드 126개를 "화면 하나 = 아트보드 하나"로 구현하지 않도록, **구현 단위**와 그 단위의 **Variant·State**로 다시 묶는다. 캔버스와 아트보드는 그대로 두고(디자인 보존), 4장 표에 분류 칸만 더했다.

분류 기준

| 분류 | 뜻 | 구현 | 수 |
|---|---|---|---|
| Base | 구현 단위의 기본 모습 | 컴포넌트 1개 | 18 |
| Variant | 같은 단위의 진입 경로·mode·권한·보기·단계 차이 | props·URL 쿼리로 분기, 새 파일 아님 | 24 |
| State | 로딩·빈·오류·409·저장 중·칸 오류 | 공통 상태 컴포넌트 배치(아래 표) | 51 |
| Result | 저장 성공 뒤 결과 화면(토스트·강조·목록 갱신) | 흐름의 끝. 새 화면 아님 | 6 |
| Scenario | 데이터 모양만 다른 예시(긴 이름·차량 2대·같은 시각 2건 등) | **구현 대상 아님**, 검증·시연용 | 5 |
| Responsive · A11y · Guide | 폭별 배치·접근성·디자인 가이드 | Layout·CSS 규칙 | 15 · 1 · 6 |

제품 화면 120개 → **구현 단위 21개**(페이지 7 · 패널 2 · 모달 8 · 확인 대화상자 1 · Layout 1 · 공통 상태 2. 접근성 아트보드는 Modal 공통 규칙). 독립 URL을 갖는 것은 페이지 7개뿐이다(FRONTEND_STRUCTURE 2장).

### 8-1. 구현 단위별 아트보드 수

| 구현 단위 | 종류 | Base | Variant | State | Result | Scenario | 합 |
|---|---|---|---|---|---|---|---|
| S-01 | 페이지 | 1 | 2 | 4 | 0 | 0 | 7 |
| S-02 | 페이지 | 1 | 3 | 5 | 1 | 1 | 11 |
| 예약 패널 | 패널(S-02 안) | 1 | 4 | 2 | 0 | 1 | 8 |
| AppLayout | Layout | 0 | 1 | 0 | 0 | 0 | 1 |
| 확인 대화상자 | 대화상자(1종, kind 5개) | 1 | 3 | 1 | 0 | 0 | 5 |
| 정정 모달 | 모달(패널에서) | 1 | 1 | 0 | 0 | 0 | 2 |
| M-02 | 모달 | 1 | 3 | 8 | 1 | 0 | 13 |
| S-04 | 페이지 | 1 | 1 | 3 | 0 | 0 | 5 |
| 연락 준비 패널 | 패널(S-04 안) | 1 | 0 | 0 | 0 | 0 | 1 |
| S-05 | 페이지 | 1 | 1 | 5 | 0 | 1 | 8 |
| M-01 | 모달 | 1 | 2 | 4 | 0 | 0 | 7 |
| S-06 | 페이지 | 1 | 0 | 3 | 2 | 1 | 7 |
| 차량 추가 모달 | 모달 | 1 | 0 | 1 | 0 | 0 | 2 |
| 고객 수정 모달 | 모달 | 1 | 0 | 1 | 0 | 0 | 2 |
| S-07 | 페이지 | 1 | 1 | 1 | 2 | 1 | 6 |
| 차량 수정 모달 | 모달 | 1 | 0 | 1 | 0 | 0 | 2 |
| S-08 | 페이지 | 1 | 2 | 7 | 0 | 0 | 10 |
| M-03 | 모달 | 1 | 0 | 1 | 0 | 0 | 2 |
| 수정 이력 모달 | 모달 | 1 | 0 | 0 | 0 | 0 | 1 |
| 공통 오류 토스트 | 공통 상태 | 0 | 0 | 3 | 0 | 0 | 3 |
| 공통 404 | 공통 상태 | 0 | 0 | 1 | 0 | 0 | 1 |

### 8-2. 공통 상태로 합쳐지는 반복 구조 (State 아트보드 기준, 2개 이상)

| 공통 상태 컴포넌트 | 쓰는 State 아트보드 수 |
|---|---|
| ErrorNotice | 14 |
| FormField | 9 |
| EmptyState | 8 |
| Button loading | 4 |
| Skeleton | 3 |
| SaveFailNotice | 3 |
| ErrorToast | 3 |
| VisitPreview | 2 |

같은 상태를 화면마다 따로 만들지 않는다: 로딩 = `Skeleton`, 조회 실패·네트워크·시간 초과·404 = `ErrorNotice`(코드별 문구는 client.ts의 `ApiError.code` 하나에서), 409 = `ErrorNotice` warn + 최신 값 다시 불러오기, 저장 중 = `Button loading`, 저장 실패 = `SaveFailNotice`(입력 유지), 빈 상태 = `EmptyState`. 화면별 아트보드는 **배치와 문구 확인용**이다.

### 8-3. 중복 아님으로 판정한 것 (합치지 않음)

| 비슷한 아트보드 | 차이 | 판정 |
|---|---|---|
| Modal-Create-ActiveExists ↔ Modal-Create-409-ActiveExists | 사전 안내(선택 시) ↔ 서버 409(저장 시) | 둘 다 유지, 같은 `ErrorNotice` |
| Modal-Create-SlotTaken ↔ Modal-Create-409-MechanicSlot | 시각 버튼 비활성(사전) ↔ 서버 409 | 둘 다 유지 |
| Login-Error ↔ Login-Failed | 칸 오류(빈칸) ↔ 401 공통 문구 | 둘 다 유지 |
| Home-Week-SidebarCollapsed ↔ RWD-1366-Home | 사용자가 접음 ↔ 1440 미만 자동 접힘 | 둘 다 유지 |
| Home-Week-DetailClosed ↔ Home-Week-NoReservations | 패널 닫음 ↔ 예약 0건 빈 패널 | 둘 다 유지 |
| 예약 상태 칩 ↔ 정비 주기 StatusBadge | 예약 5종 ↔ 주기 4종(서버 값) | **합치지 않음**(B03, CLAUDE.md) |

### 8-4. 시나리오 ↔ 아트보드

A 재점검 → 예약: Reinspection → Reinspection-Selected → Modal-Create-FromTarget → Home-Toast-Reservation · B 신규 고객: Customer-List-Search → Customer-List-Empty → Modal-Register-FromSearch → Customer-Detail-Registered / Modal-Create-Register → Modal-Create-Registered · Visit-Record-FirstVisit(-Required) · C 예약 처리: Home-Week-Reservation2 → Home-Dialog-Start → Home-Panel-InProgress → Visit-Record(-Filled) → Vehicle-Toast-Saved · D 차량 추가: Customer-Detail → Modal-AddVehicle → Customer-Detail-VehicleAdded · E 변경: Home-Week-Reservation4 → Modal-Edit(-ReassignToday) · F 충돌: Modal-Create-SlotTaken·-409-*·Modal-Edit-409-Concurrent·Home-Panel-Conflict409·Modal-EditCustomer-409 · G 기록 수정: Vehicle-Detail → Modal-EditRecord(-409) → Vehicle-Detail-RecordEdited → Modal-RecordRevisions · H 오류: Login-*·*-Errors·*-SaveFailed·Home-ErrorToast-*·Login-SessionExpired. (4장 「시나리오」 칸이 각 아트보드의 소속)

## 9. v3.0 통합 매핑 — v2 화면 126개 → 최종 페이지·컴포넌트 (STEP 09-C, 2026-11-25)

입력: 이 문서 4·8장(v2 분류)과 v3 Export `mapping/v2-to-v3-mapping.csv`(154행) · v3 프로토타입 소스 `b-source/src`(STEP 09-B) · A 캡처 `screens/`(154장).
원칙: 화면 수를 그대로 둘 필요는 없지만 각 아트보드의 정책·검증 항목은 빠지지 않게 한다. 아래 표의 모든 행에 v3 상태 번호와 캡처가 있다.

### 9-1. 통합 구분 집계

| 통합 구분 | 뜻 | v2 아트보드 수 |
|---|---|---|
| 유지 | 구현 단위의 기본 모습(Base 18)과 디자인 가이드(6). 그대로 한 컴포넌트·페이지 | 24 |
| 페이지 내부 통합 | 저장 결과 화면(Result 6)과 폭별 배치(Responsive 15). 새 화면 없이 같은 페이지 안의 흐름 끝·CSS | 21 |
| 공통 컴포넌트 통합 | 로딩·빈·오류·409·저장 중·칸 오류 State와 접근성(A11y). 공통 상태 컴포넌트 하나로 | 46 |
| Variant·State 전환 | 진입 경로·mode·권한·보기 차이(Variant 24)와 공통 컴포넌트가 아닌 State. props·쿼리로 분기 | 30 |
| 검증 시나리오 전환 | 데이터 모양만 다른 예시(Scenario 5). 구현 대상 아님, 검증·시연용 | 5 |
| 중복 제거 | v2 아트보드 2개 이상이 같은 v3 상태로 합쳐진 것 | 0 (126개 모두 v3 상태 1개에 1:1. 비슷한 아트보드는 8-3장에서 "중복 아님"으로 판정해 둘 다 유지) |
| 정책에 따른 제외 | 정책으로 만들지 않는 화면 | v2 0 · v1.0 기준 S-03 예약 화면(D-54 폐지), 403 전체 페이지(오류 토스트로 처리) — 6장 |
| 미검증 | 근거(캡처·시나리오) 없음 | 0 (126개 모두 A 캡처 있음). 단 캔버스 안 렌더링 자체는 전체 미검증(A 3장) |
| **합계** | | **126** (제품 120 + 가이드 6) |

### 9-2. v3 위치별 수 (v2 유지 126 + P1 신규 28 = 154 상태)

| v3 위치 | v2 아트보드 | P1 신규 상태 | 합 |
|---|---|---|---|
| S-01 | 7 | 4 | 11 |
| S-02 | 43 | 1 | 44 |
| S-04 | 7 | 3 | 10 |
| S-05 | 14 | 1 | 15 |
| S-06 | 11 | 3 | 14 |
| S-07 | 12 | 1 | 13 |
| S-08 | 11 | 0 | 11 |
| S-09 | 0 | 10 | 10 |
| S-10 | 0 | 5 | 5 |
| 반응형 확인 | 15 | 0 | 15 |
| 디자인 시스템 | 6 | 0 | 6 |
| **합계** | **126** | **28** | **154** |

P1 신규 상태 28개는 9-4에 있다. 독립 URL을 갖는 화면은 FRONTEND_STRUCTURE 11-1(주요 페이지 9 + 404)뿐이다.

### 9-3. v2 아트보드별 매핑

v2 분류 = 4장 「분류」 칸. 최종 소스 = 그 아트보드를 그리는 v3 파일(`b-source/src` 기준). 검증 근거 = A 캡처(v3 Export `screens/<페이지>/<아트보드>.png`, B 정리 전후 같은 소스임을 STEP09_B_REPORT 5장에서 확인). 이 폴더에서는 `../improved-v3.0/screenshots/verification/<페이지>/<아트보드>.jpg`(480px, STEP 09-C 수정분 8장은 수정 소스로 갱신).

| # | v2 아트보드 | v2 분류 | v3 위치(페이지 #상태) | 최종 소스(b-source/src) | 통합 구분 | 검증 근거 |
|---|---|---|---|---|---|---|
| 1 | Guide-Mascot-Usage | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 2 | Guide-Mascot-Toast | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 3 | Guide-Logo | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 4 | DS-Foundations | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 5 | DS-Controls | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 6 | DS-Feedback-Overlay | Guide | 디자인 시스템 | `guide/DesignSystemPage.tsx · guide/GuidePages.tsx` | 유지 | A 캡처 |
| 7 | Main | Base | S-01 #01 | `pages/S01-Login/LoginPage.tsx` | 유지 | A 캡처 |
| 8 | Login-Error | State | S-01 #02 | `pages/S01-Login/LoginPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 9 | Home-Week | Base | S-02 #01 | `pages/S02-Home/HomePage.tsx` | 유지 | A 캡처 |
| 10 | Home-Week-Reservation2 | Base | S-02 #02 | `features/reservation/DetailPanel.tsx` | 유지 | A 캡처 |
| 11 | Home-Week-Reservation3 | Scenario | S-02 #03 | `features/reservation/DetailPanel.tsx` | 검증 시나리오 전환 | A 캡처 |
| 12 | Home-Week-Reservation4 | Variant | S-02 #04 | `features/reservation/DetailPanel.tsx` | Variant·State 전환 | A 캡처 |
| 13 | Home-Week-DetailClosed | Variant | S-02 #05 | `pages/S02-Home/HomePage.tsx` | Variant·State 전환 | A 캡처 |
| 14 | Home-Week-Busy | Scenario | S-02 #15 | `pages/S02-Home/HomePage.tsx` | 검증 시나리오 전환 | A 캡처 |
| 15 | Home-Week-SidebarCollapsed | Variant | S-02 #43 | `app/App.tsx · app/AppMenu.tsx` | Variant·State 전환 | A 캡처 |
| 16 | Home-Dialog-Start | Base | S-02 #06 | `features/reservation/DetailPanel.tsx (PanelDialog)` | 유지 | A 캡처 |
| 17 | Home-Dialog-Start-MissingInfo | State | S-02 #07 | `features/reservation/DetailPanel.tsx (PanelDialog)` | Variant·State 전환 | A 캡처 |
| 18 | Home-Panel-InProgress | Variant | S-02 #08 | `features/reservation/DetailPanel.tsx` | Variant·State 전환 | A 캡처 |
| 19 | Home-Confirm-Cancel | Variant | S-02 #09 | `features/reservation/DetailPanel.tsx (PanelDialog)` | Variant·State 전환 | A 캡처 |
| 20 | Home-Confirm-NoShow | Variant | S-02 #10 | `features/reservation/DetailPanel.tsx (PanelDialog)` | Variant·State 전환 | A 캡처 |
| 21 | Home-Panel-NoShow | Variant | S-02 #11 | `features/reservation/DetailPanel.tsx` | Variant·State 전환 | A 캡처 |
| 22 | Home-Dialog-Correct | Base | S-02 #12 | `features/reservation/DetailPanel.tsx (PanelDialog correct)` | 유지 | A 캡처 |
| 23 | Home-Panel-Revisions | State | S-02 #13 | `features/reservation/DetailPanel.tsx` | Variant·State 전환 | A 캡처 |
| 24 | Home-Panel-Conflict409 | State | S-02 #14 | `features/reservation/DetailPanel.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 25 | Home-Month | Variant | S-02 #16 | `pages/S02-Home/HomePage.tsx` | Variant·State 전환 | A 캡처 |
| 26 | Home-Month-EmptyDay | State | S-02 #17 | `pages/S02-Home/HomePage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 27 | Home-Month-ReservationDetail | Variant | S-02 #18 | `features/reservation/DateListPanel.tsx · DetailPanel.tsx` | Variant·State 전환 | A 캡처 |
| 28 | Home-Loading | State | S-02 #19 | `pages/S02-Home/HomePage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 29 | Home-Error | State | S-02 #20 | `pages/S02-Home/HomePage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 30 | Home-Core-TodayList | Variant | S-02 #21 | `pages/S02-Home/HomeCorePage.tsx` | Variant·State 전환 | A 캡처 |
| 31 | Modal-Create | Base | S-02 #22 | `features/reservation/ReservationModal.tsx` | 유지 | A 캡처 |
| 32 | Modal-Create-FromTarget | Variant | S-04 #02 | `features/reservation/ReservationModal.tsx` | Variant·State 전환 | A 캡처 |
| 33 | Modal-Create-FromSlot | Variant | S-02 #23 | `features/reservation/ReservationModal.tsx` | Variant·State 전환 | A 캡처 |
| 34 | Home-Toast-Reservation | Result | S-02 #32 | `pages/S02-Home/HomePage.tsx` | 페이지 내부 통합 | A 캡처 |
| 35 | Modal-Create-ActiveExists | State | S-02 #24 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 36 | Modal-Create-409-ActiveExists | State | S-02 #25 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 37 | Modal-Create-SlotTaken | State | S-02 #26 | `features/reservation/ReservationModal.tsx` | Variant·State 전환 | A 캡처 |
| 38 | Modal-Create-409-MechanicSlot | State | S-02 #27 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 39 | Modal-Create-Submitting | State | S-02 #28 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 40 | Modal-Edit | Variant | S-02 #29 | `features/reservation/ReservationModal.tsx` | Variant·State 전환 | A 캡처 |
| 41 | Modal-Edit-409-Concurrent | State | S-02 #30 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 42 | Modal-Edit-ReassignToday | State | S-02 #31 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 43 | Reinspection | Base | S-04 #01 | `pages/S04-Reinspection/ReinspectionPage.tsx` | 유지 | A 캡처 |
| 44 | Reinspection-Selected | Base | S-04 #04 | `pages/S04-Reinspection/ContactPanel.tsx` | 유지 | A 캡처 |
| 45 | Reinspection-Filter-NoReservation | Variant | S-04 #05 | `pages/S04-Reinspection/ReinspectionPage.tsx` | Variant·State 전환 | A 캡처 |
| 46 | Reinspection-Empty | State | S-04 #03 | `pages/S04-Reinspection/ReinspectionPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 47 | Customer-List | Base | S-05 #01 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 유지 | A 캡처 |
| 48 | Customer-List-Search | Variant | S-05 #03 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | Variant·State 전환 | A 캡처 |
| 49 | Customer-List-Empty | State | S-05 #02 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 50 | Customer-List-NoCustomers | State | S-05 #04 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 51 | Customer-List-Paged | Scenario | S-05 #07 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 검증 시나리오 전환 | A 캡처 |
| 52 | Customer-List-Loading | State | S-05 #05 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 53 | Customer-List-Error | State | S-05 #06 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 54 | Modal-Register | Base | S-05 #08 | `features/customer/CustomerRegisterModal.tsx` | 유지 | A 캡처 |
| 55 | Modal-Register-FromSearch | Variant | S-05 #09 | `features/customer/CustomerRegisterModal.tsx` | Variant·State 전환 | A 캡처 |
| 56 | Modal-Register-Duplicate | State | S-05 #10 | `features/customer/CustomerRegisterModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 57 | Modal-Register-Errors | State | S-05 #11 | `features/customer/CustomerRegisterModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 58 | Modal-Register-Submitting | State | S-05 #12 | `features/customer/CustomerRegisterModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 59 | Modal-Register-SaveFailed | State | S-05 #13 | `features/customer/CustomerRegisterModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 60 | Customer-Detail-Registered | Result | S-06 #02 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 페이지 내부 통합 | A 캡처 |
| 61 | Modal-Create-Register | Variant | S-02 #33 | `features/customer/CustomerRegisterModal.tsx` | Variant·State 전환 | A 캡처 |
| 62 | Modal-Create-Registered | Result | S-02 #34 | `features/reservation/ReservationModal.tsx` | 페이지 내부 통합 | A 캡처 |
| 63 | Customer-Detail | Base | S-06 #01 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 유지 | A 캡처 |
| 64 | Customer-Detail-MultiVehicle | Scenario | S-06 #03 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 검증 시나리오 전환 | A 캡처 |
| 65 | Modal-AddVehicle | Base | S-06 #06 | `features/customer/AddVehicleModal.tsx` | 유지 | A 캡처 |
| 66 | Modal-AddVehicle-Duplicate | State | S-06 #07 | `features/customer/AddVehicleModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 67 | Customer-Detail-VehicleAdded | Result | S-06 #08 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 페이지 내부 통합 | A 캡처 |
| 68 | Modal-EditCustomer | Base | S-06 #09 | `features/customer/CustomerEditModal.tsx` | 유지 | A 캡처 |
| 69 | Modal-EditCustomer-409 | State | S-06 #10 | `features/customer/CustomerEditModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 70 | Customer-Detail-Loading | State | S-06 #04 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 71 | Customer-Detail-Error | State | S-06 #05 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 72 | Vehicle-Detail | Base | S-07 #01 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | 유지 | A 캡처 |
| 73 | Vehicle-Detail-78ra0004 | Scenario | S-07 #02 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | 검증 시나리오 전환 | A 캡처 |
| 74 | Vehicle-Detail-MissingInfo | State | S-07 #03 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 75 | Modal-EditVehicle | Base | S-07 #04 | `features/customer/VehicleEditModal.tsx` | 유지 | A 캡처 |
| 76 | Modal-EditVehicle-Errors | State | S-07 #05 | `features/customer/VehicleEditModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 77 | Visit-Record | Base | S-08 #01 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 유지 | A 캡처 |
| 78 | Visit-Record-Filled | Variant | S-08 #02 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | Variant·State 전환 | A 캡처 |
| 79 | Visit-Record-PreviewLoading | State | S-08 #03 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | Variant·State 전환 | A 캡처 |
| 80 | Visit-Record-PreviewError | State | S-08 #04 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | Variant·State 전환 | A 캡처 |
| 81 | Visit-Record-LowerMileage | State | S-08 #08 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 82 | Visit-Record-FirstVisit | Variant | S-08 #06 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | Variant·State 전환 | A 캡처 |
| 83 | Visit-Record-FirstVisit-Required | State | S-08 #07 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 84 | Visit-Record-Errors | State | S-08 #05 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 85 | Visit-Record-Submitting | State | S-08 #09 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 86 | Visit-Record-SaveFailed | State | S-08 #10 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 87 | Visit-Record-LeaveConfirm | Variant | S-08 #11 | `app/LeaveDialog.tsx` | Variant·State 전환 | A 캡처 |
| 88 | Vehicle-Toast-Saved | Result | S-07 #06 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | 페이지 내부 통합 | A 캡처 |
| 89 | Modal-EditRecord | Base | S-07 #07 | `features/maintenance/RecordEditModal.tsx` | 유지 | A 캡처 |
| 90 | Modal-EditRecord-409 | State | S-07 #08 | `features/maintenance/RecordEditModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 91 | Vehicle-Detail-RecordEdited | Result | S-07 #09 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | 페이지 내부 통합 | A 캡처 |
| 92 | Modal-RecordRevisions | Base | S-07 #10 | `features/maintenance/RecordRevisionsModal.tsx` | 유지 | A 캡처 |
| 93 | Vehicle-Detail-MechanicView | Variant | S-07 #11 | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` | Variant·State 전환 | A 캡처 |
| 94 | Login-Failed | State | S-01 #03 | `pages/S01-Login/LoginPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 95 | Login-Submitting | State | S-01 #04 | `pages/S01-Login/LoginPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 96 | Login-NetworkError | State | S-01 #05 | `pages/S01-Login/LoginPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 97 | Login-SessionExpired | Variant | S-01 #06 | `pages/S01-Login/LoginPage.tsx` | Variant·State 전환 | A 캡처 |
| 98 | Login-LoggedOut | Variant | S-01 #07 | `pages/S01-Login/LoginPage.tsx` | Variant·State 전환 | A 캡처 |
| 99 | Home-Week-NoReservations | State | S-02 #35 | `pages/S02-Home/HomePage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 100 | Home-ErrorToast-Server | State | S-02 #39 | `shared/ui/Feedback.tsx (ErrorToast)` | 공통 컴포넌트 통합 | A 캡처 |
| 101 | Home-ErrorToast-Network | State | S-02 #40 | `shared/ui/Feedback.tsx (ErrorToast)` | 공통 컴포넌트 통합 | A 캡처 |
| 102 | Home-Dialog-Correct-Mechanic | Variant | S-02 #41 | `features/reservation/DetailPanel.tsx (PanelDialog correct)` | Variant·State 전환 | A 캡처 |
| 103 | Reinspection-NoTargets | State | S-04 #06 | `pages/S04-Reinspection/ReinspectionPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 104 | Reinspection-Timeout | State | S-04 #07 | `pages/S04-Reinspection/ReinspectionPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 105 | Customer-List-NetworkError | State | S-05 #14 | `pages/S05-CustomerList/CustomerVehicleListPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 106 | Vehicle-NotFound | State | S-07 #12 | `app/NotFoundPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 107 | A11y-Modal-KeyboardFocus | A11y | S-02 #42 | `shared/lib/a11y.ts (useDialogA11y) · shared/ui/Modal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 108 | Modal-Create-SaveFailed | State | S-02 #36 | `features/reservation/ReservationModal.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 109 | Home-Refreshing | State | S-02 #37 | `pages/S02-Home/HomePage.tsx` | Variant·State 전환 | A 캡처 |
| 110 | Customer-Detail-NoVehicles | State | S-06 #11 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx` | 공통 컴포넌트 통합 | A 캡처 |
| 111 | Home-ErrorToast-Forbidden | State | S-02 #38 | `shared/ui/Feedback.tsx (ErrorToast)` | 공통 컴포넌트 통합 | A 캡처 |
| 112 | RWD-1920-Home | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 113 | RWD-1366-Home | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 114 | RWD-1366-Visit-Record | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 115 | RWD-1024-Home-Panel | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 116 | RWD-1024-Reinspection | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 117 | RWD-1024-Customer-List | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 118 | RWD-768-Login | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 119 | RWD-768-Home | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 120 | RWD-768-Panel-Overlay | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 121 | RWD-768-Reinspection | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 122 | RWD-768-Contact-Overlay | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 123 | RWD-768-Customer-List | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 124 | RWD-768-Vehicle-Detail | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 125 | RWD-768-Visit-Record | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |
| 126 | RWD-768-Modal-Create | Responsive | 반응형 확인 | `app/App.tsx (narrow·navCollapsed) · index.css` | 페이지 내부 통합 | A 캡처 |

### 9-4. P1 신규 상태 (v3에서 추가, v2에 없음)

| v3 위치 | 상태 | 캡처 |
|---|---|---|
| S-01 #08 | 첫 로그인 · 비밀번호 변경 단계 | A 캡처 Login-PasswordChange |
| S-01 #09 | 비밀번호 변경 · 칸 오류(blur) | A 캡처 Login-PasswordChange-Errors |
| S-01 #10 | 사장 · 약관 동의 단계 | A 캡처 Login-Terms |
| S-01 #11 | 비활성 계정 로그인 안내 | A 캡처 Login-AccountInactive |
| S-02 #44 | 고객 집계 · 기간 직접 선택 | A 캡처 Home-CustomerStats-Custom |
| S-04 #08 | 연락 준비 · 문자 초안 | A 캡처 Reinspection-MessageDraft |
| S-04 #09 | 연락 결과 기록 · 연락함 꼬리표 | A 캡처 Reinspection-ContactRecorded |
| S-04 #10 | 연락 거부 → 동의 해제 확인 | A 캡처 Reinspection-RefuseConfirm |
| S-05 #15 | 비활성 포함 · 비활성 꼬리표 | A 캡처 Customer-List-IncludeInactive |
| S-06 #12 | 고객 비활성화 확인 | A 캡처 Customer-Detail-DeactivateConfirm |
| S-06 #13 | 비활성화 불가(유효 예약 409) | A 캡처 Customer-Detail-Deactivate-409 |
| S-06 #14 | 비활성 고객 상세 | A 캡처 Customer-Detail-Inactive |
| S-07 #13 | 차량 비활성화 확인 | A 캡처 Vehicle-Detail-DeactivateConfirm |
| S-09 #01 | 정비사 계정 | A 캡처 Settings-Staff |
| S-09 #02 | 정비사 추가 | A 캡처 Settings-StaffAdd |
| S-09 #03 | 정비사 추가 · 아이디 중복(409) | A 캡처 Settings-StaffAdd-Duplicate |
| S-09 #04 | 임시 비밀번호 재발급 | A 캡처 Settings-StaffReset |
| S-09 #05 | 정비사 비활성화 불가(유효 예약) | A 캡처 Settings-StaffDeactivate-409 |
| S-09 #06 | 항목 기준표 | A 캡처 Settings-Items |
| S-09 #07 | 아침 알림 | A 캡처 Settings-Alert |
| S-09 #08 | 보관 기간 경과 고객 · 없음 | A 캡처 Settings-Retention-Empty |
| S-09 #09 | [디자인 상황] 보관 기간 경과 고객 목록 | A 캡처 Settings-Retention |
| S-09 #10 | 익명화 확인 | A 캡처 Settings-Anonymize |
| S-10 #01 | 정비소 목록 | A 캡처 Admin-Shops |
| S-10 #02 | 정비소 개설 | A 캡처 Admin-ShopCreate |
| S-10 #03 | 정비소 개설 · 칸 오류·아이디 중복 | A 캡처 Admin-ShopCreate-Errors |
| S-10 #04 | 이용 정지 확인 | A 캡처 Admin-SuspendConfirm |
| S-10 #05 | 사장 비밀번호 재발급 | A 캡처 Admin-OwnerReset |

### 9-5. 검증 항목 보존 확인

- 4장 「시나리오」 칸의 A~H(P0)는 A에서 v3 소스로 다시 돌려 31/31 PASS, P1 시나리오는 26/26 PASS다(A 보고서 7장). B 정리 뒤에도 화면·DOM 차이가 0이라(STEP09_B_REPORT 5장) 같은 근거를 다시 쓴다.
- 8-2장 공통 상태 8종(ErrorNotice·FormField·EmptyState·Button loading·Skeleton·SaveFailNotice·ErrorToast·VisitPreview)은 v3에서도 같은 컴포넌트가 그린다(COMPONENT_SPEC 「STEP 09-C」).
- 8-3장에서 "중복 아님"으로 둔 6쌍은 v3에서도 둘 다 따로 있다(상태 번호가 다름).
- STEP 09-C 수정(N1~N5, DESIGN_VERIFICATION 9C-2)으로 S-10 목록·S-09 보관 탭·비활성 고객/차량 상세의 버튼 모양이 A 캡처와 달라졌다. 정책·상태 번호는 그대로이고, 최종 캡처는 수정 소스로 다시 찍었다(STEP 09-D 전 보완: 갱신 8장 Admin-Shops·Admin-ShopCreate·Admin-SuspendConfirm·Admin-OwnerReset·Settings-Retention·Settings-Anonymize·Customer-Detail-Inactive·Customer-List-IncludeInactive, 추가 2장 C-N1-*). 폰 폭(390px)은 지원 범위 밖 — DESIGN_VERIFICATION 9C-7.
- 미검증으로 남은 것: 캔버스 안 렌더링(A 3장), 문자 앱 열기의 기기별 동작, 실제 브라우저 알림, 실제 API·DB·인증.
