import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ItemStatusList from '@/shared/ui/ItemStatusList.jsx'

// 서버 값·순서 그대로, highlighted는 표시만 (08 17, D-63 B02), 상태 글자 항상 표시 (09 0장). DOM 없이 마크업만 확인한다.

const ITEMS = [
  { id: 1, name: '엔진오일', status: 'AHEAD', details: [{ label: '다음', value: '2027.04.24' }, { label: '마지막', value: '2026.10.24' }] },
  { id: 2, name: '에어클리너', status: 'UNKNOWN', details: [{ label: '다음', value: null }, { label: '마지막', value: null }] },
  { id: 6, name: '배터리', status: 'SOON', highlighted: true, tag: '예약 목적', details: [{ label: '다음', value: '2026.12.14' }, { label: '마지막', value: '2023.12.14' }] },
  { id: 4, name: '브레이크패드', status: 'DUE', details: [{ label: '다음', value: '2026.11.01' }, { label: '마지막', value: '2024.11.01' }] },
]

function namesInOrder(markup) {
  return ITEMS.map((item) => ({ name: item.name, at: markup.indexOf(`>${item.name}`) }))
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.name)
}

describe.each(['summary', 'target', 'table', 'preview'])('ItemStatusList variant=%s', (variant) => {
  const markup = renderToStaticMarkup(<ItemStatusList variant={variant} items={ITEMS} />)

  it('variant class로 모양만 바뀐다', () => {
    expect(markup).toContain(`item-status-list--${variant}`)
  })

  it('받은 순서 그대로 그린다 — highlighted 항목도 자리를 옮기지 않는다', () => {
    expect(namesInOrder(markup)).toEqual(['엔진오일', '에어클리너', '배터리', '브레이크패드'])
  })

  it('모든 항목에 상태 글자를 함께 보인다 (서버 status 그대로)', () => {
    for (const label of ['여유', '미확인', '임박', '도래']) expect(markup).toContain(`>${label}</span>`)
    expect(markup.match(/class="status-badge /g)).toHaveLength(ITEMS.length)
  })

  it('highlighted는 class와 꼬리표로만 표시한다', () => {
    expect(markup.match(/is-highlighted/g)).toHaveLength(1)
    expect(markup).toContain('<span class="item-status-list__tag">예약 목적</span>')
  })
})

describe('ItemStatusList 세부', () => {
  it('table: 머리 칸은 항목·상태 + details label, 빈 값은 —', () => {
    const markup = renderToStaticMarkup(<ItemStatusList variant="table" items={ITEMS} />)
    expect(markup).toContain('<th scope="col">항목</th><th scope="col">상태</th><th scope="col">다음</th><th scope="col">마지막</th>')
    expect(markup).toContain('<td>—</td>')
  })

  it.each(['preview', 'target'])('%s: details를 label과 값으로 보인다', (variant) => {
    const markup = renderToStaticMarkup(<ItemStatusList variant={variant} items={ITEMS} />)
    expect(markup).toContain('<span class="item-status-list__label">다음</span> 2027.04.24')
    expect(markup).toContain('<span class="item-status-list__label">마지막</span> —')
  })

  it('summary는 details를 보이지 않는다 (이름·상태만)', () => {
    const markup = renderToStaticMarkup(<ItemStatusList variant="summary" items={ITEMS} />)
    expect(markup).not.toContain('item-status-list__detail')
  })

  it('loading이면 aria-busy="true" + 흐린 class (이전 결과는 그대로 둔다)', () => {
    const markup = renderToStaticMarkup(<ItemStatusList variant="preview" items={ITEMS} loading />)
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('is-loading')
    expect(markup).toContain('>엔진오일')
  })

  it('모르는 variant는 summary로 그린다', () => {
    expect(renderToStaticMarkup(<ItemStatusList variant="x" items={ITEMS} />)).toContain('item-status-list--summary')
  })
})
