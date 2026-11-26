// S-06 고객 상세의 판단 규칙·문구 (09 S-06·5장, 08 07, 디자인 v3.0 Customer-Detail-*). 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// 도래·임박 수는 서버(08 07 dueCount·soonCount) 값 그대로 쓴다. 여기서 날짜로 상태를 계산하지 않는다(CONVENTIONS 7장).

/** 빈 상태 (09 5장 S-06 차량 없음) */
export const NO_VEHICLES_MESSAGE = '등록된 차량이 없습니다.'

/**
 * 404 (09 5장: "찾을 수 없습니다." + "홈으로") — 없는 고객·다른 정비소 고객(X1). 설명 줄은 디자인 v3.0 Vehicle-NotFound 문구.
 * 조회 실패 문구는 S-05와 같은 searchFlow의 LOAD_FAILED_MESSAGE·RELOAD_LABEL(09 5장)을 쓴다.
 */
export const NOT_FOUND_TITLE = '찾을 수 없습니다.'
export const NOT_FOUND_DESCRIPTION = '주소가 바뀌었거나 볼 수 없는 정보입니다.'
export const GO_HOME_LABEL = '홈으로'

/** 값이 비어 있을 때 (08 07: modelYear·latestMileage는 null일 수 있음, 07 3.5) */
export const MODEL_YEAR_MISSING = '연식 미입력'
export const MILEAGE_MISSING = '미입력'

/**
 * URL의 :customerId → 08 07 경로 변수. 양의 정수가 아니면 null(요청하지 않고 찾을 수 없음으로 보인다).
 * "12abc"·"1.5"·"0"·"-1"·"" 모두 null.
 */
export function parseCustomerId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

/** URL의 :vehicleId → 08 09 경로 변수 (S-07). 규칙은 parseCustomerId와 같다(양의 정수가 아니면 null) */
export function parseVehicleId(value: string | undefined): number | null {
  return parseCustomerId(value)
}

/** 안내 수신 동의 꼬리표 (디자인 v3.0 S-06). 글자로 구분한다(색만으로 구분하지 않음, 09 0장) */
export function consentText(consent: boolean): string {
  return consent ? '안내 수신 동의' : '안내 수신 미동의'
}

/** 연식 "2019년식", 비었으면 null (화면이 MODEL_YEAR_MISSING을 흐리게 보인다) */
export function modelYearText(modelYear: number | null): string | null {
  return modelYear == null ? null : `${modelYear}년식`
}

/** 최근 주행거리 "40,000 km", 비었으면 null (화면이 MILEAGE_MISSING을 흐리게 보인다) */
export function mileageText(mileage: number | null): string | null {
  return mileage == null ? null : `${mileage.toLocaleString('ko-KR')} km`
}

/** 차량 영역 머리 아래 (디자인 v3.0 S-06) */
export function vehicleCountText(count: number): string {
  return `등록 차량 ${count}대 · 도래·임박은 오늘 기준`
}

/**
 * S-05에서 넘어올 때 가져온 목록 검색(`?q=&page=`)을 되돌려 줄 때 쓴다. `?`로 시작하는 문자열만 받는다.
 * 그 밖(직접 주소 입력·새로 고침으로 state가 없음 등)은 빈 문자열 → 목록 처음.
 */
export function listSearchFrom(state: unknown): string {
  const value = (state as { listSearch?: unknown } | null)?.listSearch
  return typeof value === 'string' && value.startsWith('?') ? value : ''
}
