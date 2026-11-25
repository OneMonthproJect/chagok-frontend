import { useId } from 'react'
import './customer.css'

// 검색창 하나 (09 S-05: 차량번호·연락처·이름). 값은 쓰는 쪽이 들고, 검색 시점(0.3초 멈춤)은 useCustomerSearch가 정한다.
// 지우기 버튼은 값이 있을 때만 보인다(연결 안 된 버튼 없음).
// 사용: <CustomerSearchBox value={q} onChange={setQ} hint="일부만 입력해도 찾습니다." />

export default function CustomerSearchBox({
  value,
  onChange,
  label = '고객·차량 검색',
  placeholder = '차량번호·연락처·이름 검색',
  hint,
  autoFocus = false,
}) {
  const hintId = useId()
  return (
    <div className="customer-search">
      <div className="customer-search__field">
        <span className="customer-search__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          className="customer-search__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={hint ? hintId : undefined}
          data-autofocus={autoFocus ? '' : undefined}
          autoComplete="off"
        />
        {value && (
          <button type="button" className="customer-search__clear" aria-label="검색어 지우기" onClick={() => onChange('')}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="customer-search__hint">
          {hint}
        </p>
      )}
    </div>
  )
}
