/**
 * 08 0.5 연락처 마스킹(서버 한 곳의 규칙을 개발용 Mock에만 옮김 — 화면 코드는 가리지 않는다). 목록 응답(04·05·14·15)에만 쓴다(07·09·17은 전체 번호).
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
