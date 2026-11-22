import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ServerCheck from '@/app/ServerCheck.jsx'

// 라우팅과 로그인 가드는 `기반` 이슈에서 채운다. 화면(pages)은 09 화면 명세의 S-xx와 1:1.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<ServerCheck />} />
      </Routes>
    </BrowserRouter>
  )
}
