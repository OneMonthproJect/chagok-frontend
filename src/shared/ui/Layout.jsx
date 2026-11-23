// 공통 화면 골격: 상단 영역 + 본문. ⚠ 임시 최소 구조 (D-19 확정 전).
// 메뉴(09 0장 💡)·머리 내용(정비소명·이름·역할·로그아웃)은 그 화면 이슈가 header로 넘긴다. 여기서 메뉴 항목을 만들지 않는다.
// 사용: <Layout header={<AppHeader />}>{children}</Layout>

export default function Layout({ header = null, children }) {
  return (
    <div className="layout">
      {header && <header className="layout__header">{header}</header>}
      <main className="layout__main">{children}</main>
    </div>
  )
}
