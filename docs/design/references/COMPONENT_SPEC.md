# COMPONENT_SPEC — ChaGok Design v2.0 → v3.0 (P0·P1, STEP 09-C 갱신)

> 상태: **STEP 02 작성분** (토큰 · 공통 UI). Props·도메인 컴포넌트·파일·소유권은 STEP 07에서 덧붙인다.
> 시각 기준: 캔버스 "ChaGok — Design v2.0" › 디자인 가이드 페이지 › `DS-Foundations` · `DS-Controls` · `DS-Feedback-Overlay`.
> 값의 원본: `prototype-src/src/index.css` 끝의 `:root --ck-*` 블록. chagok-frontend에는 `src/shared/ui/theme.css`가 있으므로 구현 때는 그 파일의 변수로 옮긴다(이름·값 대응은 §1). theme.css 자체 변경은 팀 승인 후(STEP 09·10).

## 1. 토큰 (C05)

| 그룹 | 토큰 | 값 | 비고 |
|---|---|---|---|
| 브랜드 | `--ck-brand` / `-hover` / `-tint` / `-ring` | #1F2BFF / #1621D9 / #F0F1FF / rgba(31,43,255,.32) | 원본 코발트 유지 |
| 표면 | `--ck-bg` `--ck-surface` `--ck-surface-muted` `--ck-border` `--ck-border-soft` `--ck-ink` | #F2F3F6 #FFF #F5F6F8 #E4E6EA #EEEFF2 #111 | |
| 글자 | `--ck-text-1`~`4`, `-disabled` | #111318 · #4D525A · #5F646D · #626770 · #9A9EA5 | 1~4는 흰 바탕 5.7:1 이상, disabled는 비활성 요소에만 |
| 점검 주기 | `--ck-due-*` `--ck-soon-*` `--ck-ahead-*` `--ck-unknown-*` (bg·fg·dot) | 도래 #FEECEC/#B42318 · 임박 #FFF6E5/#9A5800 · 여유 #EFF6FF/#1D4ED8 · 미확인 #F1F2F3/#5F646D | frontend theme.css `--status-*`와 같은 계열(파랑=여유). 글자 대비 4.5:1 이상 |
| 예약 상태 | `--ck-rsv-reserved/progress/done/canceled/noshow-*` | 예약 #F0F1FF/#1F2BFF · 진행중 #1F2BFF/#FFF · 방문 완료 #ECFDF3/#067647 · 취소 #F1F2F3/#5F646D · 노쇼 #FEECEC/#B42318 | 08 0.4 RESERVED·IN_PROGRESS·COMPLETED·CANCELED·NO_SHOW |
| 담당 | `--ck-assignee-0~3` | #8B5CF6 · #EC4899 · #0D9488 · #92400E | API 36 `colorIndex` 순서. 상태 색과 다른 계열, 이름과 함께(09 0장) |
| 글자 크기 | `--ck-fs-caption/meta/small/body/body-lg/card-title/section/page/number` | 12 · 13 · 14 · 15 · 16 · 18 · 20 · 26 · 32 px | 업무 화면 최소 12px |
| 굵기 · 행간 | `--ck-fw-*` `--ck-lh-tight/body` | 400·500·600·700 / 1.25·1.5 | |
| 간격 | `--ck-space-1~8` | 4 · 8 · 12 · 16 · 20 · 24 · 32 | 4px 단위 |
| 모서리 | `--ck-radius-sm/md/lg/xl/pill` | 8 · 12 · 16 · 20 · 999 | |
| 그림자 | `--ck-shadow-card/pop/brand` | none · 0 4px 16px rgba(17,24,39,.08) · none | chagok-frontend#82: 카드·버튼·사이드바는 그림자 없이 테두리(`--ck-border-soft`)·배경 대비로 구분. pop은 모달처럼 떠 있는 층에만. 포커스 링(0 0 0 3px)은 그림자가 아님 |
| 크기 | `--ck-control-h(-sm/-lg)` · `--ck-icon(-sm)` | 44(40/48) · 20(16) | 터치 영역 40px 이상 |
| 레이아웃 | `--ck-sidebar-w(-collapsed)` · `--ck-panel-w` · `--ck-modal-w` | 216(76) · 380 · 560 | 반응형 확정은 STEP 06 |
| z-index | `--ck-z-sidebar/panel/modal/dialog/toast/tooltip` | 30 · 40 · 120 · 130 · 150 · 160 | |

## 2. 공통 UI 목록 (C02, 시각 명세)

명세 범위: 모양·상태·접근성. Props·API 책임은 STEP 07.

| 컴포넌트 | 프로토타입 클래스 | 변형 · 상태 | 접근성 · 규칙 |
|---|---|---|---|
| Button | `.btn` + `.btn-primary/dark/secondary/ghost/danger`, `.btn-sm/lg` | Default · Hover · Focus · Disabled · Loading(`aria-busy`, 스피너) | 화면당 Primary 1개. 요청 중 비활성(05 POL-120). 높이 40/44/48 |
| IconButton | `.icon-button` | 40×40 | `aria-label` 필수 |
| Input · FormField | `.ck-field` > label + `.ck-input` + `.ck-help`/`.ck-error` | Default · Focus · Filled · Error · Disabled | 오류: `aria-invalid` + `aria-describedby`, 문구 필수(색만 X), 실패해도 값 유지 |
| SearchInput | `.search-field` | Default · Focus(링) | `aria-label`. 결과 없음은 EmptyState |
| Select | `.ck-select` | Default · Focus | 담당 선택은 이름 + 색 점 |
| DatePicker | `.ck-input[type=date]` | 브라우저 기본 | 표시 형식 YYYY.MM.DD |
| Checkbox · Radio | `.ck-check` | checked · unchecked | 라벨 클릭 가능, 40px 높이 |
| StatusBadge (점검 주기) | `CycleBadge` | 도래 · 임박 · 여유 · 미확인 | 글자 + 점 + 색. 서버 status 그대로(08 0.4) |
| ReservationStatusBadge | `StatusChip` | 예약 · 진행중 · 방문 완료 · 취소 · 노쇼 | 글자 항상 표시 |
| 보조 꼬리표 | (인라인) | 처리 필요 · 예약 있음 · 지난 방문 거절 · 지난 점검 주의 · 예약 목적 · 수정됨 · 담당 | 상태를 바꾸지 않음(09 0장) |
| Card | `.card-panel` | — | 모서리 20, 테두리 1px `--ck-border-soft` (그림자 없음, chagok-frontend#82) |
| Table | `.maintenance-table` | — | 본문 14~15px |
| Tabs | `.ck-tabs` (주/월 토글) | selected | `role=tablist/tab`, `aria-selected` |
| Pagination | `.ck-pagination` | current · disabled | `aria-current="page"`, 40px |
| Modal | `.reservation-modal` 계열 | — | 560px, 초점 가두기 · Esc · 닫은 뒤 초점 복귀(STEP 06 검증) |
| ConfirmDialog | `.panel-confirm-dialog` 계열 | — | `role=alertdialog`, 대상(차량번호·일시) 표시(STEP 03에서 화면 반영) |
| SidePanel | `.detail-panel` | 열림 · 닫힘 | 380px, 1024px 미만 전체 덮개(STEP 06) |
| Toast | `.success-toast` | 성공 | 성공 알림만. 오류는 ErrorNotice |
| EmptyState | `.ck-empty` / 마스코트 빈 상태 | — | 09 5장 문구 + 다음 행동 |
| LoadingState | `.ck-skeleton` | — | 자리 크기 유지 |
| ErrorNotice | `.ck-notice.error/warn/info` | 조회 실패 · 저장 실패 · 세션 안내 | `role=alert`, 수동 다시 시도(자동 재전송 없음, 05 POL-125) |
| Tooltip | `.ck-tooltip`, 사이드바 `[data-tip]` | hover · focus | 접힌 사이드바·아이콘 버튼 |
| Sidebar | `.app-sidebar` | 펼침 · 접힘 | 메뉴명 + 아이콘, `aria-current`, 접힘 시 `aria-label`·툴팁, 계정·로그아웃 아래 고정 |
| PageHeader | `.page-header` | 제목 · 뒤로(경로) · 부제 · 주요 행동 | 계정 정보는 사이드바로(중복 제거) |
| ItemStatusList (도메인) | 패널·재점검·차량 상세·미리보기 | summary · target · table · preview | 서버 값 그대로, 프론트 재계산 금지 |

## 3. 마스코트 사용 범위
로그인 · 빈 상태 · 저장 성공 토스트에서만. 업무 정보(표·카드·패널) 안에는 넣지 않는다.

## STEP 04 추가 컴포넌트 (시각·동작만, Props·파일은 STEP 07)

| 컴포넌트 | 쓰는 곳 | 요점 |
|---|---|---|
| FormModal | M-01 · 차량 추가 · 고객 수정 · 차량 수정 | 예약 모달과 같은 틀(머리·내용·바닥). 겹쳐 열 때(M-02 위) 바탕 z 120 |
| CustomerFields | M-01 · 고객 수정 | 고객명* · 연락처*(숫자·하이픈 9~20) · 안내 수신 동의(기본 해제 + 안내문) |
| VehicleFields | M-01 · 차량 추가 · 차량 수정 | 차량번호*(공백 제거) · 차종* · 연식(1980~올해+1, "년") · 주행거리(0~2,000,000, "km"). 수정 모드는 "최근 주행거리", 이미 있는 값은 비울 수 없음 |
| TextField | 위 두 칸 묶음 | 라벨(필수 * / 선택 "(선택)") · 입력 · 도움말/경고(주황 !)/오류(빨강 ⚠) 한 줄, `aria-invalid`·`aria-describedby` |
| SaveFailNotice | 모든 폼 | 500·네트워크: 입력 유지 + 수동 [다시 시도] |
| 중복 안내(dup-notice) | M-01 | "이미 있는 고객이면 고르세요" + 고객별 행동 버튼 |
| TargetCard (요약/펼침) | S-04 | 고객 · 차량 · 도래/임박 수 · 예약 행동 · 펼치기(근거 줄 = target-route-row) |
| ContactPanel | S-04 | 선택 없음 / 선택(연락처 복사·차량·예약·안내 항목·안내문·행동 2개) |
| 목록 툴바 · 쪽 나누기 | S-05 | 검색(지우기 버튼) · 안내 · 초기화 / "n명 중 a–b" + ck-pagination |
| VehicleSummary | S-07 | 차량번호 30px · 사양 · 고객 · 상태 수 칩 · 빈 정보 안내 · 작은 그림 |
| VisitItem | S-07 | 방문일 · 주행거리 · 출처 꼬리표 · 구분 색 칩(교체 파랑·점검 청록·외부 회색·거절 주황) · 메모 |

## STEP 05 추가 컴포넌트

| 컴포넌트 | 쓰는 곳 | 요점 |
|---|---|---|
| VisitVehicleCard | S-08 | 차량 · 최근 주행거리 · 관련 예약(상태 + "따로 저장") |
| ItemStatusPreview | S-08 | 상태 칩(최신/불러오는 중/불러오지 못함) · 6칸 카드(마지막·다음·도래 근거) · 실패 안내. 이전 결과를 흐리게 두고 덮어씀(자리 이동 없음) |
| MaintenanceRecordRow | S-08 | 구분 세그먼트(라디오 그룹) + 구분별 조건부 칸(record-cond) |
| RecordFooter | S-08 | 아래 고정: 기록 요약 · 취소 · [n건 저장] |
| LeaveDialog | S-08 (앱 공통 가드) | 확인 대화상자 틀 재사용, 위험 쪽 [나가기] |
| VisitHistoryItem | S-07 | 방문 머리 + 기록 줄(칩 · 메모 · 수정됨 · [수정] + 이유 툴팁) |
| RecordEditModal (M-03) · RecordRevisionsModal | S-07 | FormModal 틀. 이력은 "필드 전 → 후" 줄 목록 |

## STEP 06 추가 컴포넌트·규칙

| 컴포넌트·규칙 | 쓰는 곳 | 요점 |
|---|---|---|
| useDialogA11y | 모든 모달·확인창 | 첫 칸(또는 `data-autofocus`) 초점 · Tab 갇힘 · Esc 닫기(위 모달만) · 닫히면 연 요소로 초점 |
| ErrorToast | 앱 공통(쓰기 요청 실패) | role=alert, 원인별 제목·안내, 닫기 버튼으로만 닫힘 |
| LoadError | 목록·상세 조회 실패 | 원인별 문구(연결 실패·시간 초과·그 밖) + [다시 불러오기] |
| NotFoundPage | 404 | 마스코트 + "찾을 수 없습니다." + 뒤로·홈으로 |
| PanelEmpty | 홈 패널 | 고른 예약 없음/예약 0건 |
| TopBar | 1024px 미만 | 로고·정비소·이름·로그아웃 + 위쪽 탭(48px) |
| 반응형 단계 | 전체 | ≥1440 기본 / 1280~1439 사이드바 접힘 / 1024~1279 패널 300 / <1024 위쪽 탭·덮는 패널·한 열·44px |
| 초점 링 | 전체 | `:focus-visible` 3px 브랜드 55% + 2px 간격 |

### 공통 상태 8종 ↔ 화면 (STEP 06)

| 상태 | 표현 | 예시 아트보드 |
|---|---|---|
| Initial | 기본값·빈 칸(입력 전) | Modal-Register, Visit-Record |
| Loading | Skeleton(자리 크기 유지) | Home-Loading, Customer-List-Loading, Customer-Detail-Loading, Visit-Record-PreviewLoading |
| Success | 성공 토스트(2.5초) + 결과 화면 | Home-Toast-Reservation, Vehicle-Toast-Saved, Customer-Detail-VehicleAdded |
| Empty | 문구 + 다음 행동 버튼 | Home-Week-NoReservations, Reinspection-NoTargets, Customer-List-NoCustomers, Customer-List-Empty, Customer-Detail-NoVehicles, Vehicle-Detail-MissingInfo(이력 없음), Reinspection-Empty(필터) |
| Error | 조회: LoadError / 쓰기: 폼 안 안내 또는 ErrorToast / 404 페이지 | Home-Error, Customer-List-NetworkError, Reinspection-Timeout, Home-ErrorToast-*, Modal-Create-SaveFailed, Vehicle-NotFound |
| Refreshing | refresh-pill(이전 내용 유지) | Home-Refreshing |
| Submitting | 버튼 비활성 + 스피너 + "저장 중"/"로그인 중" | Modal-Create-Submitting, Modal-Register-Submitting, Visit-Record-Submitting, Login-Submitting |
| Disabled | 비활성 + 이유(툴팁·도움말) | Modal-Create-SlotTaken, Vehicle-Detail-MechanicView, Home-Dialog-Correct-Mechanic |

## STEP 07 — Props · 상태 · 파일 (C02, 설계안)

원칙: 공통 UI(`shared/ui`)는 도메인 타입을 모르고 props로만 받는다. 도메인 컴포넌트는 그 feature의 `types.ts`(08 그대로)를 받는다. **API는 pages(또는 그 feature의 훅)가 부르고**, 컴포넌트는 데이터·콜백만 받는다(예외: 모달 안에서만 쓰는 검색·저장은 모달이 그 feature `api.ts`를 직접 부름). 파일·소유는 FRONTEND_STRUCTURE 8·9장, 경계는 STARTER 08.

### 공통 (shared/ui)

| 컴포넌트 | Props | 내부 상태 | 이벤트 | 변형 | 사용 |
|---|---|---|---|---|---|
| `Button` (있음) | `variant` primary·secondary·ghost·danger, `size` sm·md·lg, `loading`, `disabled`, `onClick` | submitGuard 잠금 | `onClick` 한 번만 | 아이콘 앞/뒤 | 전체 |
| `Modal` | `open`, `title`, `subtitle?`, `size` md(560)·lg(640), `stacked?`, `onClose`, `footer`, `children`, `initialFocus?` | 없음(초점은 내부 훅) | `onClose`(Esc·닫기·바깥) | 좁은 화면 전체 폭 | M-01·M-02·M-03·차량 추가·수정·이력 |
| `ConfirmDialog` | `title`, `target`(대상 요약 노드), `description`, `confirmLabel`, `danger?`, `busy?`, `children?`(입력 칸), `onConfirm`, `onCancel` | 없음 | 위와 같음, 기본 초점 = 취소 쪽 | 위험/일반 | 취소·노쇼·방문 접수·정정·이탈 |
| `FormField` | `id`, `label`, `required?`, `hint?`, `error?`, `warn?`, `suffix?`, `children`(input) | 없음 | — | 일반·오류·경고·비활성 | 모든 폼 |
| `EmptyState` | `illustration?`, `title`(09 5장 문구), `description?`, `action?{label,onClick}` | 없음 | `action.onClick` | compact | 7곳 |
| `ErrorNotice` | `error`(ApiError) 또는 `title/body`, `onRetry?`, `tone` error·warn·info | 없음 | `onRetry`(사람이 누를 때만) | 조회 실패·저장 실패·409 | 전체 |
| `Toast` | `kind` success·error, `title`, `body?`, `onClose` | 성공만 2.5초 타이머 | `onClose` | — | ToastHost |
| `Skeleton` · `RefreshIndicator` | `shape`/`rows` · `label` | 없음 | — | — | 목록·카드·홈 |
| `StatusBadge` (있음) | `status` UNKNOWN·AHEAD·SOON·DUE | 없음 | — | 글자+색 항상 함께 | ItemStatusList 등 |
| `ItemStatusList` | `variant` summary·target·table·preview, `items`(10/14/17 `items` 모양을 props로 펼친 값), `highlightIds?`, `loading?` | 없음 | — | 4모양 | 패널·S-04·S-07·S-08 |

### 도메인 (features)

| 컴포넌트 · 파일 | Props | 내부 상태 | 이벤트 | API 책임 | 소유 이슈(추천) |
|---|---|---|---|---|---|
| `LoginForm` · auth | `notice?`('expired'·'logout'), `onSuccess` | 아이디·비밀번호·보기·칸 오류·요청 중·실패 | `onSuccess(staff)` | 01 (직접) | #16 |
| `SummaryCards` · home | `home`(04) | 없음 | `onOpenToday`, `onOpenTargets` | — (page가 04) | #28 |
| `WeekCalendar` · home | `from`, `items`(15), `mineOnly`, `selectedId?`, `now` | 없음 | `onSelect(id)`, `onCreateAt(date,time)`, `onOpenVehicle(id)` | — | #36 |
| `MonthGrid` · home | `month`, `summary`(42), `selectedDate` | 없음 | `onSelectDate`, `onMonthChange` | — | #30 |
| `ReservationPanel` · reservation | `panel`(17), `role`, `onAction(kind)`, `onOpenVehicle`, `onOpenVisit`, `onEdit`, `notice?`(409) | 이력 펼침 | 위 | 41(펼칠 때 직접) | #26·#31·#33 |
| `PanelActions` · reservation | `status`, `needsAction`, `isPastDate`, `role` | 없음 | `onAction('start'·'complete'·'edit'·'cancel'·'noshow'·'correct')` | — | #26·#31·#33 |
| `ReservationFormModal` · reservation | `mode` create·edit, `defaults?{vehicleId,date,time,itemIds}`, `reservation?`(17, 변경), `items`(13), `vehiclePicker`(slot), `registerModal`(slot), `onDone(reservationId)`, `onOpenExisting(id)`, `onClose` | 입력 전부·요청 중·오류·하위 모달 | 위 | 16·19·15(그 날)·36 (직접) | #25·#37 |
| `TimeSlotPicker` · reservation | `value`, `takenSlots[{time,label}]`, `onChange` | 없음 | `onChange(time)` | — | #25 |
| `TargetCard` · target | `target`(14 item), `expanded`, `selected` | 없음 | `onSelect`, `onToggle`, `onReserve(vehicleId,itemIds)`, `onOpenReservation(id)`, `onOpenVehicle` | — | #27 |
| `CustomerVehicleFormModal` (M-01) · customer | `initialQuery?`, `context` list·reservation, `stacked?`, `onCreated({customerId,vehicleId})`, `onPick({kind,customerId,vehicleId?})`, `onClose` | 입력·중복 결과·칸 오류·요청 중·실패 | 위 | 05(중복)·06 (직접) | #19 |
| `CustomerFields` · `VehicleFields` · customer | `value`, `errors`, `warns?`, `editing?`, `onChange`, `onBlur(field)` | 없음 | 위 | — | #19 |
| `AddVehicle(Modal/Inline)` · customer | `customer`(07), `onAdded(vehicleId)`, `onClose` | 입력·요청 | 위 | 08 (직접) | #21 |
| `CustomerEditModal` · `VehicleEditModal` · customer | `customerId`/`vehicleId`, `onSaved`, `onClose` | 기존값·version·409 안내 | 위 | 07/09 + 22/23 (직접) | #32 |
| `VisitPreview` · maintenance | `vehicleId`, `mileage` | 요청 번호·결과·상태(loading·ready·error) | — | 10 (직접, 0.5초·최신만) | #35 |
| `ItemRecordRows` · maintenance | `items`(13), `statuses?`(10), `value`, `errors`, `stage` core·full | 없음 | `onChange(code, patch)` | — | #23·#29 |
| `VisitHistory` · maintenance | `visits`(11), `canEdit(record)`, `justSavedKey?` | 없음 | `onEdit(recordId)`, `onShowRevisions(recordId)`, `onMore` | — (page가 11) | #22·#34 |
| `RecordEditModal` (M-03) · `RecordRevisionsModal` · maintenance | `record`, `staff`(36), `onSaved`, `onClose` / `recordId` | 입력·version·409 | 위 | 37 / 38 (직접) | #34 |

### 페이지 전용 (pages)

| 컴포넌트 | 위치 | 이유 |
|---|---|---|
| `ContactPanel` | `pages/S04` | target(14)+customer(09) 조합 (Q5) |
| `Pagination` | `pages/S05` | 한 화면만 씀 → 두 번째 사용 때 shared |
| `RecordFooter` · 이탈 확인 | `pages/S08` | S-08 전용 |

## STEP 09 — 설계 가이드 컴포넌트 이름 ↔ 이 문서 (대응표)

설계 가이드 목록에 있다고 새로 만들지 않는다. 기준: frontend 현재 파일(`bf2ab08`)과 #18 범위(Modal·FormField·EmptyState·ErrorNotice·ItemStatusList).

| 가이드 이름 | 이 문서 · 저장소 | 판단 |
|---|---|---|
| AppLayout · Sidebar · AppHeader | `shared/ui/Layout.jsx`(있음) → #17 AppLayout·AppMenu | 재사용·확장(#17) |
| PageHeader | 각 페이지 머리(제목·보조 문구·주요 버튼) | 페이지 안 마크업으로 충분. 3곳 이상 같아지면 #18 후속 |
| Breadcrumb | 없음 | **만들지 않음** — 09에 경로 표시 없음, 뒤로 가기·메뉴로 충분 |
| Button · IconButton | `Button.jsx`(있음) · IconButton | 재사용 · 추가 |
| FormField · SearchInput · Select · DatePicker | `FormField`(#18) + 기본 `input`/`select`/`input[type=date]` | 별도 DatePicker·라이브러리 없음 |
| StatusBadge | `StatusBadge.jsx`(있음) | 정비 주기 4종 전용. 예약 상태 칩과 합치지 않음 |
| Modal · ConfirmDialog · SidePanel | `Modal`(#18) · `ConfirmDialog`(Q6 제안) · 예약 패널은 `ReservationPanel` | SidePanel 공통화 안 함(패널 1종) |
| EmptyState · LoadingState · ErrorNotice · Toast | `EmptyState`·`ErrorNotice`(#18) · `Skeleton`·`RefreshIndicator`·`Toast`(Q6 제안) | |
| Pagination | `pages/S05` 전용 | 두 번째 사용 때 shared |
| ItemStatusList | `ItemStatusList`(#18) | 재사용 |
| VehicleSummary | S-07 머리 카드 · S-08 `VisitVehicleCard` | 페이지 전용 |
| VehicleForm · CustomerForm | `VehicleFields` · `CustomerFields` | M-01·차량 추가·수정 모달이 공유 |
| CustomerSearch | M-02 차량 검색(05) · S-05 검색칸 | 페이지/모달 안. 공통 컴포넌트 아님 |
| ReservationPanel · ReservationModal | `ReservationPanel` · `ReservationFormModal`(M-02) | |
| ReservationSchedule · ReservationCard | `WeekCalendar`·`MonthGrid`(카드 포함) | 캘린더 안 카드는 따로 파일로 빼지 않음 |
| MaintenanceRecordForm · MaintenanceHistory | `ItemRecordRows`+`pages/S08` · `VisitHistory` | |
| TargetCard · ContactPreparationPanel | `TargetCard` · `ContactPanel`(`pages/S04`, Q5) | |

렌더링·유지보수 검토(설계 수준, 성능 측정 없음): 서버 데이터는 페이지가 소유하고 props로 내린다(전역 저장소 없음). 같은 데이터를 두 곳에 저장하지 않는다(목록 쿼리 = URL, 선택 = URL 또는 페이지 상태). `memo`·`useMemo`는 기본으로 쓰지 않고 측정 후 필요한 곳만. 예약 상태별 버튼 분기는 `PanelActions` 한 곳에 모은다.

## STEP 09 — 반복 구조 통합 (구현 기준, 디자인 변경 없음)

프로토타입(`prototype-src/src/App.tsx`)은 디자인 확인용이라 같은 구조가 여러 번 들어 있다. 구현은 아래처럼 **하나로** 만든다. 프로토타입 코드는 고치지 않았다(아트보드와 픽셀 대조 근거를 유지하기 위해).

| 프로토타입에서 반복된 것 | 구현 단위 (하나) | Variant · State 축 | 아트보드 근거 (SCREEN_SPEC 4·8장) |
|---|---|---|---|
| `ReservationModal`의 자체 backdrop + `FormModal` | `Modal`(#18) 하나. M-02도 같은 셸 | `size` md·lg, `stacked` | Modal-Create*, Modal-Register*, A11y-Modal-KeyboardFocus |
| `LeaveDialog` + `PanelDialog`(같은 `panel-confirm-backdrop`, `correct`까지 4종) | `ConfirmDialog` 하나. 단 `correct`(상태·메모·사유 입력)는 폼이라 `Modal` + `FormField`로 분리 | `kind` start·cancel·noShow·leave, `danger`, `busy`. start만 연식·주행거리 칸 조건부 | Home-Dialog-Start(-MissingInfo), Home-Confirm-*, Visit-Record-LeaveConfirm |
| `PanelEmpty`·`ReservationEmptyState`·`VehicleHistoryEmpty`·목록 빈 상태 | `EmptyState` 하나 | `illustration`, `title`, `action` | *-Empty, *-NoCustomers, *-NoTargets, *-NoVehicles, Home-Month-EmptyDay, Home-Week-NoReservations |
| `HomeLoading`·`ListSkeleton` | `Skeleton` 하나 | `shape`, `rows` | Home-Loading, Customer-List-Loading, Customer-Detail-Loading |
| `HomeError`·`LoadError`·`NotFoundPage`·시간 초과 | `ErrorNotice` 하나(문구는 `ApiError.code`) | `tone` error·warn·info, `onRetry` | *-Error, *-NetworkError, Reinspection-Timeout, Vehicle-NotFound |
| 409 안내 6곳 | `ErrorNotice` warn + 화면이 최신 값 다시 조회 | 코드별 문구 | Home-Panel-Conflict409, Modal-*-409* |
| `SuccessToast`·`ErrorToast` | `Toast` 하나 + `ToastHost`(Q6) | `kind` success(2.5초)·error(자동 닫힘 없음) | Home-Toast-Reservation, Home-ErrorToast-*, Vehicle-Toast-Saved |
| `SubmitButton`·각 화면 저장 중 | `Button loading` | — | *-Submitting |
| `Sidebar`·`TopBar` | `AppMenu` 하나(#17) | 폭: 펼침·접힘(≥1024)·위쪽 탭(<1024) | Home-Week-SidebarCollapsed, RWD-* |
| `Calendar`(주)·`MonthGrid`·`DateListPanel` | `WeekCalendar`·`MonthGrid`(home) | `view` week·month | Home-Week*, Home-Month* |
| 예약 패널 상태별 버튼 | `PanelActions` 하나 | `status` 5종 × `role` | Home-Week(-Reservation2·4), Home-Panel-* |

합치지 않는 것: 예약 상태 칩(`StatusChip`, 예약 5종)과 정비 주기 `StatusBadge`(4종) — 의미가 다르다(B03). `CustomerFields`·`VehicleFields`는 이미 하나로 M-01·차량 추가·수정 모달이 공유한다.

## STEP 09-C — v3.0 (P0·P1) 컴포넌트 ↔ 프로토타입 소스 대응 (2026-11-25)

기준 소스: v3.0 프로토타입 `.step09-work/b-source/src`(STEP 09-B에서 54개 모듈로 나눔, 디자인 차이 0). 아래 "설계 이름"은 이 문서 STEP 07 표의 이름이고, 구현은 설계 이름·경로를 따른다. 프로토타입 이름은 대조용이다.

### 디자인 시스템 (변경 없음)

토큰(§1 `--ck-*`)·색·타이포·간격·라운드·마스코트·로고는 v2.0 그대로다(새 색 없음, A 보고서 5장). P1에서 늘어난 시각 요소는 `ck-switch`(켜기·끄기, S-09 항목 기준표·알림), `ck-tabs`(설정 탭 4, 재점검 필터와 같은 모양), 비활성 꼬리표(`inactive`, 회색 글자 + "비활성")뿐이다. STEP 09-B에서 쓰지 않는 CSS 선택자 146개를 지웠고 토큰은 건드리지 않았다.

### P0 — 설계 이름 ↔ v3 소스

| 설계 이름 (STEP 07) | v3 소스 | 비고 |
|---|---|---|
| `Modal` | `shared/ui/Modal.tsx` `FormModal` (+ `ReservationModal` 자체 셸) | 구현은 하나(STEP 09 반복 구조 통합) |
| `ConfirmDialog` | `shared/ui/Modal.tsx` `ConfirmDialog` (P0 패널 `PanelDialog`·`app/LeaveDialog`는 별도 마크업) | v3에서 공통 하나가 생겼다. P0 확인창도 구현 때 이것으로 통합(STEP 09 표 그대로) |
| `FormField` | `shared/ui/FormField.tsx` `TextField` | |
| `EmptyState` | `shared/ui/EmptyState.tsx` `ReservationEmptyState`·`VehicleHistoryEmpty`, `features/reservation/PanelEmpty.tsx` | 구현은 `EmptyState` 하나 |
| `ErrorNotice` | `shared/ui/Feedback.tsx` `LoadError`·`SaveFailNotice`, `features/home/HomeStates.tsx` `HomeError`, `app/NotFoundPage.tsx` | 구현은 하나 |
| `Toast` · `ToastHost` | `shared/ui/Feedback.tsx` `SuccessToast`·`ErrorToast` (App이 표시) | |
| `Skeleton` | `shared/ui/Feedback.tsx` `ListSkeleton`, `HomeStates.tsx` `HomeLoading` | |
| `StatusBadge` · 예약 상태 칩 | `shared/ui/StatusBadge.tsx` `CycleBadge`(주기 4종) · `StatusChip`(예약 5종) | 합치지 않음(B03) |
| `AppMenu` | `app/AppMenu.tsx` `Sidebar`·`TopBar` | |
| `LoginForm` | `pages/S01-Login/LoginPage.tsx` | |
| `SummaryCards` | `pages/S02-Home/HomePage.tsx` 요약 줄 | 페이지 안 마크업 |
| `WeekCalendar` · `MonthGrid` | `features/home/Calendar.tsx` `Calendar`·`MonthGrid` | |
| `ReservationPanel` · `PanelActions` | `features/reservation/DetailPanel.tsx` `DetailPanel`·`PanelDialog`·`HistoryBand` · `DateListPanel.tsx` | |
| `ReservationFormModal` · `TimeSlotPicker` | `features/reservation/ReservationModal.tsx` (`GRID_TIMES`) | |
| `TargetCard` · `ContactPanel` | `pages/S04-Reinspection/ReinspectionPage.tsx` `ReinspectionView` · `ContactPanel.tsx` | |
| `CustomerVehicleFormModal` (M-01) | `features/customer/CustomerRegisterModal.tsx` | |
| `CustomerFields` · `VehicleFields` | `features/customer/fields.tsx` | |
| `AddVehicleModal` · `CustomerEditModal` · `VehicleEditModal` | `features/customer/*.tsx` 같은 이름 | |
| `VisitPreview` · `ItemRecordRows` · `RecordFooter` | `pages/S08-VisitRecord/VisitRecordPage.tsx` 안 | 구현 때 나눔 |
| `VisitHistory` | `pages/S07-VehicleDetail/VehicleDetailPage.tsx` 안 | |
| `RecordEditModal` (M-03) · `RecordRevisionsModal` | `features/maintenance/*.tsx` | |

### P1 — 새 컴포넌트 (최소, A 보고서 5장)

| 컴포넌트 (v3 소스) | Props (프로토타입) | 화면 | 기능 | 공용 범위 | 설계 위치 제안 |
|---|---|---|---|---|---|
| `ConfirmDialog` (`shared/ui/Modal.tsx`) | `id, title, target, desc, confirmLabel, danger?, busy?, error?, onConfirm, onCancel, children?` | S-04 연락 거부, S-06·S-07 비활성화·삭제, S-09 정비사 비활성화·익명화, S-10 정지 | 공통 | **P0·P1 공용** | `shared/ui/ConfirmDialog` (#18 후속, Q6) |
| `PasswordField` (`shared/ui/FormField.tsx`) | `id, label, value, onChange, onBlur?, error?, help?, autoComplete?` | S-01 단계, S-09 정비사 추가·재발급, S-10 개설·재발급 | F-AUTH-03·F-STF-01·F-ADM-01 | P1 공용 (S-01 보기 토글과 같은 모양) | `shared/ui/FormField` 변형 |
| `LoginSteps` (`features/auth/LoginSteps.tsx`) | `role, onDone, onLogout` | S-01 | F-AUTH-03·04 | — | `features/auth` |
| `CustomerStatsCard` (`features/home/CustomerStatsCard.tsx`) | 없음(내부 기간 상태) | S-02 하단 | F-STAT-01 | — | `features/home` |
| `ContactP1` (`pages/S04-Reinspection/ContactPanel.tsx`) | `customerId, onCopied, onReserve, onExternal` | S-04 연락 준비 | F-CON-01·02 | — | `pages/S04` (ContactPanel 안) |
| `MetricsStrip` (`features/customer/MetricsStrip.tsx`) | `customerId` | S-06 상단 (S-05 줄은 목록 안 칸) | F-CUS-09 | — | `features/customer` |
| `CustomerLifecycle` · `VehicleLifecycle` (`features/customer/Lifecycle.tsx`) | `customerId, name, onChanged, onDeleted` · `vehicleId, plate, onChanged` | S-06 · S-07 | F-CUS-10 (사장만) | 둘이 같은 ConfirmDialog·409 문구 사용 | `features/customer` |
| `VehicleDiagram` (`features/customer/VehicleDiagram.tsx`) | `vehicleId` | S-07 | F-CUS-08 (읽기 전용, 제조사 그림 아님) | — | `features/maintenance` 또는 `customer` 💡 |
| `SettingsPage` + `StaffTab`·`ItemsTab`·`AlertTab`·`RetentionTab` (`pages/S09-Settings/*`) | `onChanged, initialTab?` / `onChanged` | S-09 | F-STF-01·F-ITEM-01·F-NTF-01·F-CUS-11 | — | `pages/S09` (+ feature 💡) |
| `StaffAddModal` (`pages/S09-Settings/StaffTab.tsx`) | `onClose, onDone` | S-09 | F-STF-01 | — | `pages/S09` |
| `ResetPasswordModal` · `TempPasswordNotice` (`features/account/ResetPasswordModal.tsx`) | `title, who, onClose, submit, onDone` | S-09 정비사 · S-10 사장 | F-STF-01·F-ADM-02 | **S-09·S-10 공용** | `shared/ui` 또는 `features/staff` 💡 |
| `AdminPage` · `ShopCreateModal` (`pages/S10-Admin/AdminPage.tsx`) | `onLogout` · `onClose, onDone` | S-10 | F-ADM-01·02 | — | `pages/S10` + `app/AdminLayout` 💡 |

### P0·P1이 함께 쓰는 것 (v3 소스에서 import로 확인)

`FormModal`(사용 9곳) · `ConfirmDialog`(제품 화면 6곳: S-04·S-06/S-07·S-09 2·S-10) · `TextField`·`PasswordField`·`SubmitButton` · `SaveFailNotice` · `LoadError` · `CycleBadge` · `PageHeader` · `Icon` · `useFieldForm`·`useDialogA11y`. P1 화면은 P0 공통 컴포넌트를 그대로 쓰고, 공통에 새로 더한 것은 `ConfirmDialog`·`PasswordField` 두 개뿐이다.

### 합치지 않은 것 (v3 확인)

- `PanelDialog`(P0 패널 행동)·`LeaveDialog`(이탈)와 `ConfirmDialog`: 프로토타입은 마크업이 달라 따로 두었다. 지금 합치면 화면이 달라진다. 구현 때 STEP 09 표대로 `ConfirmDialog` 하나로 만들고, 정정은 `Modal`+`FormField`로 한다.
- 예약 상태 칩과 주기 `StatusBadge`: 위와 같은 이유로 합치지 않는다(B03).
