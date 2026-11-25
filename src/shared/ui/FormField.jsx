import { Children, cloneElement, isValidElement } from 'react'
import './FormField.css'

// 라벨 + 입력 칸 하나 + 칸 아래 한 줄(오류 > 경고 > 도움말 중 하나). 09 S-01 오류 표시 규칙의 표시 부분.
// error가 있으면 칸에 aria-invalid="true"를 주고 오류 문구를 aria-describedby로 잇는다. 문구는 필수 — 색만으로 알리지 않는다(09 0장).
// 언제 error를 넘길지(blur 때 검사, 보인 뒤에는 입력마다 다시 검사)는 쓰는 화면·폼이 정한다. 이 컴포넌트는 받은 값만 보인다.
// 입력값은 건드리지 않는다(실패해도 값 유지, 05 POL-121).
// 사용: <FormField id="phone" label="연락처" required error={errors.phone}><input value={phone} onChange={…} onBlur={…} /></FormField>

export default function FormField({ id, label, required = false, hint, error, warn, suffix, children }) {
  const message = error
    ? { kind: 'error', id: `${id}-error`, text: error }
    : warn
      ? { kind: 'warn', id: `${id}-warn`, text: warn }
      : hint
        ? { kind: 'hint', id: `${id}-hint`, text: hint }
        : null

  const control = Children.only(children)
  const describedBy = [isValidElement(control) ? control.props['aria-describedby'] : null, message?.id]
    .filter(Boolean)
    .join(' ')
  const input = cloneElement(control, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
    'aria-required': required ? 'true' : undefined,
  })

  return (
    <div className={`form-field${error ? ' form-field--error' : ''}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {suffix ? (
        <div className="form-field__control form-field__control--suffix">
          {input}
          <span className="form-field__suffix">{suffix}</span>
        </div>
      ) : (
        <div className="form-field__control">{input}</div>
      )}
      {message && (
        <p id={message.id} className={`form-field__message form-field__message--${message.kind}`}>
          {message.kind !== 'hint' && (
            <span className="form-field__icon" aria-hidden="true">
              !
            </span>
          )}
          {message.text}
        </p>
      )}
    </div>
  )
}
