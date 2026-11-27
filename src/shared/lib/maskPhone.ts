/**
 * 08 0.5 목록 연락처 마스킹 규칙의 사본 — **개발용 Mock 전용**(05·14·15·04 목록 응답을 서버처럼 만들 때).
 * 마스킹은 서버 한 곳이 하고 화면은 받은 값을 그대로 보인다(09 0장 「연락처」). 화면 코드에서 이 함수로 다시 가리거나 풀지 않는다.
 * 숫자 n자리: 9 이상은 머리(02면 2자리, 아니면 3자리)-가운데 `*`-뒤 4자리, 5~8은 `*`-뒤 4자리, 4 이하는 `*`만. 빈 값은 그대로.
 */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d === '') return phone
  if (d.length <= 4) return '*'.repeat(d.length)
  const tail = d.slice(-4)
  if (d.length <= 8) return `${'*'.repeat(d.length - 4)}-${tail}`
  const head = d.startsWith('02') ? d.slice(0, 2) : d.slice(0, 3)
  return `${head}-${'*'.repeat(d.length - head.length - 4)}-${tail}`
}
