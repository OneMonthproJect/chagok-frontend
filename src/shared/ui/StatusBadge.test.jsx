import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import StatusBadge from '@/shared/ui/StatusBadge.jsx'

// 08 0.4 상태 4개만, 글자 항상 함께 (09 0장). DOM 없이 마크업만 확인한다.

describe('StatusBadge', () => {
  it.each([
    ['UNKNOWN', '미확인'],
    ['AHEAD', '여유'],
    ['SOON', '임박'],
    ['DUE', '도래'],
  ])('%s → 점 + "%s" 글자', (status, label) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />)
    expect(html).toContain(`class="status-badge status-badge--${status}"`)
    expect(html).toContain('<i class="status-badge__dot" aria-hidden="true"></i>')
    expect(html).toContain(`>${label}</span>`)
  })

  it.each([['NORMAL'], ['due'], [undefined], [null]])('08 0.4에 없는 값(%s)은 그리지 않는다', (status) => {
    expect(renderToStaticMarkup(<StatusBadge status={status} />)).toBe('')
  })
})
