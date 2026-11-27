import { useEffect, useRef, useState } from 'react'

// S-06 고객 수정 · S-07 차량 수정 폼이 함께 쓰는 입력 상태 (editFlow의 규칙을 화면 상태로 옮긴 것).
// - 칸 오류는 칸을 벗어날 때 보이고, 한 번 보인 칸은 입력마다 다시 검사한다(M-01·차량 추가와 같음). 저장 때 서버 400 fieldErrors를 칸 아래에.
// - 저장 중 잠금(ref) + 버튼 비활성: 두 번 눌러도, 다시 시도와 저장을 겹쳐 눌러도 요청은 한 번(POL-120).
// - 409 동시 수정이면 onConflict(화면이 07·09를 다시 부름)를 부르고 안내만 한다. 사람이 고친 칸은 지우지 않는다(POL-124).
// - source(07·09에서 만든 칸 값)가 바뀌면(다시 불러옴) 사람이 손대지 않은 칸만 최신 값으로 바꾼다. 손대지 않은 칸이 옛 값으로
//   남아 있으면 다시 저장할 때 다른 직원의 수정(그 사이 방문 기록의 주행거리 등)을 옛 값으로 덮어쓰게 되기 때문이다(08 0.2 "덮어쓰지 않음").
// - 실패해도 입력값 유지, 자동으로 다시 보내지 않는다(POL-125).
// - refreshing(화면이 07·09를 다시 부르는 중)이면 저장하지 않는다 — 409 뒤 최신 version이 오기 전에 옛 version으로 다시 보내지 않게.
// validate(form)·submit(form)은 렌더마다 최신 값(07·09의 version 등)을 담아 넘긴다 — 저장을 누른 그때의 값을 쓴다.

export function useEditForm({ source, validate, submit, onSaved, onConflict, refreshing = false }) {
  const [form, setForm] = useState(source)
  const sourceKey = JSON.stringify(source)
  const [synced, setSynced] = useState({ key: sourceKey, values: source })
  if (synced.key !== sourceKey) {
    // 렌더 중 상태 맞추기(React 문서 "prop이 바뀔 때 상태 조정") — 손대지 않은 칸(이전 source와 같은 값)만 새 source로
    const previous = synced.values
    setForm((current) =>
      Object.fromEntries(Object.entries(source).map(([field, value]) => [field, current[field] === previous[field] ? value : current[field]])),
    )
    setSynced({ key: sourceKey, values: source })
  }
  const [errors, setErrors] = useState({})
  const [shown, setShown] = useState({})
  const [notice, setNotice] = useState(null) // { conflict: true } · { error } 저장 실패 · { title } 칸에 붙일 수 없는 400
  const [submitting, setSubmitting] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const submittingRef = useRef(false)
  const formRef = useRef(null)

  // 열리면 첫 칸으로 초점
  useEffect(() => {
    formRef.current?.querySelector('input')?.focus()
  }, [])

  // 저장을 눌렀는데 칸 오류가 있으면 첫 오류 칸으로 초점
  useEffect(() => {
    if (focusTick === 0) return
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [focusTick])

  function update(field, value) {
    const next = { ...form, [field]: value }
    setForm(next)
    if (shown[field]) setErrors((prev) => ({ ...prev, [field]: validate(next)[field] }))
  }

  function blur(field) {
    setShown((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validate(form)[field] }))
  }

  function showErrors(found) {
    setErrors(found)
    setShown(Object.fromEntries(Object.keys(found).map((field) => [field, true])))
    setFocusTick((tick) => tick + 1)
  }

  async function save() {
    if (submittingRef.current || refreshing) return
    setNotice(null)
    const found = validate(form)
    if (Object.values(found).some(Boolean)) {
      showErrors(found)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    let outcome
    try {
      outcome = await submit(form)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
    if (outcome.kind === 'saved' || outcome.kind === 'unchanged') {
      onSaved(outcome.kind)
      return
    }
    if (outcome.kind === 'conflict') {
      setNotice({ conflict: true })
      onConflict()
      return
    }
    if (outcome.kind === 'invalid') {
      showErrors(outcome.errors)
      if (outcome.message) setNotice({ title: outcome.message })
      return
    }
    setNotice({ error: outcome.error })
  }

  return { form, errors, shown, notice, submitting, formRef, update, blur, save }
}
