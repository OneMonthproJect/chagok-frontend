# PAGE_API_MAPPING — 화면별 API 호출 명세 (STEP 07 · C04 · 09-C P1 추가)

> **상태: 설계안(미확정).** 계약의 기준은 chagok-docs 08(develop `ac0705b`, STEP 09-C에서 `42c75df`로 다시 확인 — 그 사이 08 변경 없음)이다. **STEP 09-E(2026-11-25)에서 develop `e57b2be`로 다시 확인**: 그 사이 08 변경은 #111(API 15 응답 예시·16 오류 문구·19 검증 순서)뿐이며 반영 내용은 **5-E장**. P1(24~35·43~52)은 **5장**(STEP 09-C). 이 문서는 08을 복사하지 않고 **어느 화면이 언제 어떤 API를 부르고, 성공·실패·갱신을 어떻게 다루는지**만 적는다. 요청·응답 필드의 정확한 모양은 08 각 절과 `features/*/types.ts`(08 글자 그대로)를 따른다.
> 36~42(P0-나머지)는 08 7.1 요약까지만 확정이고 상세 JSON은 각 착수 PR에서 정한다(08 7.0). 아래 해당 칸은 "요약 기준"으로 표시했다.
> 공통: 모든 요청은 `features/<도메인>/api.ts` → `shared/api/client.ts` 한 곳. 401 → 토큰 삭제·`/login`(`reason=expired`, `from`), 403·404·500·네트워크 → 08 0.2 표대로. 쓰기는 자동 재시도 없음, `submitGuard`로 중복 요청 방지.

## 1. 화면 × API 한눈에

| 화면 | 진입 때 | 사용자 행동 때 | 쓰기 |
|---|---|---|---|
| S-01 | — | — | 01(사장·정비사) / 02(서비스 관리자, 화면 진입 방식은 5-6 B8) → 03 → (P1) 24 비밀번호 변경 · 52 약관 동의 |
| AppLayout | 03 (한 번) | — | — |
| S-02 홈 | 04 · 15(보는 기간) · 42(월 보기) · 17(`?reservation=`) · (P1) 30 고객 집계 | 15·42(기간·보기·담당 바꿀 때) · 17(카드 선택) · 41(이력 펼침) | 18 · 20 · 21 · 39 · 40 |
| M-02 | 13 · 36 · 15(그 날짜, 담당 중복 미리 표시) · (변경) 17 | 05(차량 검색) | 16 · 19 |
| M-01 | — | 05(같은 연락처·차량번호 확인) | 06 · (기존 고객 선택 시) 08 |
| S-04 | 14 | 09(연락 준비 패널, 고른 차량만 💡) · (P1) 28 문자 초안 | (M-02) 16 · (P1) 29 연락 결과 · 22 동의 해제(연락 거부 뒤 확인) |
| S-05 | 05(`q`·`page`, P1 `includeInactive`·지표) | 05(검색·쪽·비활성 포함) | (M-01) 06 |
| S-06 | 07 | — | 08 · 22 · (P1, 사장) 43 비활성화 · 44 재활성화 · 45 삭제 |
| S-07 | 09 · 10(주행거리 없이) · 11(page 0) | 11(더 보기) · 38(수정됨) | 23 · 37 · (M-02) 16 · (P1, 사장) 46 차량 비활성화 · 47 재활성화 |
| S-08 | 09 · 13 · 36 · 10(주행거리 없이) · (예약에서 오면) 17 💡 | 10(주행거리 입력 멈춘 뒤 0.5초) | 12 |
| S-09 (P1, 사장) | 25 정비사 목록 · 13 항목 · 48 보관 대상 | 탭 전환 | 26 정비사 추가 · 50 비활성화 · 51 재발급 · 27 항목 기준 · 49 익명화 (아침 알림 = API 없음) |
| S-10 (P1, 관리자) | 31 정비소 목록 | — | 32 개설 · 33 정지 · 34 재개 · 35 사장 비밀번호 재발급 |

## 2. API별 상세

| API | 메서드 · 경로 | 호출 화면 · 주체(파일) | 시점 | path · query · body (요점) | 응답 주요 필드 (화면에서 쓰는 것) | 성공 | 실패 처리 | 로딩 표현 | 성공 뒤 갱신 | 선행 · 단계 · 이슈 |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | POST `/api/auth/login` | S-01 · `features/auth/api.ts` | 로그인 버튼·Enter | `{ loginId, password }` | 토큰, `staff` | 토큰 저장 → `from` 또는 `/` | 401 `LOGIN_FAILED` → 공통 문구(입력 유지), 네트워크 → 연결 실패 문구 | 버튼 "로그인 중" | 03 | 핵심 · FE #16 |
| 03 | GET `/api/me` | AppLayout · `features/auth/useMe` | 앱 진입 한 번 | — | `staffId·name·role·shopName` | 머리 표시, 역할로 화면 권한 표시 | 401 → 로그인 | 머리 자리 Skeleton | — | 핵심 · #17 |
| 04 | GET `/api/home` | S-02 · `features/home/api.ts` | 진입 · 예약 쓰기 뒤 | — | `todayReservationCount`(취소 제외) · `todayContactCount` · `todayReservations`(P0-핵심 목록) | 요약 카드 | 조회 실패 카드 | 카드 Skeleton | — | 핵심 · #28 |
| 05 | GET `/api/customers?q=&page=&size=` | S-05 · M-01(중복 확인) · M-02(차량 검색 VehiclePicker) · `features/customer/api.ts` | 검색어 멈춘 뒤 0.3초 · 쪽 이동 · M-01 연락처/차량번호 칸 벗어날 때 | `q`(이름·연락처·차량번호 일부), `page`(0~), `size` 기본 20(최대 50) | `items[{customerId,name,phone(마스킹),consent,vehicles[{vehicleId,plateNumber}]}]`, `totalElements`, `totalPages` | 목록·쪽·건수 | 조회 실패 카드(원인별) | 목록 Skeleton · 검색 중 | — | 핵심 · #19 |
| 06 | POST `/api/customers` | M-01 | 등록 | `{ name, phone, consent, vehicle{plateNumber, model, modelYear?, mileage?} }` | `customerId`, `vehicleId` | 목록에서: S-06 이동(새 차량 표시) / M-02에서: 차량 채움 | 400 칸 오류(`vehicle.` 접두), 500·네트워크 → 입력 유지·다시 시도 | 버튼 "저장 중" | S-05 05 | 핵심 · #19 |
| 07 | GET `/api/customers/{customerId}` | S-06 · AddVehicle(보유 차량) · 고객 수정(기존값) | 진입 · 08·22 성공 뒤 | — | `name·phone(전체)·consent`, `vehicles[{vehicleId,plateNumber,model,modelYear,latestMileage,dueCount,soonCount}]` | 화면 | 404 페이지 · 조회 실패 카드 | 카드 Skeleton | — | 핵심 · #20 · backend #43(Q14) |
| 08 | POST `/api/customers/{customerId}/vehicles` | 차량 추가 · `features/customer` | 추가 | `{ plateNumber, model, modelYear?, mileage? }` | `vehicleId` | S-06 목록에 "방금 추가" / M-02 차량 채움 | 400 칸 · 404 · 500 | "저장 중" | 07 | 핵심 · #21 |
| 09 | GET `/api/vehicles/{vehicleId}` | S-07 · S-08 · S-04 연락 준비 · 차량 수정 | 진입 · 23·12·37 뒤 | — | `plateNumber·model·modelYear·latestMileage`, `customer{customerId,name,phone(전체),consent}` | 화면 | 404 페이지 | Skeleton | — | 핵심 · #22 |
| 10 | GET `/api/vehicles/{vehicleId}/item-status?mileage=` | S-07(없이) · S-08 미리보기(있게) · `features/maintenance` | S-07 진입 · S-08 주행거리 멈춘 뒤 0.5초 | `mileage` 정수 0~2,000,000 | `asOf`, `inputMileage`, `items[{name,status,dueReason,baseRecord,nextDueDate,nextDueMileage,lastDecline,lastCaution}]` | **그대로 표시, 화면 계산 금지** | 미리보기: "불러오지 못함 · 저장에는 영향 없음" + 다시 불러오기 / S-07: 조회 실패 | 미리보기: 이전 결과 흐리게 + "불러오는 중"(마지막 요청만 반영) | — | 핵심 · #22 · #35 |
| 11 | GET `/api/vehicles/{vehicleId}/visits?page=&size=` | S-07 · `VisitHistory` | 진입 · 더 보기 · 12·37 뒤 | `page`, `size` | `items[{visitKey,visitDate,mileage,staffName,records[{recordId,itemName,type,date,memo, (나머지) source,inspectResult,version,edited,staff}]}]` | 방문 묶음 | 조회 실패 카드 | Skeleton | — | 핵심 · #22 · #34 |
| 12 | POST `/api/vehicles/{vehicleId}/visits` | S-08 | 저장 | `{ visitDate, mileage?, vehicle{modelYear}?(빈 차량), (나머지) mechanicId, records[{itemId,type,memo,(나머지) externalDate,externalMileage,inspectResult}] }` | `visitKey`, `savedCount` | S-07로 이동 + "방금 저장한 결과" | 400 → `records[i].필드`를 해당 줄 칸으로, 첫 오류 칸 초점 / 500·네트워크 → 입력 유지 + "예약 방문 완료는 이미 저장, 기록만 실패" 구분 | "n건 저장" → "저장 중" | 이동한 S-07이 09·10·11 | 핵심(교체·점검) · 나머지(외부·거절·결과·담당) · #23 · #29 · backend #42 |
| 13 | GET `/api/items` | M-02(예약 목적) · S-08(항목 줄) — `features/maintenance` 소유, pages가 props로 | 화면 진입 한 번 | — | `[{itemId,code,name,cycleMonths,cycleKm,active,sortOrder}]` | 항목 이름·순서 | 실패 시 화면 조회 실패 | — | — | 핵심 · STARTER Q3 |
| 14 | GET `/api/targets` | S-04 · `features/target` | 진입 | — | `asOf`, `items[{customerId,customerName,phone(마스킹),vehicleId,plateNumber,targetItems[{name,status,nextDueDate,baseDate,(나머지) lastDecline,lastCaution}],activeReservation}]` | 카드. **나누기·정렬·건수는 받은 목록에서만** | 조회 실패(시간 초과 포함) 카드 | Skeleton | — | 핵심 · #27 |
| 15 | GET `/api/reservations?from=&to=&assigneeId=` | S-02 캘린더·날짜 목록 · M-02(그 날 같은 담당 미리 비활성) | 진입 · 기간·보기·"내 담당만" 바꿀 때 · 예약 쓰기 뒤 | 최대 42일, `assigneeId`(나머지) | `items[{reservationId,reservedAt,status,needsAction,version,vehicleId,plateNumber,customerName,phone,purposeSummary,assignee}]` | 카드·목록 | 400(기간) · 조회 실패 | 캘린더 Skeleton / 다시 부를 때 Refreshing | — | 핵심(목록) · 나머지(캘린더) · #24 · #36 |
| 16 | POST `/api/reservations` | M-02 | 등록 | `{ vehicleId, reservedAt, purpose{itemIds,other,memo}, (나머지) assigneeId }` | `reservationId`·`status`·`reservedAt`·`vehicleId`·`version`(08 16 예시. `assignee`는 P0-나머지부터) | 패널 열기 + 토스트 | 409 `RESERVATION_ACTIVE_EXISTS`(기존 예약 보기) · `MECHANIC_SLOT_CONFLICT`(겹친 예약 보기, 시각·담당 다시) · 400(`RESERVATION_PAST_DATE` 포함) 칸 · 500 → 모두 입력 유지 | "저장 중" | 15 · 42 · 04 · 17 | 핵심 · #25 · #37 |
| 17 | GET `/api/reservations/{reservationId}/panel` | S-02 패널 · M-02 변경(기존값) | `?reservation=` 바뀔 때 · 패널 쓰기 뒤 · 409 뒤 | — | `reservation{status,needsAction,version,purpose,assignee}`, `customer(전체 연락처)`, `vehicle`, `recentVisits(최대 2)`, `totalVisitCount`(3 이상이면 상세 이동), `itemStatuses(sortOrder, highlighted)` | 패널 | 404 → 패널 "찾을 수 없습니다" | 패널 Skeleton | — | 핵심 · #26 |
| 18 | POST `/api/reservations/{reservationId}/complete` | 패널 | [방문 완료] | `{ version }` | `status=COMPLETED`, `vehicleId`, `version` | **성공 때만** S-08(`vehicleId`, `reservationId`) | 409 → 17 다시 + 안내(이동 없음) · 500·네트워크 → 오류 토스트 | 버튼 잠금 | 17 · 15 · 04 | 핵심 · #26 |
| 19 | PATCH `/api/reservations/{reservationId}` | M-02 변경 | 변경 저장 | `{ version, reservedAt?, purpose?, (나머지) assigneeId?, reassignReason? }` | 예약 요약 | 패널 + 토스트 | 409 `CONCURRENT_MODIFICATION`(최신 불러오기) · `ASSIGNEE_CHANGE_CLOSED` · 400 사유 누락. 날짜 규칙·같은 차량 유효 예약(409 `RESERVATION_ACTIVE_EXISTS`)은 **일시(`reservedAt`)를 바꿀 때만** (#111). 지난 날짜 `RESERVED`도 목적·메모 변경 가능 | "저장 중" | 17 · 15 · 42 · 04 | 핵심 · 나머지(재배정) · #25 · #37 |
| 20 · 21 | POST `…/cancel` · `…/no-show` | 패널 확인 대화상자 | 확인 | `{ version }` | 예약 요약 | 패널 갱신 + 토스트 | 409 → 17 다시 · 403·500·네트워크 → 오류 토스트 | 확인 버튼 잠금 | 17 · 15 · 42 · 04 | 나머지 · #31 |
| 22 | PATCH `/api/customers/{customerId}` | 고객 수정 모달 | 저장 | `{ version, name?, phone?, consent? }` | 고객 | 토스트 · 07 | 409 → 07 다시·안내 · 400 칸 | "저장 중" | 07 (동의 해제 시 14·04는 다음 진입) | 나머지 · #32 |
| 23 | PATCH `/api/vehicles/{vehicleId}` | 차량 수정 모달 | 저장 | `{ version, plateNumber?, model?, modelYear?, latestMileage? }` | 차량 | 토스트 | 409 · 400(차종·기존 연식/주행거리 비우기) | "저장 중" | 09 · 10 | 나머지 · #32 |
| 36 | GET `/api/staff/assignees` | M-02 · S-08 · M-03 | 모달·화면 열 때 | — | `items[{staffId,name,role,colorIndex}]` (요약 기준) | 담당 목록 | 실패 시 모달 안 조회 실패 | select 비활성 | — | 나머지 · backend #44 · #37 · #29 |
| 37 | PATCH `/api/records/{recordId}` | M-03 | 저장 | `{ version, recordDate?, mileage?, type?, itemId?, inspectResult?, memo?, mechanicId?, reason? }` (요약 기준) | 기록(`version`+1) | 토스트 · S-07 갱신 | 400(미래·중복·바뀐 것 없음) · 403 `FORBIDDEN`/`EDIT_PERIOD_EXPIRED` · 409 | "저장 중" | 11 · 10 · 09 | 나머지 · #34 |
| 38 | GET `/api/records/{recordId}/revisions` | 수정 이력 모달 | "수정됨" 누를 때 | — | `items[{revisionNo,changedAt,changedBy,reason,changes[{field,before,after}]}]` (요약 기준) | 이력 | 조회 실패 | Skeleton | — | 나머지 · #34 |
| 39 | POST `/api/reservations/{reservationId}/start` | 패널 [방문 접수] 확인 | 확인 | `{ version, modelYear?, mileage? }`(빈 차량이면 필수) (요약 기준) | 패널 모양 예약(`IN_PROGRESS`) | 패널 갱신 | 400 칸(대화상자 안) · 409 | 확인 버튼 잠금 | 17 · 15 · 04 | 나머지 · backend #36 · FE #33 |
| 40 | POST `/api/reservations/{reservationId}/correct` | 패널 [정정] | 정정 저장 | `{ version, status?, purposeMemo?, reason? }` (요약 기준) | 예약 | 패널 + 이력 | 409 `INVALID_STATUS_TRANSITION` · 403(정비사 상태 정정 — 화면이 미리 비활성) · `EDIT_PERIOD_EXPIRED` | 잠금 | 17 · 41 · 15 · 42 · 04 | 나머지 · #33 |
| 41 | GET `/api/reservations/{reservationId}/revisions` | 패널 "예약 변경 이력" | 펼칠 때 | — | `kind`, 변경자, 시각, 사유, 전·후 (요약 기준) | 이력 | 조회 실패 | — | — | 나머지 · #33 |
| 42 | GET `/api/reservations/summary?from=&to=` | S-02 월 보기 | 월 보기 진입·달 이동 | 최대 42일 | `[{date,total,reserved,inProgress,completed,canceled,noShow}]` (요약 기준) | 날짜 칸 건수·처리 필요 | 조회 실패 | 칸 Skeleton | — | 나머지 · #30 · backend #40 |

S-08 진입 때의 17 호출(관련 예약 표시)은 v2.0 디자인이 더한 것이다. 08·09에 정해진 호출이 아니므로, 18 응답만으로 충분하면(`reservationId`·상태) 부르지 않아도 된다 💡.

## 3. 디자인이 요구하지만 08에 없는 것 (보고만, 우회 구현 금지)

| # | 화면 요구 | 08 현황 | 처리 제안 |
|---|---|---|---|
| A1 | S-05 머리 "차량 n대" 합계 | 05에 차량 총수 없음 | 머리는 고객 수만(v2.0 반영 완료). 필요하면 08에 필드 추가 요청 |
| A2 | S-07 외부 기록의 "그때 주행거리" 표시 | 11 `records[]`에 기록별 km 없음(방문 `mileage`만) | 표시 생략 또는 11에 `mileage` 추가 요청 (DESIGN_PROGRESS STEP 05 확인 필요) |
| A3 | S-08 미리보기를 방문일 기준으로 | 10은 오늘 기준만 | 문구로 안내(v2.0 반영). 바꾸려면 08 결정 |
| A4 | S-04 연락 준비의 전체 연락처 | 14는 마스킹, 09는 전체(D-40) | 고른 차량만 09 호출(💡 FRONTEND_STRUCTURE Q5) |
| A5 | 시간 초과 오류 | 08 0.3에 코드 없음 | client.ts에서 `NETWORK_ERROR`와 같은 처리(Q9) |
| A6 | 403 `FORBIDDEN`이 일반 행동(취소 등)에서 날 수 있나 | 06 권한: P0 예약 행동은 사장·정비사 모두 허용 | v2.0 `Home-ErrorToast-Forbidden`은 "서버가 거절한 경우"의 대비 화면일 뿐, 정상 흐름에서 나오지 않는다 |

## 4. 프로토타입 Mock ↔ 08 필드 이름 대조 (구현 때 08을 따른다)

| 프로토타입(v3: `b-source/src/mock/db.ts`·`mock/p1.ts`) | 08 | API |
|---|---|---|
| `todayContactCustomerCount` | `todayContactCount` | 04 |
| `id` (예약) · `date`+`time` | `reservationId` · `reservedAt` | 15·17 |
| `plate` · `model` · `year` · `mileage` | `plateNumber` · `model` · `modelYear` · `latestMileage` | 07·09·17 |
| `customerName`·`phoneMasked` (목록) | `customerName`·`phone`(서버가 마스킹한 값) | 05·14·15 |
| `items`(대상 항목) | `targetItems` | 14 |
| `activeReservation{id,date,time}` | `activeReservation{reservationId,reservedAt}` | 14 |
| `purposeLabels` | `purposeSummary`(15) / `purpose{items,other,memo}`(17) | 15·17 |
| `totalVisits` | `totalVisitCount` | 17 |
| `assignee{id,name,color}` | `assignee{staffId,name,colorIndex}` (색은 화면이 `colorIndex`로 고름) | 15·17 |
| `apiCustomers` → `{items,page,size,totalElements,totalPages}` | 같음 | 05 |
| 로그인 `owner_a`/`1234` | 07 시드 계정 | 01 |

프로토타입의 계산(F-CYC-01 흉내)은 Mock "서버" 안에만 있고 화면에는 없다. 저장소 Mock(`features/*/mocks/*.json`)은 07 7장 시드 + 08 예시 값으로 새로 만든다(CONVENTIONS 7장).

## 5. P0·P1 통합 API 검증 (STEP 09-C, 2026-11-25)

> 08(`42c75df`) 기준. 새 endpoint를 만들지 않았고, 08에 없는 것은 TBD·결정 필요로만 적었다. 호출 주체는 v3 프로토타입 `b-source/src` 경로이고, 실제 구현은 `features/*/api.ts` → `shared/api/client.ts`(FRONTEND_STRUCTURE 8장)로 옮긴다. 실제 API 연동은 하지 않았다.

### 5-0. 계약 수준 표기 (08 머리말·7.0·8장 그대로)

| 표기 | 뜻 | 대상 API |
|---|---|---|
| **확정** | 요청·응답·오류·JSON까지 확정 | 01~19 (P0-핵심), 20·21 (18과 같은 모양), 03의 P1 필드, 24·26·32·35·51·52 (8.1, D-60~D-62) |
| **요약 확정** | 경로·메서드·책임·역할·격리·상태 전환까지 확정. 세부 JSON은 그 기능을 착수하는 PR에서 정함 | 22·23, 36~42 (7.0·7.1) |
| **큰 모양** | 요청·응답의 큰 모양만 있음. 표·JSON은 P1 착수 PR에서 정함 | 25·27·28·29·30·31·33·34·48·49 |
| **응답 미정** | 경로·오류만 있고 응답 칸이 "(P1 착수 PR에서 확정)" | 43·44·45·46·47·50 |
| **구현 착수 조건** | 문서는 확정됐지만 05 POL-46(법적 근거, 담당 PM)을 확인한 뒤 구현을 시작함 | 43~49 |
| **API 없음** | 브라우저에서만 처리함 | F-NTF-01 아침 알림, 복사, 문자 앱 열기 (5-4) |

### 5-1. 집계

| 구분 | API 수 | 확정 | 요약 확정 | 큰 모양 | 응답 미정 | 프로토타입 Mock 있음 |
|---|---|---|---|---|---|---|
| P0-핵심 | 19 (01~19) | 19 | — | — | — | 17 (02는 01 Mock에 합쳐짐, 13은 상수 `ITEMS`로 대신함) |
| P0-나머지 | 11 (20~23, 36~42) | 2 (20·21) | 9 | — | — | 10 (42는 15를 날짜마다 불러 대신함) |
| P1 | 22 (24~35, 43~52) | 6 | — | 10 | 6 | 22 (33·34는 함수 하나) |
| **합계** | **52** | **27** | **9** | **10** | **6** | — |

- 03의 P1 필드(`passwordChangeRequired`·`termsAgreementRequired`·`termsVersion`)는 확정이다.
- backend develop(`7e9200f`)에 실제로 있는 endpoint는 01·02·03·05·06·15·16·18 이렇게 8개다. API 19는 PR #61이 Draft라 아직 머지 전이다.
- 08에 없는데 화면이 요구하는 것: P0 6건(이 문서 3장 A1~A6 그대로), **P1 9건(아래 5-6 B1~B9)**.

### 5-2. P0 화면 × API (이 문서 2장 보완)

이 문서 2장에 이미 있는 P0 행의 시점·요청·응답·성공·실패·로딩·갱신은 그대로 유효하다. 08이 바뀌지 않았기 때문이다. 여기에는 그 문서에 없던 칸만 더한다: 호출 주체(b-source 경로), 권한, 우선순위, 계약 수준, 프로토타입의 실패 표시.

| API | 메서드·경로 | 연관 화면 | 호출 주체 (b-source) | 권한 | 우선순위 | 계약 | 프로토타입 실패 표시 |
|---|---|---|---|---|---|---|---|
| 01 | POST `/api/auth/login` | S-01 | `pages/S01-Login/LoginPage.tsx` | 없음 | P0-핵심 | 확정 | `LOGIN_FAILED` 공통 문구(아이디·비밀번호 구분 없음), `NETWORK` 연결 문구, 입력 유지 |
| 02 | POST `/api/admin/auth/login` | S-01 → S-10 | **없음.** `apiLogin`이 `admin` 계정까지 01 하나로 처리함 | 없음 | P0-핵심 | 확정 | — (5-6 B8 결정 필요) |
| 03 | GET `/api/me` | 앱 셸, S-01 단계 | `app/App.tsx`, `features/auth/LoginSteps.tsx` | 사장·정비사 | P0-핵심 (+P1 필드) | 확정 | — |
| 04 | GET `/api/home` | S-02 | `pages/S02-Home/HomePage.tsx`, `HomeCorePage.tsx` | 사장·정비사 | P0-핵심 | 확정 | `features/home/HomeStates.tsx` `HomeError` |
| 05 | GET `/api/customers` | S-05, M-01(중복 확인), M-02(차량 검색) | `pages/S05-CustomerList/CustomerVehicleListPage.tsx`, `features/customer/CustomerRegisterModal.tsx`(`findExisting`), `features/reservation/ReservationModal.tsx`(`searchVehicles`) | 사장·정비사 | P0-핵심 (+P1 `includeInactive`·지표) | 확정 | `LoadError` 카드 + 다시 시도 |
| 06 | POST `/api/customers` | M-01 | `features/customer/CustomerRegisterModal.tsx` | 사장·정비사 | P0-핵심 | 확정 | 400은 칸 오류, 그 밖은 `SaveFailNotice`(입력 유지·다시 시도) |
| 07 | GET `/api/customers/{customerId}` | S-06, 차량 추가·고객 수정 모달 | `pages/S06-CustomerDetail/CustomerDetailPage.tsx`, `AddVehicleModal.tsx`, `CustomerEditModal.tsx` | 사장·정비사 | P0-핵심 | 확정 | `LoadError` (404 포함) |
| 08 | POST `/api/customers/{customerId}/vehicles` | S-06, M-02 | `features/customer/AddVehicleModal.tsx` | 사장·정비사 | P0-핵심 | 확정 | 칸 오류 / `SaveFailNotice` |
| 09 | GET `/api/vehicles/{vehicleId}` | S-07, S-08, S-04 연락 준비, 차량 수정, M-03 | `VehicleDetailPage.tsx`, `VisitRecordPage.tsx`, `S04-Reinspection/ContactPanel.tsx`, `VehicleEditModal.tsx`, `RecordEditModal.tsx` | 사장·정비사 | P0-핵심 | 확정 | S-07은 `NotFoundPage` |
| 10 | GET `/api/vehicles/{vehicleId}/item-status` | S-07(주행거리 없이), S-08 미리보기, P1 약식 도면 | `VehicleDetailPage.tsx`, `VisitRecordPage.tsx`(`fetchItemStatus`), `features/customer/VehicleDiagram.tsx` | 사장·정비사 | P0-핵심 | 확정 | 미리보기 실패는 "저장에는 영향 없음" + 다시 불러오기 (`?fixture=preview-error`) |
| 11 | GET `/api/vehicles/{vehicleId}/visits` | S-07, M-03 | `VehicleDetailPage.tsx`, `RecordEditModal.tsx` | 사장·정비사 | P0-핵심 | 확정 | — |
| 12 | POST `/api/vehicles/{vehicleId}/visits` | S-08 | `pages/S08-VisitRecord/VisitRecordPage.tsx` | 사장·정비사 | P0-핵심 (외부·거절·결과·담당은 P0-나머지) | 확정 | 줄별 칸 오류, 500·네트워크는 입력 유지 |
| 13 | GET `/api/items` | M-02, S-08, P1 S-09 항목 탭 | **없음.** 상수 `ITEMS`·`ITEM_OFF`를 바로 읽음 | 사장·정비사 | P0-핵심 | 확정 | — (실제 구현에서는 13을 호출해야 함) |
| 14 | GET `/api/targets` | S-04, S-02 요약 | `pages/S04-Reinspection/ReinspectionPage.tsx`, `ContactPanel.tsx` | 사장·정비사 | P0-핵심 | 확정 | `LoadError` (시간 초과 `?fixture=timeout` 포함) |
| 15 | GET `/api/reservations` | S-02 캘린더·날짜 목록, M-02 | `features/home/Calendar.tsx`, `features/reservation/DateListPanel.tsx`, `ReservationModal.tsx`, `HomeCorePage.tsx` | 사장·정비사 | P0-핵심 (캘린더·`assigneeId`는 P0-나머지) | 확정 | — |
| 16 | POST `/api/reservations` | M-02 | `features/reservation/ReservationModal.tsx` | 사장·정비사 | P0-핵심 (`assigneeId`는 P0-나머지) | 확정 | 409 `RESERVATION_ACTIVE_EXISTS`·`MECHANIC_SLOT_CONFLICT`는 안내 + "기존/겹친 예약 보기"(`details.reservationId`), 그 밖은 `SaveFailNotice` |
| 17 | GET `/api/reservations/{reservationId}/panel` | S-02 패널, M-02 변경, S-08(예약에서 온 경우) | `features/reservation/DetailPanel.tsx`, `ReservationModal.tsx`, `VisitRecordPage.tsx` | 사장·정비사 | P0-핵심 | 확정 | — |
| 18 | POST `…/{reservationId}/complete` | S-02 패널 | `DetailPanel.tsx` | 사장·정비사 | P0-핵심 | 확정 | 409는 패널 다시 조회, 403·500·네트워크는 닫히지 않는 `ErrorToast` (`DetailPanel.tsx:34`) |
| 19 | PATCH `/api/reservations/{reservationId}` | M-02 변경 | `ReservationModal.tsx` | 사장·정비사 | P0-핵심 (재배정은 P0-나머지) | 확정 (backend 구현 PR #61 Draft) | 409 `CONCURRENT_MODIFICATION`·`ASSIGNEE_CHANGE_CLOSED`, 400 사유 누락은 칸 오류. 일시를 바꿀 때만 날짜·`RESERVATION_ACTIVE_EXISTS` 확인(`mock/db.ts` `validate(…, whenChanged)`, #111) |
| 20·21 | POST `…/cancel`·`…/no-show` | 패널 확인 대화상자 | `DetailPanel.tsx` | 사장·정비사 | P0-나머지 | 확정 | 18과 같음 |
| 22 | PATCH `/api/customers/{customerId}` | 고객 수정 모달, (P1) S-04 연락 거부 → 동의 해제 | `CustomerEditModal.tsx` | 사장·정비사 | P0-나머지 | 요약 확정 | 409는 최신값 다시 불러오기 + 다시 수정 (`CustomerEditModal.tsx:28`) |
| 23 | PATCH `/api/vehicles/{vehicleId}` | 차량 수정 모달 | `VehicleEditModal.tsx` | 사장·정비사 | P0-나머지 | 요약 확정 | 22와 같음 |
| 36 | GET `/api/staff/assignees` | M-02, S-08, M-03 | `ReservationModal.tsx`, `VisitRecordPage.tsx`, `RecordEditModal.tsx` | 사장·정비사 | P0-나머지 | 요약 확정 | — |
| 37·38 | PATCH `/api/records/{recordId}` · GET `…/revisions` | M-03, 수정 이력 모달 | `features/maintenance/RecordEditModal.tsx`, `RecordRevisionsModal.tsx` | 사장·정비사(조건) | P0-나머지 | 요약 확정 | 수정 가능 여부는 화면이 `recordEditRule`로 미리 막음. `EDIT_PERIOD_EXPIRED` Mock 응답 없음(미검증) |
| 39·40·41 | POST `…/start`·`…/correct` · GET `…/revisions` | S-02 패널 | `DetailPanel.tsx` | 사장·정비사 (상태 정정은 사장) | P0-나머지 | 요약 확정 | 18과 같음 |
| 42 | GET `/api/reservations/summary` | S-02 월 보기 | **없음.** `Calendar.tsx:102`가 15를 날짜마다 불러 건수를 셈 | 사장·정비사 | P0-나머지 | 요약 확정 | — (실제 구현에서는 42를 호출함) |

### 5-3. P1 화면 × API (P1)

공통 사항:
- 모든 정비소 API는 08 0.6을 따른다. `PASSWORD_CHANGE_REQUIRED`·`TERMS_AGREEMENT_REQUIRED`가 오면 03을 다시 불러 S-01의 해당 단계로 보낸다. `ACCOUNT_INACTIVE`가 오면 토큰을 지우고 로그인 화면으로 보낸다.
- 관리자 API(31~35)는 사장·정비사 토큰이면 403(X18)이다.
- 쓰기는 자동으로 다시 보내지 않는다. 화면의 역할 숨김은 표시일 뿐이고 최종 판단은 서버가 한다.

#### 5-3.1. S-01 로그인 단계 (F-AUTH-03·04)

| API | 메서드·경로 | 요청 | 화면이 쓰는 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 (08 → 프로토타입) | 로딩 | 권한 | 연관 화면 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 03 (P1 필드) | GET `/api/me` | — | `passwordChangeRequired`, `termsAgreementRequired`, `termsVersion` | 로그인 성공 직후, 새로 고침·재진입 때 | `app/App.tsx`(`apiMe`), `features/auth/LoginSteps.tsx` | 남은 단계부터 보여 줌(비밀번호 → 약관 → 홈) | `ACCOUNT_INACTIVE` → 로그인 화면 | — | 사장·정비사 | S-01 | 확정 |
| 24 | POST `/api/me/password` | `{ currentPassword, newPassword }` (확인 칸은 화면에만 있음) | 없음 | [변경] 버튼 | `LoginSteps.tsx` `PasswordStep` | 03 다시 → 사장이고 약관 전이면 약관 단계, 아니면 홈 | 400 `fieldErrors.currentPassword`("현재 비밀번호가 맞지 않습니다", 401 아님) / 규칙 위반은 `newPassword` 칸 / 네트워크(`?fixture=pw-network`)는 입력 유지 | 버튼 잠금 | 사장·정비사 | S-01 | 확정 |
| 52 | POST `/api/me/terms-agreement` | `{ termsVersion }` (체크박스 값은 보내지 않음) | `{ shopId, termsVersion, acceptedAt }` | 필수 체크 뒤 [동의] | `LoginSteps.tsx` `TermsStep` | 03 다시 → 홈 | 400(버전 다름) → 03 다시 불러 최신 버전 표시 / `PASSWORD_CHANGE_REQUIRED` / `FORBIDDEN`(정비사) | 버튼 잠금 | **사장만** | S-01 | 확정 (약관 전문·버전 형식 미확정) |
| 01 (P1 오류) | POST `/api/auth/login` | 그대로 | 그대로 | — | `LoginPage.tsx` | — | `ACCOUNT_INACTIVE` → 사용할 수 없는 계정 안내(`#inactive`), **`SHOP_SUSPENDED`는 Mock에 없음(미검증)** | — | — | S-01 | 확정 |

#### 5-3.2. S-02 홈: 고객 집계 카드 (F-STAT-01)

| API | 메서드·경로 | 요청 | 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 | 로딩 | 권한 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 | GET `/api/stats/customers?from=&to=` | 이번 달·지난달·직접 선택으로 정한 `from`·`to` | `{ newCustomers, returningCustomers }` | 카드 진입, 기간 탭 바꿀 때 | `features/home/CustomerStatsCard.tsx` | 숫자 두 개 + 재방문 정의 문구 | `LoadError` 카드 + 다시 시도. 400(`from` > `to`)은 Mock에서만 막음 | 카드 Skeleton | 사장·정비사 | 큰 모양 |

- 기간을 계산하는 `periodRange`(이번 달·지난달)는 화면에서 날짜를 고르는 일이라 API가 아니다. 집계 자체는 서버가 한다.
- 프로토타입 Mock은 방문 정의(외부 기록만 있는 방문 제외)를 흉내만 낸다.

#### 5-3.3. S-04 재점검 대상: 연락 준비 (F-CON-01·02)

| API | 메서드·경로 | 요청 | 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 | 로딩 | 권한 | 연관 화면 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 28 | GET `/api/targets/{customerId}/message-draft` | — | `{ customerId, phone(전체), text }` | 연락 준비 패널에서 [문자 초안] | `pages/S04-Reinspection/ContactPanel.tsx` | 초안 표시. PC는 복사, 폰·태블릿은 문자 앱 열기(4장, API 없음) | 08: 동의하지 않은 고객이면 **404**. 프로토타입은 **409 `CONSENT_REQUIRED`(08에 없는 코드)** → 5장 M1 | — | 사장·정비사 | S-04 | 큰 모양 |
| 29 | POST `/api/contacts` | `{ customerId, result, memo? }` (`result` 6개 값) | `{ contactId }` | 결과 선택 → [기록] | `ContactPanel.tsx` | "연락함(날짜)" 꼬리표. 예약함은 M-02, 이미 정비함은 S-08(외부 기록) | 오류 토스트. 연락 거부는 **동의 해제 확인 대화상자를 먼저 띄움**(자동 해제 아님) | 버튼 잠금 | 사장·정비사 (정비사도, D-57) | S-04, M-02, S-08 | 큰 모양 |
| 22 | PATCH `/api/customers/{customerId}` | `{ version, consent: false }` | 고객 | 연락 거부 → 동의 해제 [확인] | 프로토타입: `apiRecordContact(…, revokeConsent=true)`가 29 안에서 같이 해제함 | 해제하면 대상에서 바로 빠짐(POL-35) | 409 `CONCURRENT_MODIFICATION` | — | 사장·정비사 | S-04 | 요약 확정 → 5장 M2 |
| 14 · 09 | (P0) | — | 대상 목록 / 전체 연락처 | 진입 / 카드 선택 | `ReinspectionPage.tsx` / `ContactPanel.tsx` | — | — | — | — | — | 확정 |

- **"연락함(날짜)" 꼬리표(30일), 번호 오류·연락 거부 꼬리표의 데이터 출처가 08에 없다.** 14 응답에 연락 기록 필드가 없고, 연락 기록을 조회하는 API도 없다. 프로토타입은 `contactTag()`가 메모리 `CONTACT_LOG`를 읽는다. → 5-6 B1 결정 필요.
- P1에서는 28이 전체 번호를 주므로, 초안을 연 뒤에는 09 호출 없이도 번호를 보여 줄 수 있다. 다만 초안을 열기 전에 패널 머리에 번호를 보여 주려면 지금처럼 09가 필요하다(PAGE_API_MAPPING A4는 유지).

#### 5-3.4. S-05·S-06·S-07 고객·차량 (F-CUS-08·09·10, F-CYC-03)

| API | 메서드·경로 | 요청 | 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 | 로딩 | 권한 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|
| 05 (P1 확장) | GET `/api/customers?includeInactive=` | `includeInactive`(기본 false) | `items[].status`, `lastVisitDate`, `visitCount`, `hasUpcomingCheck` | "비활성 포함" 토글, 검색·쪽 이동 | `CustomerVehicleListPage.tsx` (프로토타입은 지표를 행마다 `customerMetrics()`로 따로 계산함) | 목록 줄 지표 + 비활성 꼬리표 | P0과 같음 | P0과 같음 | 사장·정비사 | 확정(05 P1 문장) |
| 07 (P1 확장) | GET `/api/customers/{customerId}` | — | 08: `status`, `vehicles[].active` / 04 F-CUS-09: `lastVisitDate`·`visitCount`·`hasUpcomingCheck`도 더함 | S-06 진입 | `CustomerDetailPage.tsx`, `features/customer/MetricsStrip.tsx` | 상단 요약 지표 | P0과 같음 | — | 사장·정비사 | **08과 04가 다름 → 5장 D1** |
| 43 | POST `/api/customers/{customerId}/deactivate` | — | (P1 착수 PR에서 확정) | [비활성화] 확인 | `features/customer/Lifecycle.tsx` `CustomerLifecycle` | 비활성 안내 표시, 검색·대상에서 빠짐 | 409 `HAS_ACTIVE_RESERVATION` → 대화상자 안에 안내 / `FORBIDDEN` | 확인 버튼 잠금 | **사장** | 응답 미정 · POL-46 |
| 44 | POST `…/{customerId}/activate` | — | (P1 착수 PR에서 확정) | [다시 활성화] | 같음 | 안내 해제 | `NOT_FOUND`·`FORBIDDEN` | 같음 | 사장 | 응답 미정 · POL-46 |
| 45 | DELETE `/api/customers/{customerId}` | — | (P1 착수 PR에서 확정) | 이력 없는 고객 [삭제] | 같음 | S-05로 돌아감 | 409 `HAS_HISTORY` → 비활성화 안내 / `FORBIDDEN` | 같음 | 사장 | 응답 미정 · POL-46 |
| 46·47 | POST `/api/vehicles/{vehicleId}/deactivate`·`activate` | — | (P1 착수 PR에서 확정) | S-07 [비활성화]·[다시 활성화] | `Lifecycle.tsx` `VehicleLifecycle` | 비활성 차량 표시 | 409 `HAS_ACTIVE_RESERVATION`(46) / `FORBIDDEN` | 같음 | 사장 | 응답 미정 · POL-46 |
| 10 (P1) | GET `…/item-status` | — | `items[].status`, `nextDueDate`(월평균 반영) | S-07 진입 | `VehicleDetailPage.tsx`, `VehicleDiagram.tsx` | 약식 도면 6개 위치에 상태 색. **도면 위치는 화면 상수 `DIAGRAM_POS`이고 API가 아님** | P0과 같음 | — | 사장·정비사 | 확정 |

- **삭제/비활성화 분기:** 프로토타입은 `customerHasHistory()`로 고객에게 이력이 있는지 미리 알고 버튼 문구(삭제/비활성화)를 바꾼다. 하지만 08의 07 응답에는 이력 유무 필드가 없다. → 5-6 B2.
- **월평균 주행거리 문구(F-CYC-03):** S-07에 "월평균 주행거리 약 n km(기록 n회)"를 보여 주는데, 08의 10에는 그 값(월평균 km·기록 수) 필드가 없다. 서버는 `nextDueDate`에만 반영한다. 프로토타입은 `mileageEstimate()`로 화면에서 계산한다(화면 계산 금지 원칙과 부딪힘). → 5-6 B3.

#### 5-3.5. S-09 정비소 설정 (사장만, F-STF-01·F-ITEM-01·F-CUS-11·F-NTF-01)

| API | 메서드·경로 | 요청 | 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 | 로딩 | 권한 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|
| 25 | GET `/api/staff` | — | `[{ staffId, loginId, name, role }]` | 정비사 탭 진입, 26·50·51 성공 뒤 | `pages/S09-Settings/StaffTab.tsx` | 목록 | `LoadError` | — | 사장 | 큰 모양. **화면은 상태(활성·임시 비밀번호)와 담당 유효 예약 수도 표시함 → 5-6 B4** |
| 26 | POST `/api/staff` | `{ loginId, name, temporaryPassword }` | `{ staffId }` | [정비사 추가] 모달 저장 | `StaffTab.tsx` `StaffAddModal` | 목록 갱신 + 토스트, 임시 비밀번호 전달 안내 | 400 칸 오류(아이디·비밀번호 규칙), **409 `CONFLICT` → 아이디 칸 오류**, `FORBIDDEN` | 버튼 "저장 중" | 사장 | 확정 |
| 50 | POST `/api/staff/{staffId}/deactivate` | — | (P1 착수 PR에서 확정) | [비활성화] 확인 | `StaffTab.tsx` | 목록 갱신 | 409 `HAS_ACTIVE_RESERVATION` → 대화상자 안내 / 사장 본인은 400 | 확인 버튼 잠금 | 사장 | 응답 미정 |
| 51 | POST `/api/staff/{staffId}/password-reset` | `{ temporaryPassword }` | 없음 | [임시 비밀번호 재발급] 모달 | `StaffTab.tsx`, `features/account/ResetPasswordModal.tsx` | 토스트 | 400(규칙, 대상이 사장), `NOT_FOUND`. **비활성 정비사를 대상으로 했을 때의 응답은 08 ❓7(미정)** → 프로토타입은 버튼을 숨김 | 버튼 잠금 | 사장 | 확정 (❓7 남음) |
| 13 · 27 | GET `/api/items` · PATCH `/api/items/{itemId}` | 27: `{ cycleMonths?, cycleKm?, active? }` | 13의 항목 하나 | 항목 탭 진입 / 줄 [저장] | `pages/S09-Settings/ItemsTab.tsx` (13은 상수를 읽음) | 줄 갱신 + 토스트 | 400 칸 오류(0보다 큼) | 버튼 잠금 | 사장 | 13 확정 · 27 큰 모양. 새 항목 추가 없음(P2) |
| 48 | GET `/api/customers/retention-due?page=&size=` | 쪽 나누기 | `items[{ customerId, name, lastVisitDate, baseDate, vehicles }]` | 보관 탭 진입 | `pages/S09-Settings/RetentionTab.tsx` | 목록(5년 경과일 표시) | `LoadError` | — | 사장 | 큰 모양 · POL-46 |
| 49 | POST `/api/customers/{customerId}/anonymize` | — | `{ customerId, anonymizedAt }` | [익명화] 확인(되돌릴 수 없음) | `RetentionTab.tsx` | 목록에서 빠짐 | 409 `RETENTION_NOT_REACHED`·`HAS_ACTIVE_RESERVATION` → 대화상자 안내 | 확인 버튼 잠금 | 사장 | 큰 모양 · POL-46 |
| — | (API 없음) | — | — | 아침 알림 탭 | `pages/S09-Settings/AlertTab.tsx` | 브라우저(localStorage)에 저장(5-4) | — | — | 사장 | API 없음 (D-59) |

- 48 표시 칸 "5년 경과일"은 프로토타입 Mock이 준 `expiredOn`을 그대로 쓴다. 08 48 응답에는 `baseDate`만 있다. 실제 구현에서는 `baseDate` + 5년을 화면에서 보여 주기만 할지, 응답 필드를 추가할지 정해야 한다(5-6 B5). 프로토타입 목록에는 쪽 나누기도 없다.

#### 5-3.6. S-10 서비스 관리자 (F-ADM-01·02, 관리자 전용 Layout)

| API | 메서드·경로 | 요청 | 응답 | 호출 시점 | 호출 주체 | 성공 | 실패 | 로딩 | 권한 | 계약 |
|---|---|---|---|---|---|---|---|---|---|---|
| 02 | POST `/api/admin/auth/login` | `{ loginId, password }` | `admin { adminId, name, role }` | 로그인 | **없음** (01 Mock에 합쳐짐) | S-10 | `LOGIN_FAILED` | — | 없음 | 확정 → 5-6 B8 |
| 31 | GET `/api/admin/shops` | — | `[{ shopId, name, status, createdAt }]` | 진입, 32~34 성공 뒤 | `pages/S10-Admin/AdminPage.tsx` | 목록(정비소 안의 숫자는 없음) | — | — | 서비스 관리자 | 큰 모양. **화면은 연락처·사장 아이디 칸도 보임 → 5-6 B6** |
| 32 | POST `/api/admin/shops` | `{ name, phone, owner: { loginId, name, temporaryPassword } }` | `{ shopId, ownerStaffId }` | [정비소 개설] 모달 저장 | `AdminPage.tsx` `ShopCreateModal` | 목록 갱신 + `SuccessToast` | 400 칸 오류, **409 `CONFLICT`(사장 아이디 중복, 정비소도 만들지 않음) → 아이디 칸 오류** | 버튼 잠금 | 서비스 관리자 | 확정 |
| 33·34 | POST `/api/admin/shops/{shopId}/suspend`·`resume` | — | `{ shopId, status }` | [정지]·[재개] 확인 | `AdminPage.tsx` (`apiSetShopStatus` 하나) | 상태 갱신. 이미 발급된 토큰을 즉시 차단하는 것은 P2라 안내 문구로만 | `NOT_FOUND`·`FORBIDDEN` | 확인 버튼 잠금 | 서비스 관리자 | 큰 모양 |
| 35 | POST `…/{shopId}/owner-password-reset` | `{ temporaryPassword }` | 없음 | [사장 비밀번호 재발급] | `AdminPage.tsx`, `ResetPasswordModal.tsx` | 토스트 | 400 규칙, `NOT_FOUND` | 버튼 잠금 | 서비스 관리자 | 확정 |

#### 5-3.7. P1이 기존 P0 API에 주는 영향 (영향받는 P0 재확인)

| 기존 API | P1 변화 (08) | 영향받는 화면 | 프로토타입 반영 |
|---|---|---|---|
| 03 | 계정 상태 필드 3개 | S-01 단계 가드 | 반영 |
| 01 | `SHOP_SUSPENDED`·`ACCOUNT_INACTIVE` | S-01 | `ACCOUNT_INACTIVE`만 반영. `SHOP_SUSPENDED`는 미검증 |
| 05 | `includeInactive`, 지표 3개, `status` | S-05 | 반영 (지표는 따로 계산) |
| 07·09 | `status`·`active`, 익명화 고객 이름·연락처 | S-06·S-07 | 비활성 안내 반영. 익명화 고객 표시는 Mock 데이터에 없음(미검증) |
| 08·12 | 비활성 고객·차량이면 400 | 차량 추가, S-08 | Mock 응답 없음(미검증) |
| 10·14 | 월평균 반영 `nextDueDate`(F-CYC-03) | S-07, S-04 | 안내 문구만 있음. Mock은 날짜 계산을 바꾸지 않음 |
| 36 | 비활성 정비사 제외 | M-02·S-08·M-03 | 반영 안 됨(Mock `STAFF` 전체) — 미검증 |
| 공통 | 403 `PASSWORD_CHANGE_REQUIRED`·`TERMS_AGREEMENT_REQUIRED`(0.6) | 모든 정비소 화면 | 단계 가드는 03 응답으로만 재현. 다른 API가 403을 돌려주는 경로는 Mock에 없음(미검증) |

### 5-4. 브라우저에서만 처리 — API를 만들지 않음

| 기능 | 근거 | 프로토타입 위치 |
|---|---|---|
| 아침 알림 시간·허용 여부 저장, 하루 1회 알림 | 04 F-NTF-01, 08 1장 끝 문단 (D-59: localStorage, 서버·DB·API 없음) | `AlertTab.tsx`, `mock/p1.ts` `MORNING_ALERT`(메모리. 실제 구현에서는 localStorage) |
| 문자 초안 복사 | 04 F-CON-01 "PC는 복사" | `shared/lib/form.ts` `copyText` |
| 문자 앱 열기(폰·태블릿) | 04 F-CON-01 "차곡은 발송하지 않는다" | `ContactPanel.tsx` (기기별 동작 미검증) |
| 고객 연락처 복사(S-06) | 화면 동작 | `CustomerDetailPage.tsx` `copyText` |
| 약식 도면의 항목 위치 | 04 F-CUS-08 (상태는 10 그대로) | `mock/p1.ts` `DIAGRAM_POS` → 실제 구현에서는 화면 상수로 옮김 |
| 집계 기간 계산(이번 달·지난달) | 화면 입력 | `periodRange` |
| 새 비밀번호 확인 칸 | 08 24 "서버로 보내지 않음" | `LoginSteps.tsx` |
| 아이디·비밀번호 규칙 미리 검사 | 08 8.1 (화면과 서버가 같은 규칙, 최종 판단은 서버) | `checkLoginId`·`checkPassword` |
| 재배정 가능 여부·기록 수정 가능 여부 미리 표시 | 04 F-RSV-06·F-MNT-04 (서버가 다시 판정) | `reassignRule`·`recordEditRule` |
| "내 담당만 보기" 필터 | 08 15 `assigneeId` 쿼리가 있음 | 프로토타입은 화면에서 거름 → **실제 구현은 15 `assigneeId` 쿼리를 쓴다(API는 이미 있음)** |

### 5-5. 불일치·수정 목록

#### 5-5.1. 프로토타입 Mock ↔ 08 (P1, 구현 때는 08을 따른다)

4장 표(P0)에 이어지는 P1 행이다.

| # | 프로토타입 | 08 | API |
|---|---|---|---|
| M1 | 동의하지 않은 고객의 초안 → 409 `CONSENT_REQUIRED` | 404 (`CONSENT_REQUIRED` 코드는 0.3에 없음) | 28 |
| M2 | `apiRecordContact(customerId, result, revokeConsent)`: 연락 거부와 동의 해제를 한 번에 처리 | 29 `{ customerId, result, memo? }` 따로, 동의 해제는 22 `consent:false`(자동 해제 아님) | 29·22 |
| M3 | `revisitCustomers` | `returningCustomers` | 30 |
| M4 | `{ loginId, name, tempPassword }`, 칸 오류 `tempPassword` | `temporaryPassword` | 26·51·35 |
| M5 | `{ name, phone, ownerLoginId, ownerName, tempPassword }` | `{ name, phone, owner: { loginId, name, temporaryPassword } }` | 32 |
| M6 | `{ enabled, months, km }`, 칸 `months`·`km` | `{ cycleMonths?, cycleKm?, active? }` | 27 |
| M7 | 25 응답에 `active`·`passwordChangeRequired`·`activeReservations` | `[{ staffId, loginId, name, role }]` | 25 (B4) |
| M8 | 31 응답에 `phone`·`ownerLoginId` | `[{ shopId, name, status, createdAt }]` | 31 (B6) |
| M9 | 48 응답에 `hasActive`·`expiredOn`, 쪽 나누기 없음 | `items[{ customerId, name, lastVisitDate, baseDate, vehicles }]` + `page`·`size` | 48 (B5) |
| M10 | 03 Mock이 `staffId`·`name`·`shopName` 없이 상태 필드만 돌려줌 | 03 전체 모양 + P1 필드 | 03 |
| M11 | 지표를 행마다 `customerMetrics()`로 계산 | 05·07 응답 필드(`lastVisitDate`·`visitCount`·`hasUpcomingCheck`) | 05·07 |
| M12 | 33·34를 `apiSetShopStatus(id, status)` 하나로 처리 | endpoint 두 개(`suspend`·`resume`) | 33·34 |
| M13 | 예약 변경 Mock이 날짜·시각·목적·담당을 항상 모두 보냄 | 19는 "보낸 필드만"(바꾼 것만 보냄, 없으면 400 R14) | 19 |
| M14 | 관리자도 01 Mock으로 로그인 | 02 `POST /api/admin/auth/login` 따로 | 01·02 (B8) |
| M15 | 13·42 Mock 함수 없음(상수·15 반복 호출로 대신함) | 13 `GET /api/items`, 42 `GET /api/reservations/summary` | 13·42 |

#### 5-5.2. 08 ↔ 이 문서 1·2·4장 (반영함)

C1 머리말 기준 커밋, C3~C7 1장 표(S-01·S-02·S-04~S-07, S-09·S-10 행), C9 16 응답, C14 4장 경로를 고쳤다. C8(03 P1 필드)·C10(12 비활성 400)·C11(19 #61 Draft·B9)·C12(15 `assigneeId`)·C13(A4와 28)은 5-2·5-3·5-6에 적었다.

#### 5-5.3. 08 ↔ 04 (docs 결정 절차로 넘김, 여기서 고치지 않음)

| # | 내용 | 근거 |
|---|---|---|
| D1 | 04 F-CUS-09는 "**05·07** 응답에 `lastVisitDate`·`visitCount`·`hasUpcomingCheck`를 더한다"고 하는데, 08 07의 P1 문장에는 `status`·`vehicles[].active`만 있음 | 04 F-CUS-09, 08 07 끝 문단. S-06 상단 지표(MetricsStrip)의 데이터 출처 |

### 5-6. TBD·결정 필요 (화면이 요구하지만 08에 없음, P1)

| # | 화면 요구 | 08 현황 | 처리 제안 (결정 전에는 우회 구현 금지) | 넘길 곳 |
|---|---|---|---|---|
| B1 | S-04 "연락함(날짜)" 30일 꼬리표, 번호 오류·연락 거부 꼬리표 | 29는 쓰기만 있음. 14에 연락 기록 필드 없음, 연락 기록 조회 API 없음 | 14 `items[]`에 최근 연락 결과·날짜 필드를 더하는 안을 결정 이슈로 올림 (F-CON-02 P1 착수 PR 전) | docs 결정 · BE(F-CON-02) |
| B2 | S-06 버튼 문구 "삭제"(이력 없음)와 "비활성화"(이력 있음) 미리 구분 | 07에 이력 유무 필드 없음. 45가 `HAS_HISTORY`로만 알려 줌 | (a) 07에 이력 유무 필드 추가, 또는 (b) 화면은 [비활성화/삭제] 한 버튼 + 45 → `HAS_HISTORY`면 43 안내. 결정 필요 | docs 결정 (POL-46 확인 뒤) |
| B3 | S-07 "월평균 주행거리 약 n km(기록 n회)" 문구 | 10에 월평균 값 없음(`nextDueDate`에만 반영). 화면 계산 금지 | 10 응답에 추정 근거 필드 추가 또는 문구를 고정 안내로 바꿈. 결정 필요 | docs 결정 · BE(F-CYC-03) |
| B4 | S-09 정비사 목록의 상태(활성·임시 비밀번호 대기)·담당 유효 예약 수 | 25 `[{ staffId, loginId, name, role }]`만 | 25 응답 확정 때(P1 착수 PR) `active`를 넣을지 결정. 유효 예약 수는 50의 409로 대신할 수 있음 | P1 착수 PR (F-STF-01) |
| B5 | S-09 보관 목록의 "5년 경과일" | 48은 `baseDate` | `baseDate` + 5년을 화면 표시로만 쓸지, 응답 필드를 추가할지 | P1 착수 PR (F-CUS-11, POL-46) |
| B6 | S-10 목록의 연락처·사장 아이디 칸 | 31은 `{ shopId, name, status, createdAt }`(04 F-ADM-01 "이름·상태·생성일만") | 화면에서 칸을 빼는 쪽이 문서와 맞음. 넣으려면 결정 필요 | 디자인(STEP 09-D) · docs |
| B7 | S-09 비활성 정비사의 임시 비밀번호 재발급 | 08 10장 **❓7 (미정)** | A 보고서 추천 "불허 + 기존 오류 코드". 프로토타입은 버튼을 숨김 | docs 결정 (정비사 계정 BE #32 전) |
| B8 | 관리자 로그인 방식 | 08은 02 별도 endpoint. 09는 S-01의 "서비스 관리자 로그인" 전환(💡). 프로토타입은 한 폼에서 계정으로 갈라짐 | 화면에서 01/02를 어떻게 고르는지(전환 링크 vs 경로) 결정. 별도 endpoint라는 계약은 그대로 둠 | PM·FE (A 보고서 6장) |
| B9 | M-02 지난 날짜 RESERVED 예약의 메모만 변경 | 19 문장대로면 같은 차량에 다른 유효 예약이 있을 때 409가 날 수 있음(backend PR #61 리뷰에서 나온 질문) | **결정됨 (chagok-docs #111, 2026-11-25)**: 날짜 규칙·같은 차량 유효 예약 확인은 일시를 바꿀 때만. 목적·메모만 바꾸면 막지 않음. 프로토타입·Mock 반영(STEP 09-E, 5-E장) | 완료 |

### 5-E. docs #111 반영 (STEP 09-E, 2026-11-25)

> 기준: chagok-docs develop `e57b2be`(#101·#111 머지). 위 5장의 `42c75df` 기준 검증은 이력으로 그대로 둔다.

| 08 변경 (#111) | 프로토타입·Mock 반영 | 확인 |
|---|---|---|
| 19: 날짜 규칙(`RESERVATION_PAST_DATE`)과 같은 차량 유효 예약 확인은 `reservedAt`을 보낼 때만 | `mock/db.ts` `apiUpdate`가 일시(날짜·시각)가 바뀐 경우에만 날짜·유효 예약을 확인. 담당 중복·`version`·상태·재배정 마감 확인은 그대로 | Mock 시나리오 11/11 (지난 예약 메모·목적 변경 성공, 다른 유효 예약이 있어도 메모만이면 성공, 일시 변경 시 409, 지난 날짜로 변경 시 날짜 오류, 버전·상태·재배정·담당 중복 유지) |
| 19: 지난 날짜 `RESERVED`("처리 필요")도 일시를 바꾸지 않는 변경 가능 | `DetailPanel.tsx` 예약 상태 패널의 「변경」 버튼을 지난 날짜에도 표시(정정 버튼은 그대로) | 브라우저 확인: 버튼 표시 → 메모만 저장 성공 → 지난 날짜로 바꾸면 날짜 오류, 페이지 오류 0 |
| 16·19 `RESERVATION_ACTIVE_EXISTS` 문구 「이 차량에는 이미 유효한 예약이 있습니다.」 | `mock/db.ts` 오류 문구 교체. 화면 안내 문장(모달 배너·안내 꼬리말)은 그대로 | Mock 등록 409 문구 확인 |
| 19: `purpose.itemIds` 빈 목록·null, `memo` 빈 문자열·null, 형식 오류 400 | 프로토타입은 바꾼 값 전체를 보내는 시연 Mock(M13)이라 반영 대상 아님. 실제 구현은 08 그대로 | — |
| 15 응답 예시의 `assignee`는 P0-나머지부터 | 화면 동작 변화 없음(이미 P0-나머지 범위로 표시) | — |

이미 열려 있는 결정(참고): chagok-docs#96(API 07 `dueCount` 조립 위치)은 backend 내부 구조 문제다. 07 응답 계약(`dueCount`·`soonCount` 정의, D-63 B01)은 바뀌지 않으므로 화면 영향은 없다. chagok-docs#103(범위 동결 D-70안)도 아직 열려 있다. 08 P1 범위(24~35·43~52)는 그대로다.

### 5-7. 상태 구분 (API 관점, STEP 09-C 6장 상태 용어 — DESIGN_PROGRESS 「기능별 Coverage」와 같은 용어)

| API 묶음 | 디자인 | 프로토타입 연결 | Mock 동작 확인 | API 명세 | 실제 기능 개발 | 실제 API 연동 |
|---|---|---|---|---|---|---|
| P0-핵심 01~19 | 완료 | 완료(02·13 제외) | 확인(A 31/31, B 572 상태 회귀) | 확정 | backend 일부 구현(01·02·03·05·06·15·16·18), FE 미착수 | 미착수 |
| P0-나머지 20~23·36~42 | 완료 | 완료(42 제외) | 확인 | 20·21 확정, 나머지 요약 확정(JSON은 착수 PR) | 미착수 | 미착수 |
| P1 계정 24·26·32·35·51·52 | 완료 | 완료 | 확인(A P1 26/26) | 확정(51 ❓7 남음) | 미착수 | 미착수 |
| P1 25·27~31·33·34·48·49 | 완료 | 완료 | 확인 | 큰 모양 | 미착수 | 미착수 |
| P1 43~47·50 | 완료 | 완료 | 확인 | 응답 미정, 43~49는 POL-46 확인 전 | 미착수(착수 조건 미충족) | 미착수 |
| F-NTF-01 | 설정 화면만 | 완료 | 실제 브라우저 알림 미검증 | API 없음(확정) | 미착수 | 해당 없음 |
