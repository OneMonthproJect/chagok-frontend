import { useEffect, useState } from 'react'
import { getItems } from '@/features/maintenance/api'

// 예약 목적 항목 목록 (08 13). M-02가 feature끼리 import하지 않도록 S-02가 불러서 items로 넘긴다(STARTER 07 3.2).
// 쓰는 항목만, 정렬 순서대로 { itemId, name }. 실패하면 빈 목록(예약 목적은 선택 입력이라 기타·메모로 등록은 할 수 있다).
export function useServiceItems() {
  const [items, setItems] = useState([])
  useEffect(() => {
    let alive = true
    getItems()
      .then((data) => {
        if (!alive) return
        setItems(
          data
            .filter((item) => item.active)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({ itemId: item.itemId, name: item.name })),
        )
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return items
}
