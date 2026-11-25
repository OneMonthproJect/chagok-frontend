// S-05 쪽 나누기 (08 05 page·totalPages, 디자인 v3.0 Customer-List-Paged). 한 화면만 쓰므로 pages에 둔다(두 번째로 쓰는 화면이 생기면 shared로).
// 쪽이 하나뿐이면 그리지 않는다. page는 0부터(08 0.1), 화면 숫자는 1부터.

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i)
  return (
    <nav className="s05-pagination" aria-label="쪽 나누기">
      <button type="button" className="s05-pagination__step" disabled={page === 0} onClick={() => onChange(page - 1)}>
        이전 쪽
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`s05-pagination__page${p === page ? ' s05-pagination__page--current' : ''}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
        >
          {p + 1}
        </button>
      ))}
      <button type="button" className="s05-pagination__step" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        다음 쪽
      </button>
    </nav>
  )
}
