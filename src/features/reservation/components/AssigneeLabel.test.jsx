import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AssigneeLabel, { assigneeColorClass } from './AssigneeLabel.jsx'

// 담당 파스텔 (#110 8절): colorIndex를 6색으로 순환, 이름은 항상 함께
describe('AssigneeLabel', () => {
  it.each([
    [0, 'c0'], [1, 'c1'], [5, 'c5'], [6, 'c0'], [7, 'c1'], [-1, 'c5'],
  ])('colorIndex %s → %s', (colorIndex, color) => {
    expect(assigneeColorClass({ staffId: 1, name: '박사장', colorIndex })).toBe(`assignee-color--${color}`)
  })

  it('이름을 글자로 보이고, 담당이 없으면 그리지 않는다', () => {
    const html = renderToStaticMarkup(<AssigneeLabel assignee={{ staffId: 2, name: '김정비', colorIndex: 1 }} />)
    expect(html).toContain('assignee-label assignee-color--c1')
    expect(html).toContain('김정비')
    expect(renderToStaticMarkup(<AssigneeLabel assignee={null} />)).toBe('')
    expect(assigneeColorClass(null)).toBeNull()
  })
})
