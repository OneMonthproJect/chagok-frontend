import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormField from '@/shared/ui/FormField.jsx'

// 칸 오류 연결: aria-invalid + aria-describedby → 오류 문구 (09 S-01 오류 표시 규칙, #18 테스트). DOM 없이 마크업만 확인한다.

function html(props, input = <input name="phone" />) {
  return renderToStaticMarkup(
    <FormField id="phone" label="연락처" {...props}>
      {input}
    </FormField>,
  )
}

function inputTag(markup) {
  return markup.match(/<input[^>]*>/)[0]
}

describe('FormField 오류 연결', () => {
  it('error가 있으면 칸에 aria-invalid="true", aria-describedby는 오류 문구 id', () => {
    const markup = html({ error: '연락처를 확인해 주세요.' })
    const input = inputTag(markup)
    expect(input).toContain('id="phone"')
    expect(input).toContain('aria-invalid="true"')
    expect(input).toContain('aria-describedby="phone-error"')
    expect(markup).toMatch(/<p id="phone-error" class="form-field__message form-field__message--error">.*연락처를 확인해 주세요\.<\/p>/)
  })

  it('error가 없으면 aria-invalid·오류 문구가 없다', () => {
    const markup = html({})
    expect(inputTag(markup)).not.toContain('aria-invalid')
    expect(inputTag(markup)).not.toContain('aria-describedby')
    expect(markup).not.toContain('form-field__message')
  })

  it('오류가 없을 때 도움말을 잇고, 오류가 생기면 오류가 도움말 자리를 대신한다', () => {
    const hintOnly = html({ hint: '숫자와 하이픈만' })
    expect(inputTag(hintOnly)).toContain('aria-describedby="phone-hint"')
    expect(hintOnly).toContain('숫자와 하이픈만')

    const withError = html({ hint: '숫자와 하이픈만', error: '연락처를 확인해 주세요.' })
    expect(inputTag(withError)).toContain('aria-describedby="phone-error"')
    expect(withError).not.toContain('숫자와 하이픈만')
  })

  it('경고는 aria-invalid 없이 문구만 잇는다', () => {
    const markup = html({ warn: '최근 주행거리보다 작습니다.' })
    expect(inputTag(markup)).not.toContain('aria-invalid')
    expect(inputTag(markup)).toContain('aria-describedby="phone-warn"')
  })

  it('칸에 이미 있던 aria-describedby는 지우지 않고 뒤에 덧붙인다', () => {
    const markup = html({ error: '필수입니다.' }, <input aria-describedby="phone-note" />)
    expect(inputTag(markup)).toContain('aria-describedby="phone-note phone-error"')
  })

  it('라벨은 칸과 연결되고, 필수면 * 표시(낭독기에는 aria-required)', () => {
    const markup = html({ required: true })
    expect(markup).toContain('<label class="form-field__label" for="phone">연락처<span class="form-field__required" aria-hidden="true">*</span></label>')
    expect(inputTag(markup)).toContain('aria-required="true"')
    expect(inputTag(html({}))).not.toContain('aria-required')
  })

  it('입력값을 바꾸지 않는다', () => {
    const markup = html({ error: '연락처를 확인해 주세요.' }, <input defaultValue="010-12" />)
    expect(inputTag(markup)).toContain('value="010-12"')
  })

  it('suffix(단위)는 칸 오른쪽에 붙는다', () => {
    const markup = html({ suffix: 'km' })
    expect(markup).toContain('form-field__control--suffix')
    expect(markup).toContain('<span class="form-field__suffix">km</span>')
  })
})
