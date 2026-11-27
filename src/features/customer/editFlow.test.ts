import { describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR } from '@/shared/api/client'
import {
  CANNOT_CLEAR,
  CUSTOMER_EDIT_FIELDS,
  VEHICLE_EDIT_FIELDS,
  customerEditForm,
  submitEdit,
  toCustomerUpdate,
  toVehicleUpdate,
  validateCustomerEdit,
  validateVehicleEdit,
  vehicleEditForm,
} from './editFlow'
import type { CustomerDetail, VehicleDetail } from './types'

// S-06·S-07 수정 규칙 (04 F-CUS-06, 08 22·23, 05 POL-124·125): 바꾼 칸만 + 읽은 version, 비울 수 없는 칸, 409·400·그 밖 실패 나누기

const CUSTOMER: CustomerDetail = {
  customerId: 1,
  name: '김민수',
  phone: '010-0000-0001',
  consent: true,
  version: 2,
  vehicles: [],
}

const VEHICLE: VehicleDetail = {
  vehicleId: 4,
  plateNumber: '78라0004',
  model: 'K5',
  modelYear: 2020,
  latestMileage: 45000,
  version: 5,
  customer: { customerId: 4, name: '최지은', phone: '010-0000-0004', consent: true },
}

const EMPTY_VEHICLE: VehicleDetail = { ...VEHICLE, vehicleId: 11, modelYear: null, latestMileage: null }

describe('고객 수정 (08 22)', () => {
  it('처음 값은 07 그대로', () => {
    expect(customerEditForm(CUSTOMER)).toEqual({ name: '김민수', phone: '010-0000-0001', consent: true })
  })

  it('바꾼 칸만 + 읽은 version을 보낸다 (앞뒤 공백은 뺌)', () => {
    expect(toCustomerUpdate({ name: ' 김민수 ', phone: '010-0000-0001', consent: false }, CUSTOMER)).toEqual({ version: 2, consent: false })
    expect(toCustomerUpdate({ name: '김민준', phone: '010-1111-2222', consent: true }, CUSTOMER)).toEqual({
      version: 2,
      name: '김민준',
      phone: '010-1111-2222',
    })
  })

  it('바꾼 칸이 없으면 null (요청하지 않음)', () => {
    expect(toCustomerUpdate(customerEditForm(CUSTOMER), CUSTOMER)).toBeNull()
  })

  it('06과 같은 검사: 이름·연락처 비움, 연락처 형식·길이', () => {
    expect(validateCustomerEdit({ name: ' ', phone: '', consent: true })).toEqual({ name: '필수 입력입니다.', phone: '필수 입력입니다.' })
    expect(validateCustomerEdit({ name: '김', phone: '010 0000', consent: true }).phone).toBe('숫자와 하이픈만 입력할 수 있습니다.')
    expect(validateCustomerEdit({ name: '김', phone: '0101', consent: true }).phone).toBe('9~20자로 입력해 주세요.')
    expect(validateCustomerEdit(customerEditForm(CUSTOMER))).toEqual({})
  })
})

describe('차량 수정 (08 23)', () => {
  it('처음 값: 비어 있는 연식·주행거리는 빈 칸', () => {
    expect(vehicleEditForm(EMPTY_VEHICLE)).toEqual({ plateNumber: '78라0004', model: 'K5', modelYear: '', latestMileage: '' })
    expect(vehicleEditForm(VEHICLE)).toMatchObject({ modelYear: '2020', latestMileage: '45000' })
  })

  it('값이 있던 연식·최근 주행거리는 비울 수 없다 (F-CUS-06)', () => {
    const errors = validateVehicleEdit({ ...vehicleEditForm(VEHICLE), modelYear: '', latestMileage: ' ' }, VEHICLE, 2026)
    expect(errors).toEqual({ modelYear: CANNOT_CLEAR, latestMileage: CANNOT_CLEAR })
  })

  it('원래 비어 있던 칸은 비워 둬도 되고 보내지 않는다', () => {
    const form = { ...vehicleEditForm(EMPTY_VEHICLE), model: 'K3 GT' }
    expect(validateVehicleEdit(form, EMPTY_VEHICLE, 2026)).toEqual({})
    expect(toVehicleUpdate(form, EMPTY_VEHICLE)).toEqual({ version: 5, model: 'K3 GT' })
  })

  it('차량 추가와 같은 검사: 차량번호·차종 필수, 연식 범위, 주행거리 범위', () => {
    const errors = validateVehicleEdit({ plateNumber: ' ', model: '', modelYear: '1979', latestMileage: '2000001' }, VEHICLE, 2026)
    expect(errors).toEqual({
      plateNumber: '필수 입력입니다.',
      model: '필수 입력입니다.',
      modelYear: '1980년 이후여야 합니다.',
      latestMileage: '2,000,000 이하여야 합니다.',
    })
  })

  it('바꾼 칸만 숫자로 보낸다 (차량번호 공백 제거, 주행거리 쉼표 허용). 주행거리는 줄여도 된다', () => {
    const form = { plateNumber: '78라 0004', model: 'K5', modelYear: '2021', latestMileage: '44,000' }
    expect(toVehicleUpdate(form, VEHICLE)).toEqual({ version: 5, modelYear: 2021, latestMileage: 44000 })
    expect(toVehicleUpdate(vehicleEditForm(VEHICLE), VEHICLE)).toBeNull()
  })
})

describe('저장 한 번 (22·23 공통)', () => {
  it('바꾼 칸이 없으면 부르지 않고 unchanged', async () => {
    const save = vi.fn()
    expect(await submitEdit(null, save, CUSTOMER_EDIT_FIELDS)).toEqual({ kind: 'unchanged' })
    expect(save).not.toHaveBeenCalled()
  })

  it('성공이면 saved', async () => {
    const save = vi.fn().mockResolvedValue({})
    expect(await submitEdit({ version: 0, consent: false }, save, CUSTOMER_EDIT_FIELDS)).toEqual({ kind: 'saved' })
    expect(save).toHaveBeenCalledWith({ version: 0, consent: false })
  })

  it('409 CONCURRENT_MODIFICATION이면 conflict (화면이 다시 불러옴), 한 번만 부른다', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(409, 'CONCURRENT_MODIFICATION', '다른 직원이 먼저 수정했습니다.'))
    expect(await submitEdit({ version: 0 }, save, CUSTOMER_EDIT_FIELDS)).toEqual({ kind: 'conflict' })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('400 fieldErrors는 칸으로, 칸에 없는 것(version)이 있으면 위 안내 문구도', async () => {
    const onlyField = new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'latestMileage', reason: '0 이상이어야 합니다.' }])
    expect(await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(onlyField), VEHICLE_EDIT_FIELDS)).toEqual({
      kind: 'invalid',
      errors: { latestMileage: '0 이상이어야 합니다.' },
      message: null,
    })
    const withVersion = new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'version', reason: '필수 입력입니다.' }])
    expect(await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(withVersion), VEHICLE_EDIT_FIELDS)).toEqual({
      kind: 'invalid',
      errors: {},
      message: '입력값을 확인해 주세요.',
    })
  })

  it('404·네트워크 등 그 밖은 failed (입력 유지·사람이 다시 시도)', async () => {
    const network = new ApiError(0, NETWORK_ERROR, '서버에 연결하지 못했습니다.')
    const outcome = await submitEdit({ version: 0 }, vi.fn().mockRejectedValue(network), CUSTOMER_EDIT_FIELDS)
    expect(outcome).toEqual({ kind: 'failed', error: network })
  })
})
