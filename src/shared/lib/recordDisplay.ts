// 정비 기록의 출처·점검 결과 표시 (09 S-07 「외부는 "고객 진술" 표시」·S-02 4번 「항목·구분(·결과)」, 08 0.4·11·17, F-MNT-02·03).
// S-07 정비 이력(maintenance)과 S-02 패널 최근 이력(reservation)이 같은 규칙·글자를 쓰므로 여기 한 곳에 둔다
// (feature끼리 import하지 않음, CONVENTIONS 7장). API 타입은 모르고 모양만 받는다.

/** 08 0.4 출처 CUSTOMER_STATEMENT의 글자 */
export const CUSTOMER_STATEMENT_LABEL = '고객 진술'

/** 08 0.4 점검 결과 글자 (F-MNT-03). 진단이 아니라 정비사의 관찰 기록이다 */
export const INSPECT_RESULT_LABELS: Record<'GOOD' | 'CAUTION', string> = {
  GOOD: '양호',
  CAUTION: '주의',
}

/**
 * 기록이 고객 진술인지. 08 11·17 records[].source를 그대로 본다(서버 값, 프론트에서 다시 정하지 않음).
 * 구분과 출처는 항상 짝이다(07 3.7 CHECK (record_type = 'EXTERNAL') = (source = 'CUSTOMER_STATEMENT'), 04 F-MNT-04).
 */
export function isCustomerStatement(record: { source: string }): boolean {
  return record.source === 'CUSTOMER_STATEMENT'
}
