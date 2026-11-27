// 수정 요청 한 번의 결과 분류 (05 POL-120~125·124). 고객·차량 수정(08 22·23, #32)과 정비 기록 수정(08 37, #34)이 함께 쓴다.
// 두 feature가 쓰므로 shared에 둔다(feature끼리 import하지 않음, CONVENTIONS 7장). useEditForm이 이 결과로 화면 상태를 바꾼다.
// - 바꾼 칸이 없으면(request null) 부르지 않는다.
// - 409 CONCURRENT_MODIFICATION은 따로: 화면이 최신 값을 다시 불러오고 입력값은 지우지 않는다. 자동으로 다시 보내지 않는다.
// - 400은 fieldErrors를 칸 이름에 붙이고, 칸에 붙일 수 없는 오류가 있으면 message로 화면 위에 보인다.
// - 그 밖(403·404·500·네트워크)은 failed — 서버 message를 그대로 보이고 사람이 다시 시도한다.

import { ApiError, DEFAULT_MESSAGES, type FieldError } from '@/shared/api/client'

export type EditOutcome<E> =
  | { kind: 'saved' }
  /** 바꾼 칸이 없어 요청하지 않음 */
  | { kind: 'unchanged' }
  /** 400: 칸 아래 문구. message는 칸에 붙일 수 없는 오류가 있을 때만(화면 위 안내) */
  | { kind: 'invalid'; errors: E; message: string | null }
  /** 409 CONCURRENT_MODIFICATION: 화면이 최신 값을 다시 불러온다. 입력값은 유지 */
  | { kind: 'conflict' }
  /** 그 밖(403·404·500·네트워크 등): 입력값 유지, 화면 위 오류 안내 + 사람이 누르는 다시 시도 */
  | { kind: 'failed'; error: ApiError }

/**
 * 저장 한 번. request가 null(바꾼 칸 없음)이면 부르지 않는다. 입력값은 바꾸지 않는다.
 * fields: 서버 fieldErrors.field 중 칸에 붙일 수 있는 이름 (08 요청 필드 이름 그대로)
 */
export async function submitEdit<B, F extends string>(
  request: B | null,
  save: (body: B) => Promise<unknown>,
  fields: readonly F[],
): Promise<EditOutcome<Partial<Record<F, string>>>> {
  if (request === null) return { kind: 'unchanged' }
  try {
    await save(request)
    return { kind: 'saved' }
  } catch (e) {
    const error = e instanceof ApiError ? e : new ApiError(0, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR)
    if (error.code === 'CONCURRENT_MODIFICATION') return { kind: 'conflict' }
    if (error.code === 'INVALID_INPUT') {
      const { errors, unmatched } = mapFieldErrors(error.fieldErrors, fields)
      const message = unmatched.length > 0 || !Object.values(errors).some(Boolean) ? error.message : null
      return { kind: 'invalid', errors, message }
    }
    return { kind: 'failed', error }
  }
}

function mapFieldErrors<F extends string>(fieldErrors: FieldError[], fields: readonly F[]) {
  const errors: Partial<Record<F, string>> = {}
  const unmatched: FieldError[] = []
  for (const fieldError of fieldErrors) {
    const field = fields.find((name) => name === fieldError.field)
    if (field && !errors[field]) errors[field] = fieldError.reason
    else if (!field) unmatched.push(fieldError)
  }
  return { errors, unmatched }
}
