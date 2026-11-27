import { describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR } from '@/shared/api/client'
import { submitEdit } from './submitEdit'

// features/customer/editFlow.test.ts에서 옮김(#34, 22·23·37이 함께 씀). 칸 이름은 22·23 예시 — shared는 feature를 import하지 않는다.
const NAME_FIELDS = ['name', 'phone', 'consent'] as const
const VEHICLE_FIELDS = ['plateNumber', 'model', 'modelYear', 'latestMileage'] as const

describe('submitEdit — 수정 저장 한 번 (22·23·37 공통)', () => {
  it('바꾼 칸이 없으면 부르지 않고 unchanged', async () => {
    const save = vi.fn()
    expect(await submitEdit(null, save, NAME_FIELDS)).toEqual({ kind: 'unchanged' })
    expect(save).not.toHaveBeenCalled()
  })

  it('성공이면 saved', async () => {
    const save = vi.fn().mockResolvedValue({})
    expect(await submitEdit({ version: 0, consent: false }, save, NAME_FIELDS)).toEqual({ kind: 'saved' })
    expect(save).toHaveBeenCalledWith({ version: 0, consent: false })
  })

  it('409 CONCURRENT_MODIFICATION이면 conflict (화면이 다시 불러옴), 한 번만 부른다', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.'))
    expect(await submitEdit({ version: 0 }, save, NAME_FIELDS)).toEqual({ kind: 'conflict' })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('400 fieldErrors는 칸으로, 칸에 없는 것(version)이 있으면 위 안내 문구도', async () => {
    const onlyField = new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'latestMileage', reason: '0 이상이어야 합니다.' }])
    expect(await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(onlyField), VEHICLE_FIELDS)).toEqual({
      kind: 'invalid',
      errors: { latestMileage: '0 이상이어야 합니다.' },
      message: null,
    })
    const withVersion = new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'version', reason: '필수 입력입니다.' }])
    expect(await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(withVersion), VEHICLE_FIELDS)).toEqual({
      kind: 'invalid',
      errors: {},
      message: '입력값을 확인해 주세요.',
    })
  })

  it('404·네트워크 등 그 밖은 failed (입력 유지·사람이 다시 시도)', async () => {
    const network = new ApiError(0, NETWORK_ERROR, '서버에 연결하지 못했습니다.')
    const outcome = await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(network), NAME_FIELDS)
    expect(outcome).toEqual({ kind: 'failed', error: network })
  })
})
